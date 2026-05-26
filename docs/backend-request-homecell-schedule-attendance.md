# BE Request — Homecell Schedule + QR Attendance

**Owner:** Mobile (Ari)
**Status:** Pending BE design + implementation
**Date:** 2026-05-24
**Related:** existing homecell endpoints di `mobile-api-guide section 12.6` + BE patch 21p

## Konteks & Goal

Tambah fitur **jadwal pertemuan homecell** + **absensi member via QR scan**. Pattern mirror `Ibadah` (master schedule + occurrence) tapi much simpler — homecell jadwal manual entry per pertemuan, no recurring auto-expand.

**User stories:**
1. PIC homecell create jadwal pertemuan (tanggal + lokasi/alamat).
2. PIC scan QR jemaat saat pertemuan → recorded as absensi.
3. PIC + admin lihat report jadwal & kehadiran di portal (existing homecell detail page, no new menu).
4. Portal homecell list show jumlah pertemuan per homecell.

**Scope batasan:**
- Mobile-first feature — PIC pakai mobile app untuk create jadwal + scan QR
- Portal: **READ-ONLY view** untuk report (no CRUD jadwal dari portal — supaya tidak overlap dengan source-of-truth mobile flow)
- Jadwal tidak recurring — PIC create satu-satu per pertemuan
- Tidak ada notif otomatis ke member (mobile bisa add later)

## Data Model

### Tabel baru #1: `HomecellSchedule`

```prisma
model HomecellSchedule {
  id          String   @id @default(uuid())
  homecellId  String   @map("homecell_id")
  tanggal     DateTime @db.Date          // hari pertemuan (date-only, no time)
  lokasi      String                      // alamat / tempat pertemuan, free text
  catatan     String?                     // notes opsional dari PIC
  createdBy   String   @map("created_by") // jemaatId PIC yang create
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  homecell    Homecell             @relation(fields: [homecellId], references: [id], onDelete: Cascade)
  creator     Jemaat               @relation(fields: [createdBy], references: [id])
  attendances HomecellAttendance[]

  @@index([homecellId, tanggal(sort: Desc)])
  @@map("homecell_schedule")
}
```

### Tabel baru #2: `HomecellAttendance`

```prisma
model HomecellAttendance {
  id         String   @id @default(uuid())
  scheduleId String   @map("schedule_id")
  jemaatId   String   @map("jemaat_id")
  scannedAt  DateTime @default(now()) @map("scanned_at")
  scannedBy  String   @map("scanned_by")    // jemaatId PIC yang scan (audit)
  source     AttendanceSource @default(QR_SCAN)  // future: extend ke manual entry

  schedule HomecellSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  jemaat   Jemaat           @relation(fields: [jemaatId], references: [id])
  scanner  Jemaat           @relation("scanner", fields: [scannedBy], references: [id])

  @@unique([scheduleId, jemaatId])  // idempotent — re-scan same person = no-op (return existing)
  @@index([scheduleId])
  @@index([jemaatId])
  @@map("homecell_attendance")
}

enum AttendanceSource {
  QR_SCAN
  MANUAL  // future: PIC manual mark hadir (kalau QR rusak/lupa bawa HP)
}
```

**Reasoning unique constraint:** Idempotent scan. PIC scan sama member 2x dalam pertemuan yang sama → no error, no duplicate, return existing row dengan `alreadyAttended: true` flag (similar pattern dengan ibadah check-in).

## Endpoints

### 1. POST `/admin/homecell/:homecellId/schedule` — Create jadwal

**Auth:** PIC homecell ATAU PIC area parent ATAU admin (helper `assertCanManageHomecell(userId, homecellId)`).

**Request:**
```json
{
  "tanggal": "2026-05-28",
  "lokasi": "Rumah Pak Yohanes, Jl. Mawar 5",
  "catatan": "Bawa Alkitab dan camilan ringan"
}
```

