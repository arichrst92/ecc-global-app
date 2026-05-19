# ECC Core API — Mobile App Integration Guide

> Panduan integrasi untuk mobile app developer. Mencakup auth flow, common patterns, dan endpoint-endpoint yang paling sering dipakai dari sisi mobile.
> Spec lengkap auto-generated tersedia di `GET /docs` (Swagger UI).

## Base URL

| Environment | URL |
|---|---|
| Development | `http://localhost:4100` |
| Production | `https://core-api.eccchurch.global` |

## Tier Endpoint

Core API punya dua tier endpoint dengan auth model berbeda:

| Prefix | Auth | Untuk |
|---|---|---|
| `/auth/*` | Public (rate-limited) | Login flow (OTP, face), refresh token |
| `/admin/*` | `Authorization: Bearer <JWT>` | Aplikasi yang sudah login user-spesifik (read+write data per jemaat) |
| `/api/v1/*` | `X-API-Key: ecc_xxx_yyy` | Konsumer eksternal stateless (mobile read-only / scanner) |
| `/uploads/*` | Public | Static file serving (foto, QRIS, dll) |

Mobile app biasanya memakai kombinasi: **API key untuk read public data + OTP login JWT untuk action user-spesifik**.

## Common Response Envelope

Semua response JSON mengikuti envelope ini.

### Success

```json
{
  "success": true,
  "data": { /* atau [...] */ },
  "meta": { /* opsional, untuk pagination atau extra info */ }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input tidak valid",
    "details": { /* opsional */ }
  }
}
```

Error code yang umum:

| Code | HTTP | Arti |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Body/query gagal validasi Zod. `details.fieldErrors` berisi map field → message. |
| `UNAUTHORIZED` | 401 | Token tidak ada / kedaluwarsa / tidak valid. |
| `FORBIDDEN` | 403 | Auth OK tapi tidak punya wewenang (mis. scan tanpa role scanner). |
| `NOT_FOUND` | 404 | Resource tidak ada. |
| `CONFLICT` / `CONSTRAINT_UNIQUE` / `CONSTRAINT_RELATION` | 409 | Duplikat, FK violation, atau resource sedang tertaut data lain. |
| `TOO_MANY_REQUESTS` | 429 | Rate limit hit. Lihat header `Retry-After`. |
| `INTERNAL_ERROR` | 500 | Error tak terduga. Log server punya stack trace. |

### Validation error detail

Response body untuk 400 Zod error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input tidak valid",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "noHp": ["Format no HP harus E.164 (+62...)"],
        "nama": ["Minimal 2 karakter"]
      }
    }
  }
}
```

Mobile app bisa pakai `details.fieldErrors[field]` untuk highlight input yang salah.

## Pagination

Endpoint list yang paginated menerima query:

```
?page=1&limit=20&search=keyword&sortBy=namaLengkap&sortOrder=asc
```

Response:

```json
{
  "success": true,
  "data": [ /* ... */ ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 137,
    "totalPages": 7
  }
}
```

Default: `page=1`, `limit=20`. Max `limit` per endpoint biasanya 100.

## Phone number normalization

Backend simpan `noHp` dalam format E.164 (`+62...`). Kalau user input `082...` di mobile, **app yang harus normalize** sebelum kirim ke API. Algoritma:

```typescript
function normalizePhone(input: string): string | null {
  const s = input.trim().replace(/[\s\-()]/g, '');
  if (s.startsWith('+62')) return s;
  if (s.startsWith('62')) return '+' + s;
  if (s.startsWith('0')) return '+62' + s.slice(1);
  if (s.startsWith('8')) return '+62' + s;
  return null; // invalid
}
```

Format invalid: BE akan reject 400 dengan `noHp: ["Format no HP harus E.164 (+62...)"]`.

---

# 1. Authentication

## 1.1 Request OTP

Trigger pengiriman OTP ke WhatsApp.

```
POST /auth/otp/request
Content-Type: application/json
```

**Request:**

```json
{
  "noHp": "+6282115678446",
  "purpose": "LOGIN"
}
```

`purpose` enum: `LOGIN`, `ENROLLMENT`, `RESET_FACE`. Default `LOGIN`.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "message": "OTP terkirim ke +6282115678446"
  }
}
```

