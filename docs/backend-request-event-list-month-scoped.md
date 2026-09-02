# Backend Request — Event List Month-Scoped (from/to query params)

**Date**: 2026-09-02
**Requester**: Mobile team (Ari)
**Priority**: LOW-MEDIUM (mobile workaround live, tapi tidak scalable)
**Related**: Existing endpoint `GET /admin/event`, ibadah calendar pattern

---

## Context & Problem

Calendar screen mobile v2.1.7+ mendukung navigasi ke bulan lalu dan bulan depan (unlimited). Untuk populate events per bulan, mobile panggil `GET /admin/event?limit=200`.

**Issues dengan pattern current:**
1. Client-side filter — fetch semua events lalu filter per visible month
2. **Limit 200 hardcoded** — sekarang cukup, tapi kalau data event grow (mis. multi-sinode punya 500+ events aktif), user akan silent-miss events di bulan tertentu
3. No pagination — fetching hundreds of events sekaligus tidak efisien
4. Berbeda pattern dengan Ibadah yang sudah pakai `/admin/ibadah/calendar?from=&to=` (month-scoped, expanded recurring occurrences)

## Request untuk Backend

### Add `from` / `to` Query Params ke `GET /admin/event`

**Current:**
```
GET /admin/event?limit=200&isPublished=true
→ [EventListItem, ...]
```

**Proposed:**
```
GET /admin/event?from=YYYY-MM-DD&to=YYYY-MM-DD&isPublished=true
→ [EventListItem, ...] (filter server-side by tanggalMulai)
```

**Behavior:**
- Filter events yang `tanggalMulai` overlap dengan `[from, to]` window (inclusive)
- Kalau `from` / `to` tidak dikirim → keep existing behavior (backward compat — fetch all published atau dengan limit)
- Kalau BOTH `from` + `to` dikirim → server-side date filter, no limit needed (window sudah bounded)
- Multi-day event (`tanggalSelesai > tanggalMulai`) yang **span across** window → include kalau `tanggalMulai <= to && tanggalSelesai >= from`

### Alternative — Calendar-Specific Endpoint

Kalau mixing filter dengan existing endpoint terlalu complex, alternatif bikin endpoint dedicated:

```
GET /admin/event/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
```

Mirror pattern `GET /admin/ibadah/calendar`. Return array event per bulan tanpa pagination.

Mobile prefer pattern #1 (extend existing endpoint) supaya konsisten dengan filter lain (isPublished, cabangId).

### Response Behavior — Include Expired

**PENTING:** untuk calendar use case, jangan filter expired events server-side. Mobile calendar screen navigate ke bulan lalu dan **wajib** tampil event yang sudah lewat (dimmed di UI).

Kalau BE existing endpoint tidak filter expired (client-side filter di mobile), keep. Kalau BE filter default → tambah query param `includeExpired=true` yang mobile bisa pass.

## Mobile Side (setelah BE ready)

Ganti implementasi di `src/hooks/useEvents.ts`:

```typescript
// Sebelum (workaround):
queryFn: () => listEvents({ limit: 200 })

// Sesudah:
queryFn: () => listEvents({
  from: monthStartIso,  // atau windowed extended
  to: monthEndIso,
  isPublished: true,
})
```

Untuk Calendar specifically:
- Fetch 3 bulan window (prev month + current + next) supaya prev/next month click instant
- OR fetch per bulan on-demand dengan queryKey include `year+month`

Untuk Event tab list:
- Fetch upcoming (from=today, to=today+90d) — remove client-side `isEventExpired()` filter (BE sudah scope)

## Non-Goals

- Tidak perlu redesign event schema
- Tidak perlu ubah `EventListItem` response shape
- Multi-sinode filter tetap default behavior (client filter cabangId scope, seperti sekarang)

## Timeline

Mobile v2.1.7 ship dengan workaround `limit: 200`. Aman untuk 1-2 bulan sampai event count grow. BE deliver `from/to` params → mobile ganti hook implementation (patch release, no schema change).

## Testing (setelah BE ready)

```bash
# Fetch events di September 2026
curl -H "Auth: Bearer $TOK" \
  "https://api.eccchurch.global/admin/event?from=2026-09-01&to=2026-09-30&isPublished=true"
# → hanya events yang tanggalMulai in Sep 2026

# Fetch multi-month window (Sept-Nov)
curl -H "Auth: Bearer $TOK" \
  "https://api.eccchurch.global/admin/event?from=2026-09-01&to=2026-11-30"
# → 3 bulan events sekaligus

# Include past (bulan lalu untuk calendar)
curl -H "Auth: Bearer $TOK" \
  "https://api.eccchurch.global/admin/event?from=2026-01-01&to=2026-08-31"
# → past events (calendar screen mobile perlu ini)
```

---

Reply via `docs/be-update-*.md` atau langsung chat kalau ada pertanyaan atau alternative approach.