**Validation:**
- `tanggal`: required, valid YYYY-MM-DD, **tidak boleh < 30 hari yang lalu** (prevent backdate spam)
- `lokasi`: required, 1-500 char
- `catatan`: optional, max 1000 char

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "homecellId": "uuid",
    "tanggal": "2026-05-28",
    "lokasi": "Rumah Pak Yohanes, Jl. Mawar 5",
    "catatan": "Bawa Alkitab dan camilan ringan",
    "createdBy": "uuid-jemaat",
    "createdAt": "2026-05-24T10:00:00.000Z",
    "attendanceCount": 0
  }
}
```

**Errors:**
- 403 `FORBIDDEN` — user bukan PIC/area-PIC/admin
- 400 `VALIDATION` — tanggal invalid / lokasi kosong
- 400 `BAD_REQUEST` code `BACKDATE_TOO_OLD` — tanggal < 30 hari lalu

### 2. GET `/admin/homecell/:homecellId/schedules` — List jadwal homecell

**Auth:** PIC homecell ATAU PIC area parent ATAU admin (read-only, broader access).

**Query params:**
- `limit`: default 50, max 100
- `from`: optional YYYY-MM-DD (filter tanggal >= from)
- `to`: optional YYYY-MM-DD (filter tanggal <= to)
- Default sort: tanggal DESC (most recent dulu)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tanggal": "2026-05-28",
      "lokasi": "Rumah Pak Yohanes, Jl. Mawar 5",
      "catatan": "Bawa Alkitab dan camilan ringan",
      "createdBy": "uuid-jemaat",
      "creator": { "id": "uuid", "namaLengkap": "Yohanes" },
      "createdAt": "2026-05-24T10:00:00.000Z",
      "attendanceCount": 8
    }
  ],
  "meta": { "total": 12 }
}
```

### 3. GET `/admin/homecell/:homecellId/schedule/:scheduleId` — Detail + attendance list

**Auth:** PIC homecell ATAU PIC area parent ATAU admin.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-schedule",
    "homecellId": "uuid",
    "tanggal": "2026-05-28",
    "lokasi": "Rumah Pak Yohanes, Jl. Mawar 5",
    "catatan": "Bawa Alkitab dan camilan ringan",
    "creator": { "id": "uuid", "namaLengkap": "Yohanes" },
    "createdAt": "2026-05-24T10:00:00.000Z",
    "attendanceCount": 8,
    "memberCount": 12,
    "attendances": [
      {
        "id": "uuid",
        "jemaatId": "uuid",
        "jemaat": {
          "id": "uuid",
          "namaLengkap": "Maria",
          "kode": "ECC-2025-00123",
          "fotoUrl": "/uploads/jemaat/..."
        },
        "scannedAt": "2026-05-28T19:30:00.000Z",
        "scannedBy": "uuid-pic",
        "scanner": { "namaLengkap": "Yohanes" },
        "source": "QR_SCAN"
      }
    ],
    "missingMembers": [
      {
        "jemaatId": "uuid",
        "namaLengkap": "Andreas",
        "kode": "ECC-2025-00456"
      }
    ]
  }
}
```

**Catatan:** `missingMembers` = homecell.members yang TIDAK ada di attendances — useful untuk PIC follow-up "siapa belum hadir". Generate at query time via NOT IN.

### 4. POST `/admin/homecell/:homecellId/schedule/:scheduleId/attendance` — Record absensi via QR scan

**Auth:** PIC homecell ATAU PIC area parent (admin: optional, depends — recommend YES untuk supervisi).

**Request:**
```json
{ "kode": "ECC-2025-00123" }
```

`kode` = jemaat kode dari QR code (sama format dengan QR jemaat existing).

**Validation:**
- Resolve `kode` → `jemaatId`. Kalau tidak ditemukan → 404 `KODE_NOT_FOUND`.
- Verify jemaat adalah **member aktif homecell ini** (`HomecellMember.isActive = true`). Kalau bukan → 400 `BAD_REQUEST` code `NOT_HOMECELL_MEMBER` (PIC tidak boleh tag external person ke jadwal homecell ini).

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "scheduleId": "uuid",
    "jemaatId": "uuid",
    "jemaat": {
      "id": "uuid",
      "namaLengkap": "Maria",
      "kode": "ECC-2025-00123",
      "fotoUrl": "/uploads/..."
    },
    "scannedAt": "2026-05-28T19:30:00.000Z",
    "alreadyAttended": false,
    "attendanceCount": 9
  }
}
```

