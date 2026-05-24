# Backend Request: GET /public/event/:slug (Detail Endpoint)

**Untuk**: Tim Backend ECC
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-24
**Priority**: 🟡 **MEDIUM** — improve guest UX (lihat detail event sebelum signup).
**Status**: 📝 **PROPOSED**

## TL;DR

BE sudah rilis `/public/event` list endpoint (per
`docs/backend-request-public-endpoints-for-guest.md`). Tapi belum ada
**detail** endpoint untuk guest. Mobile saat ini fallback ke
"tap card di guest → exit guest mode + welcome screen" sebagai workaround.

Request: rilis `GET /public/event/:slug` mirror dengan
`/public/news/:slug` pattern (UUID atau slug, no auth, view counter
optional).

## Endpoint spec

```http
GET /public/event/uuid-or-slug
(no auth)
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "youth-camp-2026",
    "judul": "Youth Camp 2026",
    "ringkasan": "...",
    "deskripsi": "# Markdown body...\n\nFull event details here.",
    "heroImageUrl": "https://api.eccchurch.global/uploads/event/...",
    "videoUrl": "https://youtube.com/watch?v=...",
    "tanggalMulai": "2026-07-15T00:00:00.000Z",
    "tanggalSelesai": "2026-07-17T00:00:00.000Z",
    "jamMulai": "08:00",
    "jamSelesai": "20:00",
    "lokasi": "Puncak",
    "tipeBayar": "PAID",
    "nominal": "150000",
    "tags": ["youth", "camp"],
    "cabang": { "id": "...", "nama": "ECC Jakarta" } | null,
    "viewCount": 42
  }
}
```

Filter: `isActive=true AND isPublic=true AND isPublished=true`.

Field omitted vs `/admin/event/:slug`: peserta list, registration form,
internal capacity, payment instructions detail.

## Path param flexibility

Same pattern dengan news/renungan: accept UUID atau slug via regex auto-detect.

## Mobile usage post-deploy

Setelah rilis, mobile:
1. Update `useEventDetail` di `src/hooks/useEvents.ts` dengan dual-source
   pattern (sama dengan `useNewsDetail`):
   ```typescript
   queryFn: () => isGuest ? publicEventDetail(idOrSlug) : getEventDetail(idOrSlug)
   ```
2. Guest event card tap → navigate ke `/event/:slug` → detail screen
   render dengan public endpoint
3. Existing event detail screen sudah handle nullable cabang (M25.3)
4. Replace temporary workaround di GuestHomeView (handleEventTap exit guest)
   dengan proper `router.push('/event/:slug')`

## Action items BE

- [ ] `GET /public/event/:slug` handler + zod + rate limit
- [ ] View counter auto-increment (optional, sama dengan news)
- [ ] Update API docs

## Timeline preference

Tidak blocking pilot 2026-06-08. Ideal sebelum public launch untuk smooth
guest → detail browsing flow.
