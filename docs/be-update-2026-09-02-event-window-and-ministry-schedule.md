# BE Update — Event Window Filter + Ministry Schedule Roster

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari)
**Tanggal:** 2026-09-02
**Reply ke:**
- `backend-request-event-list-month-scoped.md`
- `backend-request-ministry-schedule-roster.md`

---

## Status

✅ **BOTH DELIVERED** — code merged, tsc clean (setelah Prisma regenerate), migration ready.

---

## #1 — Event List Month-Scoped

**Endpoint:** `GET /admin/event`

**New query params:**
- `from=YYYY-MM-DD` (opsional)
- `to=YYYY-MM-DD` (opsional)

**Behavior:**
- Kalau salah satu / kedua dikirim → server-side date filter by `tanggalMulai` (dgn overlap logic untuk multi-day event)
- Kalau tidak dikirim → existing behavior (backward compat, mobile v2.1.7 tetap jalan)
- Multi-day event yg start-before-window tapi end-inside-window → include (case: `tanggalSelesai >= from AND tanggalMulai < from`)
- Include expired events (mobile calendar navigate ke bulan lalu perlu ini)

**Validation:**
- Invalid date format → `400 BadRequest`
- `to` diperlakukan end-of-day (inclusive)

**Test:**
```bash
# Sept 2026
curl -H "Auth: Bearer $TOK" \
  "https://api.eccchurch.global/admin/event?from=2026-09-01&to=2026-09-30&isPublished=true"

# 3 bulan window
curl -H "Auth: Bearer $TOK" \
  "https://api.eccchurch.global/admin/event?from=2026-09-01&to=2026-11-30"

# Past events (calendar)
curl -H "Auth: Bearer $TOK" \
  "https://api.eccchurch.global/admin/event?from=2026-01-01&to=2026-08-31"
```

**Mobile side (post-BE deploy):** ganti `listEvents({ limit: 200 })` → `listEvents({ from, to, isPublished: true })`.

---

## #2 — Ministry Schedule / Roster

### Schema — 2 tabel baru

**File:** `packages/database/prisma/schema.prisma`

```prisma
model PelayananSchedule {
  id          String   @id @default(uuid())
  pelayananId String
  ibadahId    String?              // optional link ke Ibadah
  tanggal     DateTime @db.Date
  catatan     String?
  ...
  pelayanan   Pelayanan @relation(...)
  ibadah      Ibadah?   @relation(...)  // onDelete: SetNull
  assignments PelayananScheduleAssignment[]
}

model PelayananScheduleAssignment {
  id              String @id @default(uuid())
  scheduleId      String
  jemaatId        String
  pelayananRoleId String
  notes           String?
  ...
  @@unique([scheduleId, jemaatId])   // cegah double-book 1 jemaat per schedule
}
```

**Migration:** `packages/database/prisma/migrations/20260902100000_pelayanan_schedule_roster/migration.sql` — CREATE TABLE + FK + indexes.

### Endpoints Ministry-Facing

**`GET /admin/ministry/:id/schedule?from=&to=`**

Auth: Bearer. Default window: today → +4 weeks.

Response:
```json
{
  "success": true,
  "data": {
    "schedules": [
      {
        "id": "uuid",
        "tanggal": "2026-09-06",
        "ibadahId": "uuid",
        "ibadahNama": "Ibadah Umum Pagi",
        "ibadahJamMulai": "08:00",
        "ibadahJamSelesai": "10:00",
        "ibadahLokasi": "Sanctuary",
        "catatan": null,
        "assignments": [
          {
            "id": "uuid",
            "jemaatId": "uuid",
            "jemaatNama": "Ari Christian",
            "jemaatFotoUrl": null,
            "posisi": "Worship Leader",
            "posisiLevel": 5,
            "notes": null
          }
        ]
      }
    ]
  }
}
```

**`POST /admin/ministry/:id/schedule`** — leader create schedule.

Body:
```json
{
  "tanggal": "2026-09-06",
  "ibadahId": "uuid" | null,
  "catatan": "optional",
  "assignments": [
    { "jemaatId": "uuid", "pelayananRoleId": "uuid", "notes": null }
  ]
}
```

Auto-notif ke tiap jemaat yg di-assign (`GROUP_MEMBER_ADDED` type — reuse untuk MVP).

Dedup jemaatId sebelum insert (unique constraint safety).

**`PATCH /admin/ministry/:id/schedule/:scheduleId`** — update. `assignments` field kalau dikirim = REPLACE (delete all + create fresh). Kalau tidak dikirim = keep.

**`DELETE /admin/ministry/:id/schedule/:scheduleId`** — hapus schedule + cascade assignments.

### Endpoint Cross-Ministry (Mobile Home Widget)

**`GET /admin/me/ministry-schedule?from=&to=`**

Auth: Bearer. Default window: today → +4 weeks.