**Idempotent:** re-scan member yang sudah hadir → return existing row dengan `alreadyAttended: true`, **NOT** error. Mobile UI display "Maria sudah tercatat hadir" toast.

### 5. DELETE `/admin/homecell/:homecellId/schedule/:scheduleId/attendance/:attendanceId` — Hapus absensi (correction)

**Auth:** PIC saja (audit-sensitive — area PIC / admin opsional, recommend YES).

**Use case:** PIC salah scan, mau correct.

**Response 200:**
```json
{ "success": true, "data": { "deleted": true } }
```

### 6. DELETE `/admin/homecell/:homecellId/schedule/:scheduleId` — Hapus jadwal

**Auth:** PIC homecell ATAU PIC area parent.

**Cascade:** delete schedule akan cascade delete semua attendance (via Prisma `onDelete: Cascade`).

**Validation:** Tidak boleh hapus jadwal yang sudah punya attendance — return 400 `BAD_REQUEST` code `HAS_ATTENDANCE`, force PIC unscan dulu kalau benar mau hapus (defensive — avoid accidental loss).

### 7. UPDATE existing endpoint: `GET /admin/homecell/:id` — add `scheduleCount`

**Add field** ke response existing `HomecellDetail`:

```diff
{
  "id": "uuid",
  "nama": "Homecell Mawar",
  ...
  "members": [...],
+ "scheduleCount": 12,
+ "lastSchedule": {
+   "id": "uuid",
+   "tanggal": "2026-05-21",
+   "attendanceCount": 8
+ }
}
```

`lastSchedule` = most recent schedule (untuk display "Last meeting: 21 May, 8 attended" di mobile homecell detail header).

### 8. UPDATE existing endpoint: `GET /admin/homecell-area/:id/homecells` — add `scheduleCount`

**Per request user:** Portal homecell list (AreaHomecellRow) tampilkan jumlah jadwal. Add ke response:

```diff
{
  "id": "uuid",
  "nama": "Homecell Mawar",
  ...
  "memberCount": 12,
+ "scheduleCount": 18
}
```

## Permissions Helper

Tambah Prisma-level helper di shared service:

```ts
async function assertCanManageHomecell(userId: string, homecellId: string): Promise<void> {
  // Admin global → allow
  if (await isAdmin(userId)) return;
  // PIC homecell direct
  const hc = await prisma.homecell.findUnique({ where: { id: homecellId } });
  if (hc?.picJemaatId === userId) return;
  // PIC area parent
  if (hc?.areaId) {
    const area = await prisma.homecellArea.findUnique({ where: { id: hc.areaId } });
    if (area?.picJemaatId === userId) return;
  }
  throw new ForbiddenError('FORBIDDEN');
}

async function assertCanReadHomecell(userId: string, homecellId: string): Promise<void> {
  // Same as manage, plus members themselves (read-only)
  // (delegated — read auth biasanya lebih luas)
}
```

## Portal Scope (per user request)

**TIDAK ada menu baru.** Existing portal pages yang affected:

### A. Portal Homecell Detail page (existing)

Lokasi: `apps/portal/src/app/dashboard/homecell/[id]/page.tsx` (or wherever current path).

**Add new section "Jadwal Pertemuan"** di bawah members list. Cards atau table show:
- Tanggal (sort desc)
- Lokasi
- Attendance count (mis. "8 / 12 hadir")
- Click row → expand atau drill ke `/dashboard/homecell/[id]/schedule/[scheduleId]` (read-only detail page baru, NOT new menu — sub-route).

**Schedule detail sub-page** show:
- Tanggal + lokasi + catatan + creator
- Tabel attendances: nama, kode, scannedAt
- Tabel "Tidak hadir" (missing members)

**No CRUD button di portal** — read-only. Tooltip kalau hover create: "Jadwal dibuat dari mobile app oleh PIC."

### B. Portal Homecell List (existing)

Lokasi: list page yang display semua homecell dalam area / cabang.

**Add column "Jadwal"** show `scheduleCount` per row. Simple integer display.

## Migration Notes

