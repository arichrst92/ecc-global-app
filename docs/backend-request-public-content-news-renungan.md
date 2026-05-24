# Backend Request: Public Endpoints for News + Renungan (Guest Mode)

**Untuk**: Tim Backend ECC (Claude session)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-24
**Priority**: 🟡 **MEDIUM** — guest home content visibility. Tidak blocking pilot.
**Status**: ✅ **RESOLVED** (2026-05-24) — 4 endpoints deployed (list + detail untuk news + renungan)

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

## Backend Response (2026-05-24)

### Endpoints — DEPLOYED

4 endpoint live di production (`https://api.eccchurch.global`), rate-limit 60/menit/IP via `publicBrowseLimiter`. No auth required.

#### 1. `GET /public/news?cabangId=&limit=&page=`

Filter `tipe=NEWS AND isPublished=true`. Sort `publishedAt DESC` → `createdAt DESC` fallback.

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "slug": "ecc-jakarta-persembahan-sosial-2026",
      "judul": "ECC Jakarta Persembahan Sosial 2026",
      "ringkasan": "...",
      "heroImageUrl": "https://api.eccchurch.global/uploads/content/hero/news/...",
      "tanggal": "2026-05-20T10:00:00.000Z",
      "tags": ["sosial", "outreach"],
      "cabang": { "id": "...", "nama": "ECC Jakarta" },
      "author": { "namaLengkap": "Pdt. Yohanes" }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 24 }
}
```

#### 2. `GET /public/news/:id` (atau `:slug`)

Detail single news + full body markdown. Path param accept **UUID atau slug** — mobile bisa pakai URL-friendly path `/news/youth-camp-2026` atau `/news/<uuid>`. Auto-detect via regex.

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "ecc-jakarta-persembahan-sosial-2026",
    "judul": "...",
    "ringkasan": "...",
    "konten": "# Markdown body...\n\nFull article here.",
    "heroImageUrl": "https://...",
    "tanggal": "2026-05-20T10:00:00.000Z",
    "tags": ["sosial"],
    "viewCount": 158,
    "cabang": { "id": "...", "nama": "ECC Jakarta" },
    "author": { "namaLengkap": "Pdt. Yohanes" }
  }
}
```

View counter auto-increment (fire-and-forget) — guest tap detail = +1 view, no auth needed.

#### 3. `GET /public/renungan?limit=&page=`

Filter `tipe=RENUNGAN AND isPublished=true`. Sort `tanggal DESC` → `publishedAt DESC` fallback. `cabangId` param **di-ignore** — renungan biasanya global (semua jemaat baca renungan yang sama).

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "slug": "berserah-pada-tuhan-mazmur-37-5",
      "judul": "Berserah pada Tuhan",
      "ringkasan": "...",
      "ayatAlkitab": "Mazmur 37:5",
      "tanggal": "2026-05-24T00:00:00.000Z",
      "author": { "namaLengkap": "Pdt. Yohanes" }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 156 }
}
```

#### 4. `GET /public/renungan/:id` (atau `:slug`)

Detail renungan + body markdown. Sama pattern dengan news detail (UUID atau slug, auto view counter).

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "berserah-pada-tuhan-mazmur-37-5",
    "judul": "Berserah pada Tuhan",
    "ringkasan": "...",
    "konten": "# Markdown body renungan...",
    "ayatAlkitab": "Mazmur 37:5",
    "tanggal": "2026-05-24T00:00:00.000Z",
    "viewCount": 89,
    "author": { "namaLengkap": "Pdt. Yohanes" }
  }
}
```

### Schema — no migration needed

`Konten` model sudah punya `isPublished` + `publishedAt` + `tipe` (NEWS/RENUNGAN) + `slug` unique. Pakai existing flag — tidak tambah `isPublic` column baru karena `isPublished` sudah cukup untuk gate publish/draft. Author lookup via `Konten.author → User → Jemaat.namaLengkap`.

### Privacy compliance

- Author cuma kasih `namaLengkap` (no contact info)
- Tidak ada PII jemaat lain di response
- View counter incremented async (tidak block response, tidak rate-limit per user)
- News + Renungan dianggap public content (di-publish = boleh dibaca semua)

### Path param flexibility

Endpoint detail accept **UUID atau slug** untuk path param:
- `GET /public/news/abc-uuid-1234-...` → match by `id`
- `GET /public/news/youth-camp-2026` → match by `slug`
- Auto-detect via regex `/^[0-9a-f-]{36}$/i`

Mobile bisa pakai slug untuk URL share-able (`/news/youth-camp-2026`) atau UUID untuk programmatic navigation.

### Mobile action

Setelah BE live, mobile `GuestHomeView` bisa:
1. Fetch 3 latest news untuk preview section
2. Fetch 1 latest renungan untuk "Renungan of the day" section
3. Tap → navigate ke detail screen yang sama untuk guest + member (deteksi auth state, route ke `/admin/news/:id` atau `/public/news/:id`)

Cache strategy: 30 menit (content jarang update, balance dengan freshness).

### Timeline

Deployed 2026-05-24 (bundled dengan public guest endpoints batch). Ready untuk mobile M28 implementation.
