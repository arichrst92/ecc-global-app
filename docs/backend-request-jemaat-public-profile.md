# Backend Request: GET /admin/jemaat/:id — Public Profile Endpoint

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-22
**Priority**: 🟡 **MEDIUM** — UX feature, currently blocked dengan client-side cache lookup
**Status**: 🆕 **PROPOSED**

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
