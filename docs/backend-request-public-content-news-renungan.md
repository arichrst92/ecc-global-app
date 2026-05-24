# Backend Request: Public Endpoints for News + Renungan (Guest Mode)

**Untuk**: Tim Backend ECC (Claude session)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-24
**Priority**: 🟡 **MEDIUM** — guest home content visibility. Tidak blocking pilot.
**Status**: 📝 **PROPOSED**

## TL;DR

User feedback: "belum ada berita pada dashboard guest mode". Saat ini guest
home cuma tampil static "About ECC" + links + (M27) upcoming events preview.
News + Renungan belum bisa di-tampilkan karena `/admin/news` + `/admin/renungan`
butuh auth.

Request: rilis `GET /public/news` + `GET /public/renungan` mirror `/admin/*`
tapi public, filter `isPublished=true` (atau equivalent flag).

Pattern aligned dengan 4 endpoint public sebelumnya
(`docs/backend-request-public-endpoints-for-guest.md`):
- Public, no auth
- Rate-limit 60/menit/IP via `publicBrowseLimiter`
- Slim variant (omit internal fields kalau ada)
- Optional `is_public` flag toggle dari admin portal

## Endpoint yang diperlukan

### 1. `GET /public/news`

```http
GET /public/news?cabangId=&limit=&page=
(no auth)
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "judul": "ECC Jakarta Persembahan Sosial 2026",
      "ringkasan": "...",
      "heroImageUrl": "https://api.eccchurch.global/uploads/...",
      "tanggal": "2026-05-20",
      "cabang": { "id": "...", "nama": "ECC Jakarta" } | null
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 24 }
}
```

Filter: `isPublished=true` + (opsional) `isPublic=true`. Sort `tanggal DESC`.

### 2. `GET /public/renungan`

```http
GET /public/renungan?limit=&page=
(no auth)
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "judul": "Berserah pada Tuhan",
      "ringkasan": "...",
      "ayatAlkitab": "Mazmur 37:5",
      "tanggal": "2026-05-24",
      "author": { "namaLengkap": "Pdt. ..." } | null
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 156 }
}
```

Filter: `isPublished=true`. Sort `tanggal DESC`. Renungan global (no cabang
filter) — semua jemaat baca renungan yang sama.

### 3. (Optional) Detail endpoints

`GET /public/news/:id` + `GET /public/renungan/:id` untuk tap dari list →
detail full read. Filter sama (publish + public).

## Mobile usage

Setelah BE rilis:
1. `GuestHomeView` add news preview section (3 latest) di atas events
2. `GuestHomeView` add renungan-of-the-day section
3. Detail navigation `/news/[id]` + `/renungan/[id]` — kalau guest, swap ke
   public endpoint (sama UI screen, beda query key)

## Schema impact

Tidak ada migration baru kalau model news + renungan sudah punya
`is_published` flag (likely yes per existing `/admin/news` filter).

Kalau perlu privacy granular (mis. news yang hanya untuk member terdaftar),
add column `is_public BOOLEAN DEFAULT true` di `news` + `renungan`. Default
true → backward compat.

## Privacy

- News + Renungan dianggap public domain (gereja publish untuk dijangkau)
- Author identity OK untuk renungan (pelayan firman publik)
- Tidak ada PII jemaat di response

## Rate limiting

`publicBrowseLimiter` 60/menit/IP. Mobile cache 30 menit (content jarang
update).

## Action items BE

- [ ] `GET /public/news` handler + zod schema + rate limit
- [ ] `GET /public/renungan` handler + zod schema + rate limit
- [ ] (Optional) Detail endpoints `/public/news/:id` + `/public/renungan/:id`
- [ ] (Optional) Add `is_public` column kalau perlu granular control
- [ ] Update API docs

## Timeline preference

Tidak blocking pilot rollout 2026-06-08. Ideal sebelum public launch
(mid-Juni 2026) untuk improve guest content discoverability.

## Backend Response

*(diisi oleh BE setelah review)*
