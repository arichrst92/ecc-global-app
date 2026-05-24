# Backend Request: Public Endpoints for Guest Mode (Read-Only Browse)

**Untuk**: Tim Backend ECC (Claude session)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-24
**Priority**: 🟡 **MEDIUM** — guest mode functional sebagai placeholder dengan CTA daftar. Kalau BE rilis public endpoints, user bisa LIHAT data sebelum commit signup (improve conversion).
**Status**: 📝 **PROPOSED** — menunggu BE response

## TL;DR

Mobile rilis Guest Mode (M24) yang memungkinkan user browse-only tanpa signup.
Saat ini terbatas: hanya Home (static), Profile (CTA), Bible (offline), Branch
list (sudah ada `/auth/cabang` skipAuth).

Per user request 2026-05-24: guest harus bisa **lihat** (read-only) ibadah,
event, local market, rekening per cabang. Mobile sudah pasang tab guard
sementara dengan `<GuestPlaceholderView>` (signup CTA), siap di-replace
dengan view read-only saat BE rilis endpoint public berikut.

Architecture aligned dengan existing public endpoints:
- `/auth/cabang` (existing, skipAuth)
- `/public/maintenance`, `/public/app-version`, `/public/app-config`

## Endpoint yang diperlukan

### 1. `GET /public/ibadah/calendar`

Mirror `/admin/ibadah/calendar` tapi public, filter only future + isActive +
yang admin tandai `isPublic = true` (kalau ada flag privacy untuk acara
internal khusus).

```http
GET /public/ibadah/calendar?cabangId=uuid&from=2026-05-24&to=2026-06-23
(no auth)
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tanggal": "2026-05-25",
      "jam": "08:00",
      "judul": "Ibadah Minggu Pagi",
      "cabang": { "id": "...", "nama": "ECC Jakarta" },
      "lokasi": "Aula Utama",
      "isPublic": true
    }
  ]
}
```

Field omitted dari /admin variant: petugas, attendees count, internal notes.

### 2. `GET /public/event`

Mirror `/admin/event` list. Filter only `isActive=true` + `isPublic=true` +
`tanggal >= today`.

```http
GET /public/event?cabangId=uuid&limit=10
(no auth)
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "slug": "youth-camp-2026",
      "judul": "Youth Camp 2026",
      "ringkasan": "...",
      "heroUrl": "https://api.eccchurch.global/uploads/event/...",
      "tanggal": "2026-07-15",
      "tipeBayar": "PAID",
      "nominal": "150000",
      "lokasi": "Puncak"
    }
  ]
}
```

Field omitted: peserta list, registration form, internal capacity numbers.

### 3. `GET /public/local-market`

Endpoint `/admin/me/local-market` saat ini accept conditional auth (mobile
attach token kalau ada), tapi BE behavior tidak documented untuk unauth.
Either:

- **Option A**: konfirmasi `/admin/me/local-market` works unauth (return public
  isActive=true entries) → tinggal docs update
- **Option B**: rilis `/public/local-market` dedicated endpoint dengan filter
  fixed `isActive=true`

```http
GET /public/local-market?cabangId=uuid&industri=Food&page=1
(no auth)
```

**Response 200**: sama dengan existing list response.

### 4. `GET /public/cabang/:id/rekening`

Mirror `/admin/cabang/:id/rekening`. Filter only `isActive=true`. Berguna
untuk guest persembahan tab (lihat info rekening cabang sebelum daftar).

```http
GET /public/cabang/uuid/rekening
(no auth)
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nama": "Bank BCA — Persembahan",
      "noRekening": "1234567890",
      "namaPemilik": "Yayasan ECC Jakarta",
      "purpose": "Persembahan",
      "qrisUrl": "https://api.eccchurch.global/uploads/qris/...",
      "isActive": true
    }
  ]
}
```

Privacy consideration: nama pemilik + nomor rekening adalah informasi yang
biasanya di-print di buletin cabang (publik), bukan rahasia. Tapi konfirmasi
sama compliance team.

---

## Mobile saat ini

Mobile sudah implement (commit M24 + M25):

- `enterGuestMode()` di auth store → set `isGuest=true`, navigate ke tabs
- 3 tab guards (Ibadah, Event, Persembahan) → render `<GuestPlaceholderView>`
  dengan signup CTA
- `<GuestHomeView>`: static brand content + link ke Bible (offline) + Branch
  list + website ECC
- `<GuestProfileView>`: feature unlock list + signup CTA + quick links
  (Bible, Branch list)
- Bible tab → fully accessible (offline)
- Branch list → fully accessible (existing `/auth/cabang` skipAuth)

Setelah BE rilis public endpoints di atas, mobile akan ganti
`<GuestPlaceholderView>` dengan view read-only yang:
- Ibadah: list jadwal ibadah (no check-in button, replace dengan "Daftar
  untuk check-in")
- Event: list event (no RSVP button, replace dengan "Daftar untuk RSVP")
- Persembahan: info rekening + QRIS (no upload bukti, replace dengan "Daftar
  untuk e-bukti & riwayat")

---

## Rate limiting

Public endpoints di-rate-limit per IP (existing pattern):
- 60 req/min/IP untuk read endpoints
- Burst tolerance 100 req

Mobile pre-warm hanya ibadah + event saat user navigate ke tab — bukan
splash — supaya tidak boros.

---

## Schema impact

- Tidak ada migration baru — hanya add route handlers yang filter existing
  tables dengan `isActive=true` + (optional) `isPublic=true`.
- Kalau pakai flag `isPublic` di model, perlu migration kecil add column
  `is_public BOOLEAN DEFAULT true` di `ibadah`, `event` tables.

---

## Privacy & content control

Admin portal bisa toggle `isPublic` per row supaya event internal (mis. ibadah
khusus pengurus) tidak muncul di public endpoint. Default behavior: semua
event yang admin publish → public.

Untuk rekening: tampil semua yang `isActive=true`. Admin bisa toggle nonaktif
untuk privacy.

---

## Backwards compat

- BE belum implement → mobile guard tetap render `<GuestPlaceholderView>`
  dengan CTA signup. User experience workable (signup CTA prominent).
- BE rilis salah satu endpoint → mobile bisa enable tab itu dulu, sisanya
  tetap placeholder.
- Tidak ada breaking change ke endpoint existing.

---

## Action items BE

- [ ] `GET /public/ibadah/calendar` — handler + zod schema + rate limit
- [ ] `GET /public/event` — handler + zod schema + rate limit
- [ ] `GET /public/local-market` — konfirmasi unauth behavior atau new endpoint
- [ ] `GET /public/cabang/:id/rekening` — handler + filter isActive
- [ ] (Optional) Add `is_public` column ke ibadah + event tables, default true
- [ ] Update API docs (Swagger / reference/mobile-api-guide.md)

---

## Timeline preference

Tidak blocking pilot 2026-06-08 — guest mode sudah functional dengan CTA
signup. Ideal sebelum public launch (mid-Juni 2026) untuk improve conversion
guest → signup. Estimasi BE effort: ~2-3 hari (4 endpoint similar pattern).

---

## Backend Response

*(diisi oleh BE setelah review)*
