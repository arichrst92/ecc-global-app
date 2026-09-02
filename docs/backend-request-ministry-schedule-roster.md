# Backend Request — Ministry Schedule / Roster

**Date**: 2026-09-02
**Requester**: Mobile team (Ari)
**Priority**: LOW-MEDIUM (feature request, tidak block existing functionality)
**Related**: Existing ministry endpoints (`GET /admin/ministry`, `POST /admin/ministry/:id/join`)
**Status BE**: ✅ **DELIVERED 2026-09-02** — full stack: schema + migration + 4 endpoints ministry-scoped + 1 endpoint me-scoped. Reply: `be-update-2026-09-02-event-window-and-ministry-schedule.md`

---

## Context

Sprint 8+ feature request: mobile ingin tampilkan **jadwal pelayanan / roster** untuk ministry members. Sekarang app hanya list nama pelayanan + members. User yang aktif melayani tidak tahu:

- Kapan giliran mereka melayani (schedule per week/date)
- Siapa saja yang bertugas bersama mereka di ibadah minggu ini
- History pelayanan (sudah berapa kali melayani bulan ini)

Fitur ini common di church apps kompetitor (Planning Center, WorshipTools, ChurchTeams, dll.).

## Request untuk Backend

### Endpoint #1: Ministry Schedule List

```
GET /admin/ministry/:id/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD
```

**Auth:** Bearer required.

**Query params:**
- `from` — tanggal mulai window (default: today)
- `to` — tanggal akhir window (default: today + 4 weeks)

**Response:**

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
        "ibadahLokasi": "Sanctuary",
        "assignments": [
          {
            "id": "uuid",
            "jemaatId": "uuid",
            "jemaatNama": "Ari Christian",
            "jemaatFotoUrl": null,
            "posisi": "Worship Leader",
            "posisiLevel": 5,
            "notes": null
          },
          {
            "id": "uuid",
            "jemaatId": "uuid",
            "jemaatNama": "Dewi Christian",
            "jemaatFotoUrl": "/uploads/dewi.jpg",
            "posisi": "Vocalist",
            "posisiLevel": 3,
            "notes": "Rehearsal 30 menit sebelum"
          }
        ]
      }
    ]
  }
}
```

Sorted by `tanggal` ASC.

### Endpoint #2: My Ministry Schedule (across all ministries)

```
GET /admin/me/ministry-schedule?from=YYYY-MM-DD&to=YYYY-MM-DD
```

**Auth:** Bearer required.

**Behavior:** cross-ministry — return semua assignment untuk requester jemaat, digroup by tanggal.

**Response:**

```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": "uuid",
        "tanggal": "2026-09-06",
        "ibadahNama": "Ibadah Umum Pagi",
        "ibadahJamMulai": "08:00",
        "ibadahLokasi": "Sanctuary",
        "ministryId": "uuid",
        "ministryNama": "Worship Team",
        "posisi": "Worship Leader",
        "notes": null,
        "coServants": [
          { "jemaatId": "uuid", "namaLengkap": "Dewi Christian", "posisi": "Vocalist" },
          { "jemaatId": "uuid", "namaLengkap": "Adley Christian", "posisi": "Drummer" }
        ]
      }
    ]
  }
}
```

Untuk populate "Pelayanan Saya Minggu Ini" section di home tab atau notification reminder.

### Endpoint #3 (Optional, admin-facing): Create/Update Schedule

Leader/admin ministry perlu bisa buat schedule. Bisa via web portal saja (Phase 1), tidak wajib di mobile.

Kalau BE mau expose:

```
POST /admin/ministry/:id/schedule
Body: {
  ibadahId, tanggal,
  assignments: [{ jemaatId, posisiId, notes? }]
}

PATCH /admin/ministry/:id/schedule/:scheduleId

DELETE /admin/ministry/:id/schedule/:scheduleId
```

Mobile Phase 1 skip create/edit — read-only sudah cukup. Leader edit lewat web portal.

## Schema Considerations (BE-side)

Recommend table baru `PelayananSchedule`:
- `id` (uuid)
- `pelayananId` (fk → Pelayanan)
- `ibadahId` (fk → Ibadah, optional — bisa juga standalone event)
- `tanggal` (date)
- `createdAt`, `updatedAt`

Plus `PelayananScheduleAssignment`:
- `id` (uuid)
- `scheduleId` (fk)
- `jemaatId` (fk)
- `posisiId` (fk → PelayananRole)
- `notes` (text, nullable)

Unique constraint `(scheduleId, jemaatId)` supaya 1 jemaat tidak double-book di 1 schedule.

## Mobile UX Plan (setelah BE ready)

**Ministry detail page:**
- Tambah tab/section baru "Jadwal" — list next 4 weeks schedule
- Per schedule item: tanggal + ibadah + list assignments dengan avatar + posisi

**Home tab:**
- Widget "Pelayanan Saya Minggu Ini" — panggil `/me/ministry-schedule`
- Tampil upcoming assignment terdekat + tap → ministry detail

**Push notif (future):**
- Auto-reminder H-1 jam 8 malam: "Besok Anda bertugas sebagai Worship Leader di Ibadah Umum Pagi jam 08:00"

## Non-Goals

- Automated scheduling / rotation logic (leader manual assign)
- Substitution request / swap flow (Phase 2)
- Availability calendar per jemaat (Phase 2)

## Timeline

- BE endpoint #1 + #2 (read-only) — 3-5 hari kerja
- Web portal untuk leader edit schedule — parallel, tidak block mobile
- Mobile ship setelah BE endpoints live + tested (Sprint 9-10)

## Testing

```bash
# Setup: leader create schedule via web portal (atau langsung DB seed)

# Verify list schedule
curl -H "Authorization: Bearer $TOK" \
  "https://api.eccchurch.global/admin/ministry/$MID/schedule?from=2026-09-06&to=2026-10-06"
# → schedules[] dengan assignments

# Verify cross-ministry my schedule
curl -H "Authorization: Bearer $TOK" \
  "https://api.eccchurch.global/admin/me/ministry-schedule?from=2026-09-06&to=2026-10-06"
# → assignments[] terurut by tanggal
```

## Non-Priority

Feature ini nice-to-have — kalau BE resource terbatas, defer ke Sprint 10+. Existing ministry list/detail sudah functional untuk basic membership tracking.

---

Reply via `docs/be-update-*.md` atau langsung chat kalau ada pertanyaan atau alternative approach.