Response:
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": "uuid",
        "tanggal": "2026-09-06",
        "ibadahId": "uuid",
        "ibadahNama": "Ibadah Umum Pagi",
        "ibadahJamMulai": "08:00",
        "ibadahJamSelesai": "10:00",
        "ibadahLokasi": "Sanctuary",
        "ministryId": "uuid",
        "ministryNama": "Worship Team",
        "posisi": "Worship Leader",
        "posisiLevel": 5,
        "notes": null,
        "coServants": [
          {
            "jemaatId": "uuid",
            "namaLengkap": "Dewi Christian",
            "fotoUrl": "/uploads/dewi.jpg",
            "posisi": "Vocalist"
          }
        ]
      }
    ]
  }
}
```

Assignments sorted by `tanggal` ASC. `coServants` exclude requester.

### Not-Yet-Implemented (Phase 2 backlog per request)

- Swap/substitute request flow
- Availability calendar per jemaat
- Push notif H-1 auto-reminder (bisa integrasi dgn existing notif scheduler)
- Portal admin UI untuk create/edit schedule (endpoint sudah ready, cuma perlu UI)

---

## Files Changed (BE)

| File | Change |
|---|---|
| `packages/database/prisma/schema.prisma` | +PelayananSchedule +PelayananScheduleAssignment models, back-relations di Pelayanan/PelayananRole/Ibadah/Jemaat |
| `packages/database/prisma/migrations/20260902100000_pelayanan_schedule_roster/migration.sql` | NEW — CREATE TABLE + FK + indexes |
| `apps/core-api/src/routes/admin/event.ts` | GET / — add from/to query filter |
| `apps/core-api/src/routes/admin/ministry.ts` | +GET/POST/PATCH/DELETE /:id/schedule[...] |
| `apps/core-api/src/routes/admin/me.ts` | +GET /ministry-schedule |

---

## Deploy Steps

**PENTING:** setelah git pull, **wajib** `prisma generate` (regenerate client) + `prisma migrate deploy` (apply schema) + rebuild core-api dist.

```bash
# Mac local
cd ~/Projects/ecc-core-platform
pnpm --filter @ecc/database db:generate   # regenerate Prisma client
pnpm --filter @ecc/shared-types build
pnpm --filter @ecc/core-api build         # rebuild dist
pnpm --filter @ecc/core-api type-check    # verify tsc clean
git add -A
git commit -m "feat(event, ministry): from/to window + schedule roster

- GET /admin/event: from/to query params (server-side date filter + overlap for multi-day)
- Schema: +PelayananSchedule +PelayananScheduleAssignment (M31 ministry roster)
- Migration 20260902100000_pelayanan_schedule_roster
- GET/POST/PATCH/DELETE /admin/ministry/:id/schedule + GET /admin/me/ministry-schedule

Per backend-request-event-list-month-scoped.md + ministry-schedule-roster.md."
git push origin main

# VPS
ssh root@187.77.118.85
cd /var/www/ecc-core-platform
git pull origin main
pnpm --filter @ecc/database db:generate
pnpm --filter @ecc/database exec prisma migrate deploy    # apply migration
pnpm --filter @ecc/shared-types build
pnpm --filter @ecc/core-api build
grep -q "pelayananSchedule" apps/core-api/dist/routes/admin/ministry.js && echo "OK dist"
pm2 restart ecc-core-api --update-env
pm2 logs ecc-core-api --lines 15 --nostream
```

---

## Testing (After Deploy)

**Event window:**
```bash
curl -H "Auth: Bearer $TOK" "https://api.eccchurch.global/admin/event?from=2026-09-01&to=2026-09-30" | jq '. | length'
# expected: N events dgn tanggalMulai in Sept
```

**Ministry schedule (setup manual dgn Prisma Studio atau via POST endpoint):**
```bash
# Create
curl -X POST -H "Auth: Bearer $TOK" -H "Content-Type: application/json" \
  "https://api.eccchurch.global/admin/ministry/$MID/schedule" \
  -d '{
    "tanggal": "2026-09-06",
    "ibadahId": "'"$IBADAH_ID"'",
    "assignments": [
      {"jemaatId": "'"$A"'", "pelayananRoleId": "'"$ROLE_A"'"},
      {"jemaatId": "'"$B"'", "pelayananRoleId": "'"$ROLE_B"'"}
    ]
  }'

# List ministry schedule
curl -H "Auth: Bearer $TOK" \
  "https://api.eccchurch.global/admin/ministry/$MID/schedule?from=2026-09-01&to=2026-09-30"

# My schedule cross-ministry
curl -H "Auth: Bearer $TOK" \
  "https://api.eccchurch.global/admin/me/ministry-schedule"
```

---

## Notif Type

Untuk MVP reuse `GROUP_MEMBER_ADDED` type. Kalau nanti mau dedicated `MINISTRY_SCHEDULE_ASSIGNED` type, ping BE — add ke `Notification.type` enum + push handler mobile.

---

## Contact

- **BE:** Tim IDEA
- **Deploy target:** production `api.eccchurch.global` (setelah migration)

---

*Doc versi: 1.0 — 2026-09-02.*