```sql
-- Migration: add homecell_schedule + homecell_attendance tables
CREATE TABLE homecell_schedule (...);
CREATE TABLE homecell_attendance (...);

-- No backfill needed — existing homecells start dengan 0 schedules.
-- New API fields (scheduleCount, lastSchedule) default to 0/null untuk
-- homecells lama.
```

**Backwards compat:** All new fields di existing endpoints are additive — mobile + portal lama tidak break kalau belum tahu field baru.

## Test Cases (untuk BE)

1. PIC create schedule → success, returns 201 with attendanceCount=0
2. Non-PIC create → 403 FORBIDDEN
3. Backdate > 30 hari → 400 BACKDATE_TOO_OLD
4. Scan QR member aktif → 200, attendance recorded, count increments
5. Re-scan same member → 200, alreadyAttended=true, count NOT incremented
6. Scan QR non-member → 400 NOT_HOMECELL_MEMBER
7. Scan QR member inactive → 400 NOT_HOMECELL_MEMBER (or specific code)
8. Scan invalid kode → 404 KODE_NOT_FOUND
9. Area PIC scan ke homecell di area-nya → 200 (allowed)
10. Different area PIC scan → 403 FORBIDDEN
11. Delete schedule yang punya attendance → 400 HAS_ATTENDANCE
12. Delete attendance individual → 200, count decrements
13. GET schedules dengan from/to filter → return subset
14. GET schedule detail → include missingMembers list
15. Existing GET /admin/homecell/:id → return scheduleCount + lastSchedule

## Action Items untuk BE

- [ ] Design review schema (table names, field naming consistency)
- [ ] Implement 6 endpoints baru + extend 2 existing
- [ ] Portal: homecell detail "Jadwal Pertemuan" section + drill page
- [ ] Portal: homecell list scheduleCount column
- [ ] Permission helper `assertCanManageHomecell`
- [ ] Migration + test on staging
- [ ] Reply doc ini dengan timeline / clarifications

## Mobile-side preparation

Sambil BE develop, mobile akan:
1. Stub types + API client (commented `// pending BE`)
2. UI mockup di Figma untuk schedule list + create form + scan screen
3. Reuse existing scanner component (visit/check-in scanner)
4. PIC gating logic dah existing (`useAuthStore.user.jemaatId === homecell.picJemaatId`)

Lihat `docs/mobile-spec-homecell-schedule-attendance.md` untuk implementation brief mobile.

---

# Backend Response — 2026-05-24

**Dari**: Tim Backend ECC (IDEA dev team)
**Status**: ✅ **DELIVERED** (code) — commit `7032e4c`

## Ringkasan

Semua 6 endpoint + 2 extend endpoint sesuai spec sudah implement:

| Spec | Implementation |
|---|---|
| `POST /admin/homecell/:id/schedule` (create) | ✅ Sub-router `homecellScheduleRouter` mounted di `/:homecellId/schedule` |
| `GET /admin/homecell/:id/schedule` (list) | ✅ Filter `from`/`to` + paginated |
| `GET /admin/homecell/:id/schedule/:scheduleId` (detail) | ✅ Include `attendances[]` + `missingMembers[]` |
| `POST /admin/homecell/:id/schedule/:scheduleId/attendance` (scan QR) | ✅ Idempotent (`alreadyAttended=true` kalau re-scan) |
| `DELETE /admin/homecell/:id/schedule/:scheduleId/attendance/:attendanceId` | ✅ Hard delete (per spec) |
| `DELETE /admin/homecell/:id/schedule/:scheduleId` | ✅ Cek `HAS_ATTENDANCE` constraint |
| Extend `GET /admin/homecell/:id` | ✅ Tambah `scheduleCount` + `lastSchedule` |
| Extend `GET /admin/homecell-area/:id/homecells` | ✅ Tambah `scheduleCount` |

## Schema (Prisma)

Migration `20260525120000_homecell_schedule_attendance` — 2 tabel:
- `homecell_schedule` (id, homecellId, tanggal, lokasi, catatan, createdBy, timestamps)
- `homecell_attendance` (id, scheduleId, jemaatId, source enum, scannedBy, scannedAt, timestamps)