**Response 404:**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Nomor HP belum terdaftar sebagai jemaat"
  }
}
```

**Response 429** (rate limited, terlalu banyak request dalam waktu singkat):

```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Tunggu beberapa saat sebelum request OTP lagi"
  }
}
```

## 1.2 Verify OTP

Verifikasi OTP yang diterima user → dapat access + refresh token.

```
POST /auth/otp/verify
Content-Type: application/json
```

**Request:**

```json
{
  "noHp": "+6282115678446",
  "kode": "123456",
  "purpose": "LOGIN"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOi...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOi...",
    "expiresIn": 900,
    "user": {
      "id": "8f3c8e22-…",
      "jemaatId": "ab12cd34-…",
      "namaLengkap": "Ari Christian",
      "noHp": "+6282115678446",
      "isFulltimer": true,
      "canAccessPortal": true,
      "menuAccess": {
        "dashboard": { "canRead": true, "canWrite": true, "canDelete": true },
        "jemaat":    { "canRead": true, "canWrite": true, "canDelete": true },
        "event":     { "canRead": true, "canWrite": true, "canDelete": true }
      },
      "hasFaceEnrolled": false,
      "fotoUrl": "/uploads/profiles/jemaat/ab12cd34.webp?v=1716185234567"
    }
  }
}
```

**Notes:**

- `accessToken` valid `expiresIn` detik (default 900 = 15 menit).
- `refreshToken` valid 30 hari (default). Simpan secure di mobile (Keychain/Keystore).
- `menuAccess` = resolved RBAC permission. Mobile app pakai ini untuk hide UI yang user tidak boleh akses (mis. tombol Delete kalau `canDelete=false`).
- `fotoUrl` prefix dengan base URL untuk dapat full URL gambar.

**Response 401:**

```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "OTP salah atau kadaluarsa" }
}
```

## 1.3 Refresh Access Token

Sebelum `accessToken` expired, refresh untuk dapat yang baru.

```
POST /auth/refresh
Content-Type: application/json
```

**Request:**

```json
{ "refreshToken": "eyJ..." }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...new...",
    "refreshToken": "eyJ...rotated...",
    "expiresIn": 900
  }
}
```

`refreshToken` di-rotate (lama di-revoke, baru di-issue). Simpan yang baru.

**Response 401:** refresh token tidak valid / kedaluwarsa → user harus login ulang.

## 1.4 Face Login (opsional)

Setelah enroll wajah, user bisa login tanpa OTP.

```
POST /auth/face/login
Content-Type: application/json
```

**Request:**

```json
{
  "noHp": "+6282115678446",
  "descriptor": [0.123, -0.456, ...]  // 128-dim Float32 array
}
```

Descriptor dihitung di mobile (TensorFlow Lite / face-api.js untuk hybrid app). Server compare ke `User.faceDescriptor` yang di-enroll.

**Response 200:** sama dengan `/auth/otp/verify`.

## 1.5 Get Resolved Access (re-fetch)

Setelah login, untuk re-fetch menu access (mis. admin baru saja ubah RBAC) tanpa logout.

```
GET /auth/me/access
Authorization: Bearer <accessToken>
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "canAccessPortal": true,
    "menuAccess": {
      "jemaat": { "canRead": true, "canWrite": false, "canDelete": false }
    }
  }
}
```

## 1.6 Logout

```
POST /auth/logout
Content-Type: application/json
```

**Request:**

```json
{ "refreshToken": "eyJ..." }
```

**Response 200:** refresh token di-invalidate di server. Hapus token lokal di app.

---

# 2. API Key Authentication (Konsumer Eksternal)

Untuk endpoint `/api/v1/*` yang stateless (tidak butuh user login).

## Header

```
X-API-Key: ecc_AB23xy7K_pQ8wRx2nT4mK6vL9yZ3bF7d
```

Admin generate key di portal `/dashboard/api-key`. Format: `ecc_<prefix>_<secret>`. Mobile app harus simpan secure (Keychain/Keystore — TIDAK di shared preferences plain).

## Response saat key invalid

**401:**

```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "API key tidak dikenali" }
}
```

Atau saat header tidak ada:

```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "X-API-Key header tidak ada" }
}
```

---

# 3. Jemaat — Lookup by Kode

Setiap jemaat punya QR code unik 8 char (alphanumeric uppercase) di field `kode`. Dipakai untuk scan check-in event / ibadah.

```
GET /admin/jemaat/by-kode/{kode}
Authorization: Bearer <accessToken>
```

**Example:**

```
GET /admin/jemaat/by-kode/ABC23XYZ
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "ab12cd34-…",
    "kode": "ABC23XYZ",
    "namaLengkap": "Ari Christian",
    "noHp": "+6282115678446",
    "fotoUrl": "/uploads/profiles/jemaat/ab12cd34.webp?v=1716185234567",
    "isActive": true,
    "cabang": {
      "id": "11111-…",
      "nama": "ECC Jakarta"
    }
  }
}
```

**Response 404:**

```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Kode jemaat tidak ditemukan" }
}
```

---

# 4. Ibadah — Calendar & Check-in

## 4.1 List ibadah

```
GET /admin/ibadah?cabangId={uuid}&page=1&limit=20
Authorization: Bearer <accessToken>
```

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "33333-…",
      "nama": "Ibadah Minggu Pagi",
      "tipeJadwal": "WEEKLY",
      "hari": "MINGGU",
      "tanggalMulai": "2026-01-04",
      "jamMulai": "08:00",
      "jamSelesai": "10:00",
      "lokasi": "Aula Utama, ECC Jakarta",
      "isOnline": false,
      "isActive": true,
      "cabang": { "id": "11111-…", "nama": "ECC Jakarta" },
      "kategoriIbadah": { "id": "22222-…", "nama": "Ibadah Umum" },
      "pelayananCount": 3,
      "petugasCount": 12
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 4, "totalPages": 1 }
}
```

## 4.2 Calendar occurrences

Generate semua occurrence (recurring + ONCE) di rentang tanggal, skip yang di-cancel.

```
GET /admin/ibadah/calendar?from=2026-05-01&to=2026-05-31&cabangId={uuid}
Authorization: Bearer <accessToken>
```

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "ibadahId": "33333-…",
      "tanggal": "2026-05-03",
      "nama": "Ibadah Minggu Pagi",
      "jamMulai": "08:00",
      "jamSelesai": "10:00",
      "tipeJadwal": "WEEKLY",
      "lokasi": "Aula Utama, ECC Jakarta",
      "isOnline": false,
      "cabang": { "id": "11111-…", "nama": "ECC Jakarta" },
      "kategoriIbadah": { "id": "22222-…", "nama": "Ibadah Umum" }
    },
    {
      "ibadahId": "33333-…",
      "tanggal": "2026-05-10",
      "nama": "Ibadah Minggu Pagi",
      "jamMulai": "08:00",
      "jamSelesai": "10:00",
      "tipeJadwal": "WEEKLY",
      "lokasi": "Aula Utama, ECC Jakarta",
      "isOnline": false,
      "cabang": { "id": "11111-…", "nama": "ECC Jakarta" },
      "kategoriIbadah": { "id": "22222-…", "nama": "Ibadah Umum" }
    }
  ],
  "meta": { "from": "2026-05-01", "to": "2026-05-31", "count": 12 }
}
```

Rentang maksimal 366 hari.

## 4.3 Check-in via scan QR jemaat

User volunteer di lokasi ibadah scan QR di kartu jemaat → record kehadiran.

```
POST /admin/ibadah/{ibadahId}/checkin
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request:**

```json
{
  "kode": "ABC23XYZ",
  "tanggalIbadah": "2026-05-19",
  "force": false
}
```

- `kode` — kode QR yang di-scan.
- `tanggalIbadah` — opsional. Kalau tidak diisi, default = hari ini.
- `force` — set `true` untuk override warning (occurrence yang ditiadakan).

**Response 200 (sukses):**

```json
{
  "success": true,
  "data": {
    "id": "ee44ff55-…",
    "ibadahId": "33333-…",
    "jemaatId": "ab12cd34-…",
    "tanggalIbadah": "2026-05-19",
    "status": "JOIN",
    "kode": "R7K2X9P3",
    "joinedAt": "2026-05-19T08:05:23.123Z",
    "jemaat": {
      "id": "ab12cd34-…",
      "namaLengkap": "Ari Christian",
      "fotoUrl": "/uploads/profiles/jemaat/ab12cd34.webp?v=1716185234567",
      "noHp": "+6282115678446"
    }
  },
  "meta": {
    "alreadyCheckedIn": false,
    "walkIn": true
  }
}
```

`walkIn=true` artinya jemaat belum reservasi sebelumnya; sistem auto-create reservasi dengan status JOIN.

**Response 200 (sudah check-in sebelumnya, idempotent):**

```json
{
  "success": true,
  "data": { /* row reservasi */ },
  "meta": {
    "alreadyCheckedIn": true,
    "walkIn": false
  }
}
```

Mobile app harus tampilkan toast info, bukan error.

**Response 403 (tidak berwenang scan):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Ari Christian tidak berwenang scan check-in ibadah \"Ibadah Minggu Pagi\". Hubungi admin untuk minta akses sebagai authorized scanner."
  }
}
```

