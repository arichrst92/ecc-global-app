# Backend Request: GET /admin/jemaat/:id — Public Profile Endpoint

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-22
**Priority**: 🟡 **MEDIUM** — UX feature, currently blocked dengan client-side cache lookup
**Status**: ✅ **RESOLVED** (BE patch 2026-05-22a). Path baru: `/admin/jemaat-public/:id` (bukan `/admin/jemaat/:id` — yang itu admin CRUD existing).

## TL;DR

Mobile butuh endpoint untuk fetch profil ringkas (view-only) jemaat lain — supaya member homecell, area, scanner result, dll bisa di-tap dan buka halaman profil. Saat ini mobile fallback ke client cache lookup (homecell members + family) — yang tidak komprehensif.

## Use cases

1. **Homecell detail → tap member** → view profil singkat + WA action
2. **Area page → tap PIC homecell** → view profil PIC (sudah ada `picJemaat` di list, tapi tap belum ke mana)
3. **Scanner result → tap nama** → view profil jemaat yang baru di-scan
4. **Family detail → "lihat detail lengkap"** (future) → view profil family member

## Request

```
GET /admin/jemaat/:id
Authorization: Bearer <token>

Response 200:
{
  "id": "<jemaat-id>",
  "kode": "KJ-2026-XXXXX",
  "namaLengkap": "Nama Lengkap",
  "fotoUrl": "/uploads/foto/xxx.jpg",         // nullable, served at apiBaseUrl
  "noHp": "+628211234567",                    // nullable (utk dependent)
  "jenisKelamin": "L" | "P" | null,
  "tanggalLahir": "1990-12-31" | null,        // hanya bulan+tgl utk privacy?
  "cabang": { "id": "...", "nama": "GBT Bandung" },
  "isActive": true,

  // Peran / role jemaat di gereja
  "roles": [
    {
      "role": { "id": "...", "nama": "Volunteer" },
      "subRole": { "id": "...", "nama": "Worship Team" } | null,
      "subRoleStatus": { "id": "...", "nama": "Aktif" } | null
    }
  ],

  // Ministry / pelayanan
  "ministries": [
    {
      "id": "...",
      "nama": "Tim Multimedia",
      "posisi": "Operator Sound" | null
    }
  ],

  // Family relations (yang verified saja, untuk privacy)
  "family": [
    {
      "role": "SPOUSE" | "CHILD" | "PARENT" | "SIBLING",
      "jemaat": {
        "id": "...",
        "namaLengkap": "...",
        "fotoUrl": "..." | null
      }
    }
  ],

  // Homecell aktif (kalau ada)
  "homecell": {
    "id": "...",
    "nama": "Homecell Antapani"
  } | null
}

Response 404: jemaat not found
Response 403: forbidden (kalau privacy rule diterapkan, e.g. beda cabang)
```

## Authorization & privacy considerations

Tolong tim BE diskusikan:

1. **Siapa yang boleh akses?** Opsi:
   - (a) Semua authenticated user bisa lihat (paling permissive — risiko privacy)
   - (b) Hanya same-cabang (cek currentUser.cabangId === target.cabangId)
   - (c) Hanya kalau ada relasi (family / homecell / area co-member)
   - (d) Always allow `id + nama + foto`, dan fields lain (HP, alamat, tgl lahir) butuh permission

   **Rekomendasi mobile**: (d) — supaya UX gak inkonsisten (kadang ketemu, kadang 403). Tapi tergantung kebijakan privacy gereja.

2. **Nomor HP visibility**:
   - Kalau jemaat = family-linked atau homecell co-member → expose noHp
   - Kalau bukan → mask atau hide?

3. **Tanggal lahir** — typically sensitive. Expose hanya bulan+tgl (tanpa tahun)? Atau cuma display "Ulang tahun bulan ini" badge tanpa expose tahun?

## Why now

Saat ini mobile-side iter 4 sudah implement:
- Homecell member row clickable → navigate to `/jemaat/:id`
- View page jemaat ada, tapi cuma render data dari client cache
- Kalau jemaat tidak ada di cache (mis. dari scanner result), tampilan placeholder "Detail belum tersedia"

Tanpa endpoint ini, UX broken untuk:
- Scanner: tap nama jemaat hasil scan → blank page
- Area page: tap PIC homecell → blank page (selain nama + foto basic)
- Future: deep links ke `/jemaat/:id` dari notifikasi

## Effort estimate BE

- Basic endpoint (id + kode + nama + foto + cabang): **30 min** (re-use Jemaat query)
- + roles + ministries: **1-2 jam** (join queries)
- + family + homecell: **30 min** (already exist sebagai relations)
- + authorization rules: **1 jam** (depends on policy decision di atas)

Total: **3-4 jam BE work** kalau permissive policy. **+1-2 jam** kalau ada rule complex.

## Action items BE