Enum `AttendanceSource`: `MANUAL` | `QR_SCAN` (sumber attendance).

## Auth pattern

Helper baru `assertCanManageHomecell(homecellId, userJemaatId, isFulltimer)` di `apps/core-api/src/lib/homecell-pic.js`:
- ✅ PIC homecell langsung
- ✅ PIC area parent
- ✅ Admin fulltimer
- ❌ Lainnya → 403 FORBIDDEN

## File changed

| File | Perubahan |
|---|---|
| `packages/database/prisma/schema.prisma` | + HomecellSchedule, HomecellAttendance, AttendanceSource enum |
| `packages/database/prisma/migrations/20260525120000_homecell_schedule_attendance/migration.sql` | NEW |
| `apps/core-api/src/routes/admin/homecell-schedule.ts` | NEW — 6 endpoint |
| `apps/core-api/src/routes/admin/homecell.ts` | Mount sub-router + extend detail |
| `apps/core-api/src/routes/admin/homecell-area.ts` | Extend `/:id/homecells` shape |
| `apps/core-api/src/lib/homecell-pic.ts` | + assertCanManageHomecell, getJemaatIdForUser |
| `packages/shared-types/src/schemas/homecell-schedule.ts` | NEW Zod schemas |
| `apps/portal/src/app/dashboard/homecell/[id]/page.tsx` | Section Jadwal Pertemuan |
| `apps/portal/src/app/dashboard/homecell/[id]/schedule/[scheduleId]/page.tsx` | NEW drill detail |

---

# Backend Update — 2026-05-26

**Status fix**: 🔥 **PRODUCTION INCIDENT RESOLVED**

## Issue

Mobile lapor "homecell not found" saat buka detail homecell di production (2026-05-26 ~08:24 UTC).

## Root cause

Migration `20260525120000_homecell_schedule_attendance` **belum di-apply** ke production DB walaupun code-nya sudah di-deploy di commit `7032e4c`. Endpoint `GET /admin/homecell/:id` (yang extended dengan `_count.schedules` + `lastSchedule` include) crash dengan Prisma error:

```
P2021: The table `public.homecell_schedule` does not exist in the current database.
{"code":"P2021","modelName":"Homecell","table":"public.homecell_schedule"}
```

Endpoint return HTTP 500. Mobile UI translate generic error jadi pesan "homecell not found" — misleading tapi technically benar (data tidak ke-fetch).

## Fix

Run di VPS prod:

```bash
cd /var/www/ecc-core-platform/packages/database
npx prisma migrate deploy   # apply pending migration
sudo -u postgres psql ecc_platform -c "\dt public.homecell_schedule"
sudo -u postgres psql ecc_platform -c "\dt public.homecell_attendance"
pm2 reload ecc-core-api --update-env
```

Setelah migration applied:
- ✅ `GET /admin/homecell/:id` return 200 lagi (mobile detail screen recover)
- ✅ Tables `homecell_schedule` + `homecell_attendance` ready menerima POST create
- ✅ Schedule endpoints 1–6 sekarang fully usable

## Impact ke mobile

**Tidak ada perubahan kontrak / shape response**. Bug ini purely infrastructure (missing migration), bukan API contract. Mobile feature homecell-schedule yang udah implement bisa langsung jalan tanpa rebuild — tinggal force close + reopen app supaya state fresh.

## Lessons learned (untuk BE workflow)

- Deploy workflow Skenario 4 (`docs/future-changes-deploy-workflow.md`) wajib include explicit `prisma migrate deploy` step + verifikasi `\dt` query setelahnya
- Migration step harus log "Applying migration X" — kalau output kosong, ada drift, ABORT deploy
- Memory `deploy-gotchas` di-update: **selalu cek `\dt` table baru setelah migrate deploy** sebelum restart pm2

## Action items mobile

- [ ] User yang stuck di error "homecell not found" — minta force close app + reopen
- [ ] Tidak perlu rebuild atau update; client code unchanged
- [ ] Re-test buka detail homecell — harus muncul section "Jadwal Pertemuan" dengan attendance count

---

*Incident resolved 2026-05-26.*
