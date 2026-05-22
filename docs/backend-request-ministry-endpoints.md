# Backend Request: Ministry / Pelayanan Endpoints

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-22
**Priority**: 🟡 **MEDIUM** — UX feature, currently rendered as placeholder
**Status**: 🆕 **PROPOSED**

## TL;DR

Mobile butuh 2 hal terkait ministry / pelayanan:

1. **Extend `/admin/me`** dengan field `ministries` — daftar ministry yang user-nya terlibat (untuk tampil di Profile screen)
2. **New `GET /admin/ministry`** — list semua ministry yang ada di gereja (untuk halaman /ministry yang accessible dari dashboard Quick Access)

Optional iterasi berikutnya:
3. `GET /admin/ministry/:id` — detail ministry (anggota, leader, jadwal)
4. `POST /admin/ministry/:id/join` — user apply / join ministry

## Background

User feedback iter 5:
> "pada halaman profile munculkan data ministry. pada akses cepat di dashboard tambahkan menu ministry yang akan menampilkan keseluruhan ministry yang ada."

Mobile sudah implement UI:
- Profile screen: `<MinistryCard />` — kalau `me.ministries` populated, render list "Nama Ministry · Posisi". Kalau empty/undefined, tampil CTA "Belum terlibat ministry → buka /ministry"
- Quick Access dashboard: tile "Ministry" baru → navigate ke `/ministry`
- `/ministry` page: section "Pelayanan Saya" (dari /admin/me.ministries) + section "Semua Ministry" (placeholder until BE ready)

## Request 1: Extend /admin/me dengan `ministries` field

```typescript
GET /admin/me

Response 200: {
  // ... existing fields (id, namaLengkap, kode, noHp, etc)
  jemaatRoles: [...],         // already exists
  homecellMembership: [...],  // already exists
  ministries: [               // NEW
    {
      id: string;              // ministryId or ministryMembershipId
      nama: string;            // mis. "Tim Multimedia", "Worship Team"
      posisi: string | null;   // mis. "Sound Engineer", "Leader", "Anggota"
      cabang: {                // ministry biasanya cabang-specific
        id: string;
        nama: string;
      } | null;
    }
  ]
}
```

Hanya return ministry yang **status aktif** (user-nya masih jadi member, bukan yang sudah keluar).

## Request 2: GET /admin/ministry — list semua ministry

```typescript
GET /admin/ministry?cabangId=<optional>
Authorization: Bearer <token>

Response 200: {
  data: [
    {
      id: string;
      nama: string;                    // mis. "Tim Multimedia"
      deskripsi: string | null;         // 1-2 paragraf
      ikon: string | null;              // emoji atau lucide icon name
      cabang: { id: string; nama: string };
      memberCount: number;              // jumlah anggota aktif
      isOpen: boolean;                  // accepting new members?
      leader: {
        id: string;
        namaLengkap: string;
        fotoUrl: string | null;
      } | null;
    }
  ]
}
```

Filter `cabangId` optional — kalau tidak ada, return semua ministry di semua cabang (atau cuma cabang home user, tergantung kebijakan).

## Request 3 (later): GET /admin/ministry/:id — detail

```typescript
GET /admin/ministry/:id

Response 200: {
  id, nama, deskripsi, ikon, cabang, leader, isOpen,
  jadwal: string | null,              // mis. "Setiap Minggu jam 09:00"
  members: Array<{
    id: string;
    jemaat: { id, namaLengkap, fotoUrl };
    posisi: string | null;
    sinceDate: string;                 // ISO
  }>;
  // Apakah current user member? (helper field)
  myMembership: {
    posisi: string | null;
    sinceDate: string;
  } | null;
}
```

## Request 4 (later): POST /admin/ministry/:id/join

```typescript
POST /admin/ministry/:id/join
Body: { motivasi?: string }            // optional

Response 200: { membershipId: string, status: 'PENDING' | 'ACTIVE' }
Response 400: { error: 'ALREADY_MEMBER' | 'CLOSED' }
```

Status PENDING kalau ministry butuh approval leader sebelum aktif.

## Data model assumption

Saya asumsi BE sudah punya (atau akan add) table:
- `Ministry` (id, nama, deskripsi, cabangId, leaderId, isOpen, jadwal)
- `MinistryMembership` (id, ministryId, jemaatId, posisi, status, sinceDate, exitDate)

Atau mungkin sudah ada via Role/SubRole pattern? Kalau iya, mungkin ministry adalah subset SubRole tertentu? Tolong klarifikasi data model existing.

## Effort estimate BE

| Item | Effort |
|------|--------|
| 1. Extend /admin/me with ministries | **30 menit** (kalau data sudah ada di table) - **2 jam** (kalau perlu buat table baru) |
| 2. GET /admin/ministry list | **1-2 jam** |
| 3. GET /admin/ministry/:id detail | **1-2 jam** |
| 4. POST /admin/ministry/:id/join | **2 jam** (incl. notification ke leader untuk approval) |

Total scope minimal (item 1 + 2): **~2-4 jam**.

## Action items BE

- [ ] Klarifikasi: apakah Ministry sudah ada di schema, atau perlu table baru?
- [ ] Item 1: Extend /admin/me dengan field `ministries`
- [ ] Item 2: Implement GET /admin/ministry list
- [ ] Item 3 (later): GET /admin/ministry/:id detail
- [ ] Item 4 (later): POST /admin/ministry/:id/join with approval flow
- [ ] Update mobile-api-guide section 17 (Ministry) dengan endpoints baru

## Mobile-side plan (after BE ready)

### Phase 1 (after items 1 + 2):
- `src/api/ministry.ts` — `listMinistries()`, `joinMinistry()`
- `src/types/ministry.ts` — Ministry shape
- `app/ministry/index.tsx` — replace placeholder "Semua Ministry" dengan real list
- Profile `<MinistryCard />` sudah ready — auto-populate dari `me.ministries`

### Phase 2 (after items 3 + 4):
- `app/ministry/[id].tsx` — detail page dengan leader, jadwal, anggota
- "Join Ministry" button + apply flow
- Notification handling untuk approval

Mobile-side estimasi Phase 1: **2-3 jam**. Phase 2: **3-4 jam**.

## Related

- BE request lain (parallel): [GET /admin/jemaat/:id public profile](./backend-request-jemaat-public-profile.md) — punya field `ministries` juga
- Mobile commit iter 5: Quick Access Ministry tile + Profile MinistryCard + /ministry placeholder page