- [ ] Diskusi tim: privacy policy (siapa boleh lihat apa)
- [ ] Implement GET /admin/jemaat/:id (basic shape dulu)
- [ ] Add roles + ministries fields
- [ ] Add family + homecell fields
- [ ] Document at mobile-api-guide section baru (16 Jemaat Public Profile?)
- [ ] Reply doc ini atau Slack

## Mobile-side plan (after BE ready)

- `src/api/jemaat.ts` — new file, `getJemaatProfile(id)` function
- `src/types/jemaat.ts` — new types matching response shape
- `app/jemaat/[id].tsx` — replace client cache lookup dengan useQuery → BE endpoint
- Fallback ke cache lookup tetap jalan untuk offline mode

Mobile-side estimasi: **2-3 jam** setelah BE ready.

---

## ✅ Backend Response — 2026-05-22 (patch 2026-05-22a)

### ⚠️ Path endpoint berbeda dari yang di-spec

Endpoint baru di **`/admin/jemaat-public/:id`**, bukan `/admin/jemaat/:id`. Alasan: `/admin/jemaat/:id` sudah existing sebagai admin CRUD endpoint yang return full Jemaat data tanpa privacy filter — di-pakai admin portal untuk edit jemaat. Mengubah endpoint itu ke tiered visibility berisiko break portal.

Mobile update API client:
```typescript
// src/api/jemaat.ts
export const getJemaatProfile = (id: string) =>
  apiClient.get(`/admin/jemaat-public/${id}`);
```

### Privacy policy — implemented hybrid tiered (Opsi (d) ala mobile rekomendasi)

| Tier | Fields visible |
|---|---|
| **Public** (semua authenticated user) | id, kode, namaLengkap, fotoUrl, jenisKelamin, isActive, cabang, roles, ministries, homecell (id+nama), noHpMasked, ulangTahunBulanTgl |
| **Close Relation** (additional) | noHp (full), tanggalLahir (full ISO), alamat, family[] |

**Close Relation** = salah satu:
1. **Same cabang** dengan requester (`requester.cabangId === target.cabangId`)
2. **Family link** (FamilyRelation verified antara requester ↔ target)
3. **Homecell co-member** (active HomecellMember row di homecell yang sama)

Resolve order: cek same-cabang dulu (cheap), lalu family (1 query), lalu homecell co-member (1 query). Performance: 1 main query + 1 requester lookup + max 2 conditional checks.

### Response shape

```json
{
  "success": true,
  "data": {
    "id", "kode", "namaLengkap", "fotoUrl", "jenisKelamin", "isActive",
    "cabang": { "id", "nama" },
    "roles": [...],
    "ministries": [
      { "id", "pelayananId", "nama", "posisi", "posisiLevel" }
    ],
    "homecell": { "id", "nama" } | null,
    "noHpMasked": "+628****8446",
    "ulangTahunBulanTgl": "05-15",
    "noHp": string | null,           // null kalau bukan close relation
    "tanggalLahir": ISO | null,
    "alamat": string | null,
    "family": [
      { "role": "SPOUSE", "jemaat": { "id", "namaLengkap", "fotoUrl" } }
    ] | null,
    "visibility": {
      "isCloseRelation": boolean,
      "reason": "same-cabang" | "family" | "homecell-co-member" | "public-only"
    }
  }
}
```

### Privacy helpers selalu emit (UI hints)

- **`noHpMasked`**: format `+628****8446` — selalu tersedia. Mobile bisa tampil sebagai badge ringan. Kalau `noHp` full juga tersedia (close relation), tap → buka WA.
- **`ulangTahunBulanTgl`**: format `MM-DD` (mis. `05-15`) — selalu tersedia, no tahun. Mobile pakai untuk "🎂 Ulang tahun bulan ini" badge tanpa expose umur.

### Error codes

- 404 jemaat tidak ditemukan
- 401 not authenticated (no JWT)

### Files

- New: `apps/core-api/src/routes/admin/jemaat-public.ts`
- Wired: `apps/core-api/src/routes/admin/index.ts` (sebelum `/jemaat` supaya tidak collision)
- Doc: `docs/mobile-api-guide.md` section 17 baru

### Mobile-side plan

```typescript
// src/types/jemaat.ts
export type JemaatPublicProfile = {
  id, kode, namaLengkap, fotoUrl, jenisKelamin, isActive,
  cabang, roles, ministries, homecell,
  noHpMasked, ulangTahunBulanTgl,
  // Nullable kalau bukan close relation
  noHp: string | null,
  tanggalLahir: string | null,
  alamat: string | null,
  family: Array<{ role; jemaat }> | null,
  visibility: { isCloseRelation: boolean; reason: string };
};

// Component logic
{profile.noHp && <WhatsAppButton href={`https://wa.me/${profile.noHp.replace(/\D/g,'')}`} />}
{!profile.noHp && <Text>{profile.noHpMasked}</Text>}
```

### Git

Lihat combined push command di `backend-request-ministry-endpoints.md` Backend Response (semua 5 patch hari ini di-bundle).
