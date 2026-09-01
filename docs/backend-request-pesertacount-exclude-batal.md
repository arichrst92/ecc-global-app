# Backend Request — Exclude BATAL dari `pesertaCount`

**Date**: 2026-09-01
**Requester**: Mobile team (Ari)
**Priority**: MEDIUM (visible bug di event detail + event list mobile)
**Related**: `be-update-2026-08-31-family-participation-list.md` (family multi)

---

## Bug Report

**Symptom** (visible di mobile v1.9.3):
- Event detail screen → section "Meta" → "N/quota Peserta" tampil angka terlalu tinggi
- Event list card → participant count juga overcounted
- Progress bar (kalau ada quota) → filled percentage salah

**Repro:**
1. Bapak daftarkan istri + anak → `pesertaCount` = 2
2. Bapak cancel istri via mobile modal → BE set participation.status = BATAL
3. Mobile refresh event detail → `pesertaCount` tetap **2** (harusnya **1**)

**Expected:** `pesertaCount` **exclude** row status = BATAL. Sama seperti behavior `GET /peserta/mine-and-family` yang skip BATAL.

## Root Cause (dari analisis mobile-side)

`GET /admin/event/:id` return field `pesertaCount: number` (via `EventListItem` inherited by `EventDetail`). Field ini kemungkinan di-compute dari `COUNT(*) WHERE eventId = ?` tanpa filter status. Kalau ada 5 registrations lalu 2 di-cancel (BATAL), COUNT tetap return 5.

Untuk kontraks dengan `familyParticipationsCount` (yang BE compute dengan `exclude BATAL`), inconsistent behavior.

## Request untuk Backend

### Fix `pesertaCount` di semua event endpoint response

Update SQL/query untuk exclude BATAL:

```sql
-- Before
SELECT COUNT(*) FROM event_participation WHERE event_id = ?

-- After
SELECT COUNT(*) FROM event_participation
WHERE event_id = ? AND status != 'BATAL'
```

Endpoints yang affected:
- `GET /admin/event` (list) — `pesertaCount` per item
- `GET /admin/event/:idOrSlug` (detail) — `pesertaCount`
- `GET /public/event/:slug` (guest detail, kalau ada) — `pesertaCount`

Semua konsisten exclude BATAL.

### Optional: expose `pesertaCountAll` (backward-compat)

Kalau admin portal butuh raw count termasuk BATAL untuk laporan/audit:

```typescript
{
  pesertaCount: number,          // active only (DAFTAR + MENUNGGU + BAYAR + HADIR)
  pesertaCountAll?: number,      // NEW OPTIONAL: total termasuk BATAL
}
```

Additive, backward-compat safe. Mobile skip field ini.

## Non-Goals

- Tidak perlu ubah data — hanya query filter di response computation
- Tidak perlu API version bump — bug fix

## Impact

**Sebelum fix:**
- Quota tampil salah (mis. event limit 50, 5 daftar + 3 cancel → tampil "8/50" padahal actual 5)
- Progress bar quota misleading
- Guest yang lihat public detail → misleading popularity
- `isFull` calculation (mobile) → potentially false-positive block

**Setelah fix:**
- Angka accurate untuk display + quota enforcement
- Konsisten dengan `familyParticipationsCount` behavior

## Timeline

Mobile ship v1.9.3 dengan bug ini visible. BE bisa deliver quick fix (1-line SQL change) → deploy VPS → mobile langsung correct tanpa mobile change.

## Testing

```bash
# Setup: register 2 peserta di event X
curl -X POST $API/admin/event/$EVID/peserta/batch -H "Auth: Bearer $TOK" \
  -d '{"jemaatIds": ["'$A'","'$B'"]}'

# Cek pesertaCount
curl -H "Auth: Bearer $TOK" $API/admin/event/$EVID
# → data.pesertaCount = 2

# Cancel 1
curl -X POST $API/admin/event/$EVID/peserta/$PID_A/self-cancel -H "Auth: Bearer $TOK"

# Cek lagi
curl -H "Auth: Bearer $TOK" $API/admin/event/$EVID
# → data.pesertaCount = 1 (currently returns 2, HARUSNYA 1 setelah fix)
```

---

Reply via `docs/be-update-*.md` atau langsung chat.
