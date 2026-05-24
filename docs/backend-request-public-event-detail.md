# Backend Request: GET /public/event/:slug (Detail Endpoint)

**Untuk**: Tim Backend ECC
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-24
**Priority**: 🟡 **MEDIUM** — improve guest UX (lihat detail event sebelum signup).
**Status**: ✅ **RESOLVED** (2026-05-24) — endpoint deployed dengan view counter

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

---

## Backend Response (2026-05-24)

### Endpoint — DEPLOYED

`GET /public/event/:id` (no auth, rate-limit 60/menit/IP via `publicBrowseLimiter`).

**Path param flexibility:** accept **UUID atau slug** via regex auto-detect `/^[0-9a-f-]{36}$/i` — sama pattern dengan `/public/news/:id` + `/public/renungan/:id`.

**Filter:** `isActive=true AND isPublic=true AND isPublished=true`.

**View counter:** auto-increment fire-and-forget (`.catch(() => {})`) — tap detail = +1 view, no auth needed, no rate-limit per user.

### Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "youth-camp-2026",
    "judul": "Youth Camp 2026",
    "ringkasan": "...",
    "deskripsi": "# Markdown body event...",
    "heroImageUrl": "https://api.eccchurch.global/uploads/...",
    "videoUrl": "https://youtube.com/watch?v=...",
    "tanggalMulai": "2026-07-15T00:00:00.000Z",
    "tanggalSelesai": "2026-07-17T00:00:00.000Z",
    "jamMulai": "08:00",
    "jamSelesai": "20:00",
    "lokasi": "Puncak",
    "tipeBayar": "PAID",
    "nominal": "150000",
    "qrisImageUrl": "https://api.eccchurch.global/uploads/...",
    "bankNama": "BCA",
    "bankNomor": "1234567890",
    "bankAtasNama": "Yayasan ECC Jakarta",
    "tags": ["youth", "camp"],
    "viewCount": 43,
    "cabang": { "id": "...", "nama": "ECC Jakarta" }
  }
}
```

### Fields included vs omitted

**Included:**
- Identifier: `id`, `slug`
- Display: `judul`, `ringkasan`, `deskripsi` (markdown body), `heroImageUrl`, `videoUrl`
- Temporal: `tanggalMulai`, `tanggalSelesai`, `jamMulai`, `jamSelesai`
- Location: `lokasi`
- Payment: `tipeBayar`, `nominal`, `qrisImageUrl`, `bankNama`, `bankNomor`, `bankAtasNama`
- Metadata: `tags`, `viewCount`, `cabang`

**Decision:** payment info (QRIS + bank) **disertakan** untuk transparency — guest yang tertarik bisa lihat info pembayaran sebelum daftar. Pattern aligned dengan cabang rekening endpoint yang juga full info.

**Omitted (vs `/admin/event/:id`):**
- `partisipasi[]` — peserta list (PII)
- `quotaPeserta` — internal capacity
- `butuhKehadiran` — admin-side flag
- `isActive`, `isPublic`, `isPublished` — implied true (sudah di-filter)
- `authorId`, `author` — internal audit
- `sinodeId` — internal scoping
- `viewCount`, `createdAt`, `updatedAt` — sebagian sudah di-include atau tidak relevan

### Path param examples

```bash
# By slug (URL-friendly)
curl https://api.eccchurch.global/public/event/youth-camp-2026

# By UUID
curl https://api.eccchurch.global/public/event/abc12345-6789-...
```

### Mobile usage post-deploy

Update `useEventDetail` di `src/hooks/useEvents.ts` dengan dual-source pattern:

```typescript
queryFn: () => isGuest
  ? apiClient.get(`/public/event/${idOrSlug}`)
  : apiClient.get(`/admin/event/${idOrSlug}`)
```

Setelah ini:
- Guest event card tap → `router.push('/event/:slug')` → detail render via public endpoint
- Existing event detail screen sudah handle nullable cabang (M25.3) — no UI change needed
- Replace workaround `handleEventTap` exit guest di GuestHomeView dengan proper navigate

### Performance

View counter increment async (fire-and-forget) — tidak block GET response. `prisma.event.update` di-`.catch()` supaya kalau DB error, request tetap return data.

### Privacy compliance

- Payment info aman untuk public (gereja umumnya share di buletin)
- Tidak ada PII peserta
- Author identity omitted (admin internal)

### Timeline

Deployed 2026-05-24 (bundled dengan public news + renungan detail endpoints). Ready untuk mobile M28+ implementation.
