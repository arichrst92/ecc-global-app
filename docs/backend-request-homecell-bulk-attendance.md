# Backend Request — Homecell Bulk Attendance Endpoint

**Date**: 2026-10-09
**Requester**: Mobile team (Ari)
**Priority**: LOW-MEDIUM (mobile workaround sudah live via Promise.allSettled loop, tapi tidak efficient)
**Related**: Existing endpoint `POST /admin/homecell/:id/schedule/:scheduleId/attendance` (single kode)

---

## Context

Mobile v2.2.7+ sudah ship fitur **bulk attendance via checklist** untuk PIC homecell — complement existing scan QR flow. Rationale: PIC yang sudah tahu siapa aja yang hadir di meeting ingin cepat tandai semuanya tanpa harus scan QR 1-per-1.

Current mobile implementation: workaround via `Promise.allSettled` loop ke single endpoint. Setiap tap "Hadirkan N Orang" trigger N network requests sekaligus. Tidak scalable (homecell dengan 20-30 member bikin 20-30 request parallel) + atomic failure handling susah.

## Request untuk Backend

Tambah **endpoint bulk**:

```
POST /admin/homecell/:homecellId/schedule/:scheduleId/attendance/bulk
```

**Auth:** Bearer required. PIC-only (sama dengan single endpoint).

**Request body:**
```json
{
  "kodes": ["JMT001", "JMT002", "JMT003", "..."]
}
```

Atau alternative pakai `jemaatIds` (lebih reliable dari kode):
```json
{
  "jemaatIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

Mobile prefer **kodes** supaya consistent dengan single endpoint — tapi `jemaatIds` juga OK kalau BE lebih mudah.

**Response:**
```json
{
  "success": true,
  "data": {
    "scheduleId": "uuid",
    "attendanceCount": 15,
    "results": [
      {
        "kode": "JMT001",
        "status": "recorded",
        "attendance": { "id": "uuid", "jemaat": { ... }, "scannedAt": "..." }
      },
      {
        "kode": "JMT002",
        "status": "already_attended",
        "attendance": { "id": "uuid", "scannedAt": "..." }
      },
      {
        "kode": "JMT003",
        "status": "error",
        "error": { "code": "NOT_HOMECELL_MEMBER", "message": "..." }
      }
    ]
  }
}
```

**Behavior:**
- Partial success allowed — kalau 1 kode fail (mis. NOT_HOMECELL_MEMBER), lain tetap recorded
- Idempotent — kalau kode sudah hadir di schedule ini, response `status: already_attended` (tidak re-record)
- Validate PIC authorization sekali di awal (not per kode)
- Transaction optional — kalau bisa all-or-nothing dengan proper rollback, bagus. Kalau susah, per-row insert dengan collected errors acceptable.

**Rate limit:** sama atau lebih tinggi dari single endpoint. Mobile akan limit max 50 kodes per request (homecell terbesar ~30 member).

## Mobile Side (setelah BE ready)

Swap implementation di `src/hooks/useHomecellSchedules.ts` `useBulkAttendance`:

```typescript
// Sebelum (workaround):
const results = await Promise.allSettled(
  kodes.map((kode) => recordAttendance(homecellId, scheduleId, kode)),
);

// Sesudah:
const response = await bulkRecordAttendance(homecellId, scheduleId, kodes);
// Parse response.results[] → map ke { success, failed, errors } shape yang sama
```

Hook signature + consumer tetap sama — swap internal only, no UI change needed.

## Testing (setelah BE ready)

```bash
# Setup: schedule dengan 5 missing members
curl -X POST -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" \
  "https://api.eccchurch.global/admin/homecell/$HC/schedule/$SCH/attendance/bulk" \
  -d '{"kodes": ["JMT001", "JMT002", "JMT003"]}'
# → results[] dengan status per kode

# Mixed success + duplicate
curl -X POST ... -d '{"kodes": ["JMT001", "JMT001", "INVALID123"]}'
# → results[]:
#   JMT001: recorded
#   JMT001: already_attended
#   INVALID123: error KODE_NOT_FOUND
```

## Non-Goals

- Tidak perlu bulk delete attendance (jarang use case)
- Tidak perlu edit scannedAt (always = NOW())
- Scanner-side flow unchanged — bulk ini terpisah API

## Timeline

Mobile v2.2.7 ship dengan workaround Promise.allSettled. BE deliver endpoint ini → mobile swap implementation (patch release, no schema change).

---

Reply via `docs/be-update-*.md` atau chat kalau ada pertanyaan.

---

## Backend Response — RESOLVED 2026-10-09

**Endpoint deployed:**
```
POST /admin/homecell/:homecellId/schedule/:scheduleId/attendance/bulk
```

**Body** (match request Opsi #1 — pakai `kodes`):
```json
{ "kodes": ["JMT001", "JMT002", "JMT003"] }
```
- Max 50 per batch (sesuai request).
- Validation via Zod → 400 kalau `kodes` kosong atau > 50.

**Response:**
```json
{
  "success": true,
  "data": {
    "scheduleId": "uuid",
    "attendanceCount": 15,
    "newlyRecordedCount": 10,
    "results": [
      {
        "kode": "JMT001",
        "status": "recorded",
        "attendance": {
          "id": "uuid",
          "jemaat": { "id": "...", "namaLengkap": "...", "kode": "...", "fotoUrl": "..." },
          "scannedAt": "2026-10-09T..."
        }
      },
      {
        "kode": "JMT002",
        "status": "already_attended",
        "attendance": { "id": "...", "jemaat": {...}, "scannedAt": "..." }
      },
      {
        "kode": "INVALID123",
        "status": "error",
        "error": { "code": "KODE_NOT_FOUND", "message": "Kode \"INVALID123\" tidak ditemukan." }
      }
    ]
  }
}
```

**Error codes per row:**
- `KODE_NOT_FOUND` — kode jemaat tidak ada di DB
- `JEMAAT_INACTIVE` — jemaat sudah `isActive=false`
- `NOT_HOMECELL_MEMBER` — bukan member aktif homecell ini
- `INTERNAL` — unexpected error (catch-all)

**Behavior guarantees:**
- PIC authorization dicek SEKALI di awal (not per kode) via
  `assertCanManageHomecell()`. 403 kalau bukan PIC.
- Partial success — 1 kode fail tidak rollback kode lain.
- Idempotent — re-submit kode yang sudah hadir return `already_attended`
  (bukan error, bukan duplicate).
- Attendance baru pakai `source: 'MANUAL'` (bukan `QR_SCAN`).
- In-app notif + WA fire-and-forget untuk tiap newly recorded (sama pattern
  dgn single endpoint). Already_attended tidak trigger notif ulang.
- Audit log SINGLE entry per bulk call dengan metadata
  `{kind: 'bulk-attendance', totalRequested, newlyRecorded}` — bukan per-row.
- Response includes `attendanceCount` (total setelah bulk) + `newlyRecordedCount`
  (baru di-record di call ini) buat UI toast "N orang baru dicatat".

**Files changed:**
- `packages/shared-types/src/schemas/homecell-schedule.ts` → tambah
  `bulkScanHomecellAttendanceSchema`
- `apps/core-api/src/routes/admin/homecell-schedule.ts` → tambah route
  POST `/:scheduleId/attendance/bulk`

**Deploy status:** Code committed + pushed. Perlu `pnpm --filter @ecc/core-api build`
+ `pm2 restart ecc-core-api` di VPS production untuk aktif.

Mobile tinggal swap implementation di `useBulkAttendance` sesuai contract
di request doc. No schema change needed.

