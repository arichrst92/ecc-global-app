# Backend Request: Ministry / Pelayanan Endpoints

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-22
**Priority**: 🟡 **MEDIUM** — UX feature, currently rendered as placeholder
**Status**: ✅ **RESOLVED Phase 1 (items 1+2)** (BE patch 2026-05-22a). Items 3+4 (detail with full members + join with approval) — item 3 sudah ready, item 4 deferred.

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

---

## ✅ Backend Response — 2026-05-22 (patch 2026-05-22a)

### Data model klarifikasi: tidak perlu table baru

Schema **sudah ada** — Pelayanan/PelayananRole/JemaatPelayanan junction model existing sejak section 7 schema (line 518+ di `schema.prisma`):

| Mobile naming | BE schema |
|---|---|
| Ministry | `Pelayanan` (master, global — bukan cabang-specific!) |
| MinistryRole | `PelayananRole` (per-pelayanan, level integer untuk hierarchy) |
| MinistryMembership | `JemaatPelayanan` (junction dengan role + tanggalMulai/Selesai + isActive) |

Note penting: **Pelayanan adalah global**, bukan cabang-specific. Multimedia ada di semua cabang, members dari semua cabang. `?cabangId` filter mobile minta tidak applicable di MVP — kalau perlu filter "ministry yang membernya banyak di cabang X", logika-nya di-derive dari `JemaatPelayanan.jemaat.cabangId` (group by). Skip untuk patch ini.

### Implementasi Item 1: Extend /admin/me

`GET /admin/me` sekarang return field `ministries` (flatten dari `jemaatPelayanan` aktif):

```json
{
  "ministries": [
    {
      "id": "<jemaat-pelayanan-id>",
      "pelayananId": "<pelayanan-id>",
      "nama": "Tim Multimedia",
      "deskripsi": "Sound, Camera, Streaming...",
      "posisi": "Sound",
      "posisiLevel": 0,
      "tanggalMulai": "2026-01-15"
    }
  ]
}
```

Selalu di-return (empty array kalau user tidak terlibat ministry).

### Implementasi Item 2: GET /admin/ministry list

Route baru `apps/core-api/src/routes/admin/ministry.ts`:

```typescript
GET /admin/ministry
Authorization: Bearer <JWT>

→ 200 { data: Array<{
  id, nama, deskripsi,
  memberCount: number,
  isOpen: boolean,           // saat ini = isActive flag
  leader: { jemaat, role } | null,  // member dengan level tertinggi
  roles: Array<{ id, nama, level }>  // preview semua role yang ada
}> }
```

**Leader derivation**: Pelayanan tidak punya `leaderId` di schema. "Leader" = `JemaatPelayanan` active dengan `PelayananRole.level` tertinggi. Kalau ada multiple ties → ambil yang earliest `tanggalMulai` (paling lama menjabat).

**isOpen**: untuk MVP set ke `isActive` (proxy). Kalau ke depan ada concept "ministry sedang recruit / closed for new members", tambah flag di schema.

### Item 3 BONUS: GET /admin/ministry/:id detail (juga ready!)

Sambil bikin, sekalian kasih detail endpoint:

```typescript
GET /admin/ministry/:id
→ 200 {
  id, nama, deskripsi, isOpen, memberCount,
  roles, leader,
  members: [{ id, jemaat: {...with cabang...}, posisi, sinceDate }],
  myMembership: { id, posisi, sinceDate } | null  // populated kalau user adalah member
}
```

Mobile bisa langsung pakai untuk Phase 2 detail page.

### Item 4: POST /admin/ministry/:id/join — DEFERRED

Skip untuk patch ini karena scope creep + butuh design decision:
- Approval flow (PENDING vs ACTIVE) — leader approval atau auto?
- Notification ke leader — sebelum push infra ready, sulit
- Form motivasi — UX/UI lebih dulu

Sebagai workaround sementara: mobile UI tampil tombol "Hubungi Leader via WA" yang langsung buka chat WA ke leader.noHp (dari endpoint detail). Member assignment manual via admin portal `/admin/pelayanan/assign` (sudah ada).

### Path endpoint final

| Mobile use case | Endpoint |
|---|---|
| Profile screen "Pelayanan Saya" | `GET /admin/me` (field `ministries`) |
| /ministry list page | `GET /admin/ministry` |
| /ministry/:id detail page | `GET /admin/ministry/:id` |
| Join request | manual (admin portal) atau WA leader |

### Wired di admin router

`apps/core-api/src/routes/admin/index.ts` baris ~30:
```typescript
adminRouter.use('/ministry', ministryRouter);
```

### Combined Git (semua 5 patch hari ini)

```bash
cd /Users/idea/Projects/ecc-core-platform
git add packages/database/prisma/migrations/20260522010000_event_jam_fields/ \
        packages/database/prisma/schema.prisma \
        packages/shared-types/src/schemas/event.ts \
        packages/shared-types/src/schemas/auth.ts \
        apps/core-api/src/routes/admin/me.ts \
        apps/core-api/src/routes/admin/event.ts \
        apps/core-api/src/routes/admin/ministry.ts \
        apps/core-api/src/routes/admin/jemaat-public.ts \
        apps/core-api/src/routes/admin/index.ts \
        apps/portal/src/components/event/event-form-modal.tsx \
        docs/mobile-api-guide.md \
        knowledge-base.md
git commit -m "feat: mobile batch 2026-05-22 — 5 requests

1. Event jamMulai/jamSelesai (separate fields, Option B per mobile)
2. Direct branch change via PATCH /admin/me { cabangId }
3. Ministry endpoints (GET /admin/ministry list + detail + me.ministries)
4. Jemaat public profile (GET /admin/jemaat-public/:id, tiered visibility)
5. Profile edit completeness:
   - kode self-heal di GET /admin/me handler
   - PATCH /admin/me/family/:id/profile (dependent edit)
   - POST /admin/me/family/:id/foto (dependent foto upload)

Schema additions:
- event.jam_mulai, event.jam_selesai (VARCHAR(5) nullable)
- shared-types: editDependentJemaatSchema, selfEditJemaatSchema.cabangId

New routes:
- /admin/ministry (read-only, mobile-friendly shape from Pelayanan)
- /admin/jemaat-public/:id (tiered visibility: public + close-relation)
- /admin/me/family/:id/profile (PATCH dependent)
- /admin/me/family/:id/foto (POST dependent foto)

KB patch 2026-05-22a + mobile-api-guide sections 12.2 (extended), 13.8
(dependent), 16 (Ministry), 17 (Jemaat Public Profile).

Mobile docs RESOLVED:
- backend-request-event-time-fields.md
- backend-request-direct-branch-change.md
- backend-request-ministry-endpoints.md (items 1-3, item 4 deferred)
- backend-request-jemaat-public-profile.md
- backend-request-profile-edit-completeness.md

User perlu jalankan: pnpm db:migrate dev && pnpm db:generate && pnpm dev"
git push
```

### User actions BE side

1. `pnpm db:migrate dev` (apply migration 20260522010000)
2. `pnpm db:generate` (regen Prisma client untuk new fields)
3. `pnpm dev` restart core-api + portal