**Response 404 (kode jemaat tidak ada):**

```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Kode jemaat \"ABC23XYZ\" tidak ditemukan." }
}
```

**Response 409 (occurrence ditiadakan, perlu force):**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Ibadah \"Ibadah Minggu Pagi\" pada 2026-12-25 sudah ditiadakan. Kirim ulang dengan force=true untuk tetap check-in."
  }
}
```

---

# 5. Event — List, Detail, Check-in

## 5.1 List event published

```
GET /admin/event?isPublished=true&page=1&limit=20
Authorization: Bearer <accessToken>
```

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "evt-111-…",
      "judul": "Retreat Pemuda 2026",
      "slug": "retreat-pemuda-2026",
      "ringkasan": "Retreat 3 hari di Puncak untuk pemuda.",
      "heroImageUrl": "/uploads/content/hero/event/evt-111.webp?v=1716185234567",
      "videoUrl": "https://youtube.com/watch?v=abc123",
      "tanggalMulai": "2026-08-15T00:00:00.000Z",
      "tanggalSelesai": "2026-08-17T00:00:00.000Z",
      "lokasi": "Wisma Cibubur, Puncak",
      "tipeBayar": "NOMINAL_TETAP",
      "nominal": "750000",
      "quotaPeserta": 50,
      "butuhKehadiran": true,
      "isPublished": true,
      "publishedAt": "2026-05-01T10:00:00.000Z",
      "sinode": { "id": "…", "nama": "ECC Indonesia" },
      "cabang": { "id": "…", "nama": "ECC Jakarta" },
      "pesertaCount": 23
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
}
```

**Notes:**

- `tipeBayar` enum: `GRATIS`, `NOMINAL_TETAP`, `NOMINAL_BEBAS`.
- `nominal` adalah Decimal string (untuk presisi finansial). Parse dengan `Number(nominal)` atau library decimal.
- `butuhKehadiran=true` → event punya scan check-in di hari H.

## 5.2 Detail event

```
GET /admin/event/{idOrSlug}
Authorization: Bearer <accessToken>
```

Bisa pakai ID UUID atau slug.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "evt-111-…",
    "judul": "Retreat Pemuda 2026",
    "slug": "retreat-pemuda-2026",
    "deskripsi": "## Tentang Retreat\n\nDetail lengkap...",
    "heroImageUrl": "/uploads/content/hero/event/evt-111.webp?v=…",
    "videoUrl": "https://youtube.com/watch?v=abc123",
    "tanggalMulai": "2026-08-15T00:00:00.000Z",
    "tanggalSelesai": "2026-08-17T00:00:00.000Z",
    "lokasi": "Wisma Cibubur, Puncak",
    "tipeBayar": "NOMINAL_TETAP",
    "nominal": "750000",
    "qrisImageUrl": "/uploads/content/event/qris/evt-111.webp?v=…",
    "bankNama": "BCA",
    "bankNomor": "1234567890",
    "bankAtasNama": "Yayasan ECC",
    "quotaPeserta": 50,
    "butuhKehadiran": true,
    "tags": ["youth", "retreat", "summer"],
    "isPublished": true,
    "author": { "id": "…", "jemaat": { "id": "…", "namaLengkap": "Ari Christian" } },
    "pesertaCount": 23
  }
}
```

## 5.3 Daftar peserta

User mobile daftarkan diri sebagai peserta event. (Catatan: endpoint admin sekarang yang dipakai — kalau mobile app dipakai untuk self-register, perlu endpoint public `/api/v1/event/*` yang belum di-build).

```
POST /admin/event/{eventId}/peserta
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request:**

```json
{
  "jemaatId": "ab12cd34-…",
  "nominalBayar": 750000,
  "catatan": "Ukuran kaos L"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "part-222-…",
    "eventId": "evt-111-…",
    "jemaatId": "ab12cd34-…",
    "status": "DAFTAR",
    "nominalBayar": "750000",
    "registeredAt": "2026-05-19T10:30:00.000Z"
  }
}
```

**Response 409 (quota penuh):**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Quota peserta 50 sudah penuh untuk event \"Retreat Pemuda 2026\"."
  }
}
```

## 5.4 Upload bukti transfer

Setelah transfer manual ke rekening event, jemaat upload bukti.

```
POST /admin/event/{eventId}/peserta/{participationId}/bukti
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

foto: <file>
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "part-222-…",
    "status": "MENUNGGU_VERIFIKASI",
    "buktiTransferUrl": "/uploads/content/event/bukti/part-222.webp?v=…",
    "paidAt": null
  }
}
```

Status auto-naik ke `MENUNGGU_VERIFIKASI`. Admin verify di portal → naik ke `BAYAR`.

## 5.5 Check-in event via scan QR jemaat

Sama pola dengan ibadah check-in. Volunteer event scan QR jemaat di hari H.

```
POST /admin/event/{eventId}/checkin
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request:**

```json
{
  "kode": "ABC23XYZ",
  "force": false
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "part-222-…",
    "status": "HADIR",
    "attendedAt": "2026-08-15T07:30:00.000Z",
    "jemaat": {
      "id": "…",
      "namaLengkap": "Ari Christian",
      "fotoUrl": "/uploads/profiles/jemaat/….webp?v=…"
    }
  },
  "meta": { "alreadyCheckedIn": false }
}
```

**Response 409 (belum bayar, paid event):**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Ari Christian belum melakukan pembayaran (status: DAFTAR). Approve bukti transfer dulu, atau kirim ulang dengan force=true untuk override."
  }
}
```

Admin bisa retry dengan `force=true` untuk override (mis. jemaat bayar cash on-the-spot).

---

# 6. Reservasi Ibadah (Mobile Scanner)

Endpoint `/api/v1/*` untuk mobile scanner app yang **tanpa login JWT** — pakai API key.

## 6.1 Lookup reservasi by kode

```
GET /api/v1/reservasi/by-kode/{kode}
X-API-Key: ecc_AB23xy7K_pQ8wRx2nT4mK6vL9yZ3bF7d
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "res-333-…",
    "kode": "R7K2X9P",
    "status": "RESERVE",
    "tanggalIbadah": "2026-05-19",
    "jemaat": {
      "id": "…",
      "namaLengkap": "Ari Christian",
      "fotoUrl": "/uploads/profiles/jemaat/….webp?v=…",
      "noHp": "+6282115678446"
    },
    "ibadah": {
      "id": "…",
      "nama": "Ibadah Minggu Pagi",
      "jamMulai": "08:00",
      "jamSelesai": "10:00"
    }
  }
}
```

## 6.2 Check-in via kode reservasi (legacy)

```
POST /api/v1/reservasi/checkin
X-API-Key: ecc_AB23xy7K_…
Content-Type: application/json
```

**Request:**

```json
{ "kode": "R7K2X9P" }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "res-333-…",
    "status": "JOIN",
    "joinedAt": "2026-05-19T08:05:23.123Z"
  }
}
```

## 6.3 Cancel reservasi

```
POST /api/v1/reservasi/cancel
X-API-Key: ecc_AB23xy7K_…
Content-Type: application/json
```

**Request:**

```json
{ "kode": "R7K2X9P" }
```

**Response 200:**

```json
{
  "success": true,
  "data": { "status": "CANCEL", "cancelledAt": "…" }
}
```

> **Catatan deprecation**: Flow ini pakai **kode reservasi** (unique per (jemaat, ibadah, tanggal)). Flow yang **direkomendasikan** sekarang adalah `POST /admin/ibadah/:id/checkin` dengan **kode jemaat** global (lihat section 4.3). Kode reservasi tetap support untuk backward-compat mobile app yang belum di-update.

---

# 7. News & Renungan (Content)

## 7.1 List news

```
GET /admin/news?isPublished=true&page=1&limit=10
Authorization: Bearer <accessToken>
```

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "news-444-…",
      "tipe": "NEWS",
      "judul": "Jadwal Ibadah Natal 2026",
      "slug": "jadwal-ibadah-natal-2026",
      "ringkasan": "Ibadah Natal dan Tahun Baru di seluruh cabang ECC.",
      "konten": "# Jadwal Ibadah Natal\n\n…",
      "heroImageUrl": "/uploads/content/hero/news/news-444.webp?v=…",
      "tags": ["natal", "jadwal"],
      "isPublished": true,
      "publishedAt": "2026-12-01T10:00:00.000Z",
      "viewCount": 423,
      "sinode": null,
      "cabang": null,
      "author": { "jemaat": { "namaLengkap": "Ari Christian", "fotoUrl": null } }
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 5, "totalPages": 1 }
}
```

## 7.2 Detail news/renungan (by ID atau slug)

```
GET /admin/news/{idOrSlug}
GET /admin/renungan/{idOrSlug}
```

Untuk renungan, response punya field tambahan: `tanggal` (tanggal renungan ditujukan) dan `ayatAlkitab`.

```json
{
  "success": true,
  "data": {
    "tipe": "RENUNGAN",
    "judul": "Pengharapan Baru",
    "tanggal": "2026-05-19",
    "ayatAlkitab": "Yeremia 29:11",
    "konten": "## Pengharapan Baru\n\nFirman Tuhan dalam Yeremia 29:11..."
  }
}
```

---

# 8. Cabang Info (untuk Mobile Profile / About)

## 8.1 Cabang detail dengan rekening

```
GET /admin/cabang/{id}
GET /admin/cabang/{id}/rekening
Authorization: Bearer <accessToken>
```

**Response (rekening):**

```json
{
  "success": true,
  "data": [
    {
      "id": "rek-555-…",
      "purpose": "Persembahan Umum",
      "bankNama": "BCA",
      "bankNomor": "1234567890",
      "bankAtasNama": "Yayasan ECC Jakarta",
      "qrisImageUrl": "/uploads/content/cabang/qris/rek-555.webp?v=…",
      "catatan": null,
      "isActive": true
    },
    {
      "id": "rek-556-…",
      "purpose": "Pembangunan",
      "bankNama": "Mandiri",
      "bankNomor": "9876543210",
      "bankAtasNama": "Yayasan ECC Jakarta",
      "qrisImageUrl": "/uploads/content/cabang/qris/rek-556.webp?v=…",
      "catatan": "Khusus pembangunan gedung baru",
      "isActive": true
    }
  ]
}
```

Mobile app bisa render screen "Persembahan" dengan multiple rekening + tampilkan QRIS yang sesuai.

---

# 9. File / Image URLs

Semua URL gambar relatif terhadap base URL backend. Contoh:

```
fotoUrl: "/uploads/profiles/jemaat/ab12cd34.webp?v=1716185234567"
```

Full URL = `${BASE_URL}${fotoUrl}` = `http://localhost:4100/uploads/profiles/jemaat/ab12cd34.webp?v=…`

| Pattern | Path |
|---|---|
| Foto jemaat | `/uploads/profiles/jemaat/{jemaatId}.webp?v=…` |
| Foto user (auth avatar) | `/uploads/profiles/user/{userId}.webp?v=…` |
| Hero news/renungan | `/uploads/content/hero/{news\|renungan}/{kontenId}.webp?v=…` |
| Hero event | `/uploads/content/hero/event/{eventId}.webp?v=…` |
| QRIS event | `/uploads/content/event/qris/{eventId}.webp?v=…` |
| Bukti transfer event | `/uploads/content/event/bukti/{participationId}.webp?v=…` |
| QRIS rekening cabang | `/uploads/content/cabang/qris/{rekeningId}.webp?v=…` |

`?v=<timestamp>` adalah cache buster — saat file di-update, query string berubah, browser/app auto-reload.

Semua file di-serve sebagai WebP (lossy quality 82, max dimension 1024/1600/2000 tergantung jenis).

---

# 10. QR Code Format (untuk Scanner)

Mobile scanner app perlu decode QR code. Format yang dipakai:

| QR Source | Content | Endpoint check-in |
|---|---|---|
| **Kartu QR Jemaat** (statis, satu kartu untuk semua acara) | 8 char alphanumeric upper (mis. `ABC23XYZ`) | `/admin/ibadah/{id}/checkin` atau `/admin/event/{id}/checkin` |
| **QR Reservasi** (per reservasi, legacy) | 8 char alphanumeric upper (mis. `R7K2X9P`) | `/api/v1/reservasi/checkin` |

**Distinction**: keduanya 8 char alphanumeric. Mobile app harus tahu konteks (sedang di mode check-in ibadah dengan kode jemaat, atau scan kode reservasi mobile-only).

QR image untuk kartu jemaat di-generate via `api.qrserver.com` di portal — mobile app bisa pakai pattern sama:

```
https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=ABC23XYZ
```

Atau generate offline di mobile dengan library lokal (mis. `qrcode_flutter`, `react-native-qrcode-svg`).

---

# 11. Practical Patterns

## Token refresh interceptor

Pattern untuk mobile app (Dart/Kotlin/Swift):

```typescript
// Pseudocode
async function apiCall(path, options) {
  let res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
  });

  // Token expired? Try refresh once.
  if (res.status === 401) {
    const refreshed = await refreshAccessToken(refreshToken);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      refreshToken = refreshed.refreshToken;
      saveTokensSecure({ accessToken, refreshToken });
      // Retry original request
      res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
      });
    } else {
      // Refresh failed → user harus login ulang
      redirectToLogin();
    }
  }

  return res;
}
```

## Idempotent check-in handling

Saat scan QR berhasil tapi `meta.alreadyCheckedIn=true`, mobile app tampilkan **info biru** (bukan error), supaya UX tidak terlihat seperti gagal:

```typescript
if (response.success) {
  if (response.meta?.alreadyCheckedIn) {
    showToast(`${name} sudah check-in sebelumnya`, 'info');
  } else if (response.meta?.walkIn) {
    showToast(`${name} berhasil check-in (walk-in)`, 'success');
  } else {
    showToast(`${name} berhasil check-in`, 'success');
  }
}
```

## Offline scanner queue

Untuk lokasi event yang signal jelek, mobile app bisa antri scan offline:

1. Scan QR → simpan `{ kode, eventId/ibadahId, tanggalIbadah, scannedAt }` di local DB.
2. Background worker retry kirim ke server saat online.
3. Backend idempotent — duplicate scan tidak harm (mengembalikan `alreadyCheckedIn=true`).

## Polling new events

Untuk dashboard mobile yang refresh data:

- Cache list response dengan key `[endpoint, params]` di local DB.
- Pull-to-refresh → re-fetch dan invalidate cache.
- Tampilkan timestamp last-refresh: "Diperbarui 2 menit lalu".

## Image loading

```typescript
// Cache busting otomatis lewat ?v=… di URL, tidak perlu manual.
<img src={`${BASE_URL}${fotoUrl}`} />
```

Untuk caching, biarkan browser/OS-level cache handle. Karena `?v=` berbeda saat foto di-update, cache otomatis refresh.

---

# 12. Rate Limits

Endpoint punya rate limit untuk cegah abuse:

| Endpoint | Limit |
|---|---|
| `/auth/otp/request` | 3 request per 5 menit per IP |
| `/auth/otp/verify`, `/auth/face/login` | 5 attempt per 5 menit per IP |
| `/auth/refresh` | 30 per menit per IP |
| `/admin/*` (after auth) | 100 per menit per user |
| `/api/v1/*` | 60 per menit per API key |

Response 429:

```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Terlalu banyak permintaan, coba lagi nanti"
  }
}
```

Header `Retry-After: <seconds>` di response — mobile app harus respect ini.

---

# 13. Environment URLs

| Variable | Development | Production |
|---|---|---|
| `BASE_URL` | `http://localhost:4100` | `https://core-api.eccchurch.global` |
| `WEB_URL` (portal) | `http://localhost:3100` | `https://portal.eccchurch.global` |
| Swagger spec UI | `{BASE_URL}/docs` | `{BASE_URL}/docs` |

Untuk staging atau preview, biasanya `https://staging-core-api.eccchurch.global`. Konfirmasi dengan DevOps.

---

# 14. Spec Lengkap

OpenAPI 3.0 spec auto-generated tersedia di:

```
{BASE_URL}/docs
```

Browser-based Swagger UI dengan "Try it out" untuk live test. Bisa export ke JSON / import ke Postman / Insomnia / Bruno.

Setiap endpoint admin punya gembok di Swagger UI — klik untuk paste JWT, lalu Try it out akan otomatis kirim dengan auth.

---

# 15. Support

- Dokumen ini ada di repo: `docs/mobile-api-guide.md`
- Spec lengkap auto-update saat backend deploy.
- Pertanyaan: contact IDEA dev team atau buka issue di repo.
