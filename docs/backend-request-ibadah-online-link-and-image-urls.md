# BE Request — Konfirmasi `linkOnline` ibadah + image URL absolute

**Owner:** Mobile (Ari)
**Status:** ✅ **RESOLVED** (2026-05-24) — A: `linkStream` rename ke `linkOnline` + include di 4 endpoint; B: image URL = relative path (mobile SafeImage handle prepend, sudah aligned)
**Date:** 2026-05-24

## Konteks

Dua issue user-facing terus muncul yang root cause-nya BE-mobile contract belum align:

1. **Ibadah online button tidak muncul** padahal user bilang "link sudah dimasukkan di admin portal". Mobile gate button dengan `isOnline === true && linkOnline` — kalau BE tidak return field `linkOnline` (atau pakai nama lain), button selalu hidden.
2. **Gambar event/renungan/news/QRIS tidak muncul di guest mode**. Mobile `SafeImage` punya auto-prepend base URL untuk relative path + fallback placeholder kalau load gagal. Masih perlu konfirmasi bentuk URL yang BE return.

## Yang dimohon

### A. Ibadah link online — konfirmasi schema

Mobile saat ini expect (di `src/types/ibadah.ts`):

```ts
export type IbadahListItem = {
  // ...
  isOnline: boolean;
  linkOnline?: string | null;  // ← URL Zoom/YouTube Live/Meet
  // ...
};

export type IbadahOccurrence = {
  // ...
  isOnline: boolean;
  linkOnline?: string | null;
  // ...
};
```

Endpoint yang konsumsi field ini di mobile:

- `GET /admin/ibadah` (list) — dipakai di halaman Ibadah list
- `GET /admin/ibadah/calendar` (occurrence range) — dipakai di **dashboard "Ibadah Hari Ini"**
- `GET /admin/ibadah/:id` (detail) — dipakai di Ibadah Detail
- `GET /public/ibadah/calendar` (guest) — dipakai di Guest Ibadah list

**Mohon konfirmasi:**

1. Apakah Prisma model `Ibadah` punya kolom untuk URL stream online? Kalau ya, nama field-nya apa? Kandidat:
   - `linkOnline` (preferensi mobile)
   - `urlOnline`
   - `linkStream`
   - `streamUrl`
   - `linkYoutube` / `linkZoom`
   - Lainnya?
2. Apakah field ini di-return di **semua 4 endpoint** di atas, atau hanya di detail?
3. Apakah BE sudah deploy field ini ke prod? (User bilang "link sudah tersedia di backend" tapi mobile tidak terima.)

**Rekomendasi:** Standardize ke `linkOnline` (sesuai naming pattern mobile + i18n key `ibadah.access_online`). Include di list + calendar + detail + public/calendar — semua endpoint yang return ibadah row.

### B. Image URL format — konfirmasi absolute vs relative

Mobile `SafeImage` (di `src/components/ui/SafeImage.tsx`) handle both:

- Absolute (`https://...`) → langsung pakai
- Relative (`/uploads/...` atau `uploads/...`) → auto-prepend `EXPO_PUBLIC_API_BASE_URL`

Field yang affected:

| Endpoint | Field | Type |
|---|---|---|
| `/public/event` | `heroImageUrl` | `string \| null` |
| `/public/event/:slug` | `heroImageUrl`, `qrisImageUrl` | `string \| null` |
| `/public/news` | `heroImageUrl` | `string \| null` |
| `/public/news/:slug` | `heroImageUrl` | `string \| null` |
| `/public/cabang/:id/rekening` | `qrisImageUrl` | `string \| null` |

**Mohon konfirmasi:**

1. Apakah BE return URL sebagai **absolute** (`https://api.eccchurch.global/uploads/...`) atau **relative** (`/uploads/...`)? Kedua format OK untuk mobile, tapi konsistensi penting supaya tidak campur.
2. Untuk file di-storage di S3 / object storage external, apakah URL bisa diakses tanpa signed token? Atau pakai pre-signed URL?
3. Apakah ada perbedaan format URL antara `/admin/*` (auth) vs `/public/*` (guest) endpoint? Kalau ya, mohon konsisten.
4. Sample response payload untuk verifikasi:
   ```bash
   curl https://api.eccchurch.global/public/event?limit=3 | jq '.data[0].heroImageUrl'
   curl https://api.eccchurch.global/public/news?limit=3 | jq '.data[0].heroImageUrl'
   curl https://api.eccchurch.global/public/cabang/<id>/rekening | jq '.rekening[0].qrisImageUrl'
   ```
   Bisa share output (atau screenshot Postman) supaya mobile bisa verify field shape sama dengan asumsi sekarang?

### C. Side-by-side check: pastikan field name persis

Kasus identik dulu kemarin: BE `/public/news/:slug` return `tanggal` field tapi mobile `NewsItem` expect `publishedAt`. Fix di mobile dengan explicit field mapping di hook layer. Mau hindari pattern serupa di endpoint lain — better confirm upfront.

Mohon share **actual JSON response** untuk:

```bash
GET /admin/ibadah/calendar?from=2026-05-24&to=2026-05-30   # 1 occurrence
GET /admin/ibadah/<id>                                       # 1 detail
GET /public/event/<slug>                                     # 1 detail
GET /public/news/<slug>                                      # 1 detail
GET /public/cabang/<id>/rekening                             # 1 rekening
```

Cukup sample 1 row per endpoint dengan field yang lengkap (termasuk yang null). Bisa via Slack atau attach response JSON ke doc ini.

## Mobile-side mitigation (sudah dilakukan)

Sambil tunggu BE response, mobile akan:

1. Add defensive **multi-field fallback** untuk ibadah online link — coba `linkOnline`, fallback ke `urlOnline`, `linkStream`, dst. Kalau BE pakai nama beda, app tetap jalan.
2. SafeImage **sudah** punya placeholder fallback + relative URL prepend.
3. Add debug log di dev untuk print actual `heroImageUrl` value yang diterima — bantu diagnose kalau URL format tidak expected.

## Action items untuk BE

- [x] Confirm Prisma model field name untuk ibadah online link
- [x] Confirm field di-include di semua 4 endpoint (list, calendar, detail, public/calendar)
- [x] Share sample JSON response untuk 5 endpoint di atas
- [x] Confirm image URL format (absolute vs relative) + konsisten across endpoint

---

## Backend Response (2026-05-24)

### A. Ibadah `linkOnline` — RESOLVED

**Sebelumnya:** Prisma field name `linkStream` (DB column `link_stream`). Mobile expect `linkOnline`. **Mismatch confirmed.**

**Fix applied (2026-05-24):**
1. **Rename Prisma field** `linkStream` → `linkOnline` di `Ibadah` model. DB column tetap `link_stream` via `@map("link_stream")` — **NO migration needed**, hanya code rename.
2. **Update reference di codebase:**
   - `packages/shared-types/src/schemas/ibadah.ts` — zod schema + refine validation
   - `apps/portal/src/app/dashboard/ibadah/[id]/page.tsx` — display + link href
   - `apps/portal/src/lib/resources/ibadah-config.tsx` — form field config
3. **Include `linkOnline` di response semua endpoint:**

| Endpoint | Sebelum | Sesudah |
|---|---|---|
| `GET /admin/ibadah` (list) | Include via spread `...rest` named `linkStream` | Sekarang named `linkOnline` |
| `GET /admin/ibadah/calendar` | **Missing** | ✅ Added di select |
| `GET /admin/ibadah/:id` | Include via `findUnique` default (named `linkStream`) | Sekarang named `linkOnline` |
| `GET /public/ibadah/calendar` | **Missing** | ✅ Added di select |

**Sample response setelah fix:**

```bash
curl https://api.eccchurch.global/admin/ibadah/calendar?from=2026-05-24&to=2026-05-31
```

```json
{
  "success": true,
  "data": [
    {
      "ibadahId": "uuid",
      "tanggal": "2026-05-26",
      "nama": "Ibadah Minggu Pagi",
      "jamMulai": "08:00",
      "jamSelesai": "10:00",
      "cabang": { "id": "...", "nama": "ECC Jakarta" },
      "kategoriIbadah": { "id": "...", "nama": "Ibadah Umum" },
      "tipeJadwal": "WEEKLY",
      "lokasi": "Aula Utama",
      "isOnline": true,
      "linkOnline": "https://youtube.com/live/abc123"
    }
  ]
}
```

```bash
curl https://api.eccchurch.global/public/ibadah/calendar?from=2026-05-24
```

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tanggal": "2026-05-26",
      "jam": "08:00",
      "jamSelesai": "10:00",
      "judul": "Ibadah Minggu Pagi",
      "cabang": { "id": "...", "nama": "ECC Jakarta" },
      "kategori": { "id": "...", "nama": "Ibadah Umum" },
      "lokasi": "Aula Utama",
      "isOnline": true,
      "linkOnline": "https://youtube.com/live/abc123"
    }
  ]
}
```

**Mobile action:**
- Update `IbadahListItem.linkOnline` type — sudah aligned ✓
- Update `IbadahOccurrence.linkOnline` — sudah aligned ✓
- Hapus defensive multi-field fallback (mitigation) — sekarang single source `linkOnline`

### B. Image URL format — Confirmed: RELATIVE PATH

**Format yang BE return:** **relative path** `/uploads/...` (TANPA host prefix). Konsisten di semua endpoint.

**Reason:** flexibility — kalau pindah CDN / domain / subdomain di future, tidak perlu rebuild backend. Mobile + portal yang concat dengan base URL.

**Affected fields (semua relative):**
- `Ibadah.lokasi` — text bebas, bukan URL
- `Event.heroImageUrl`, `Event.qrisImageUrl` — relative `/uploads/event/hero/...webp`
- `Konten.heroImageUrl` (news + renungan) — relative `/uploads/content/hero/news/...webp`
- `CabangRekening.qrisImageUrl` — relative `/uploads/qris/...webp`
- `LocalBusiness.heroImageUrl`, `LocalBusiness.logoUrl`, `LocalBusiness.companyProfileUrl` — relative
- `Jemaat.fotoUrl` — relative

**Sample response:**

```bash
curl https://api.eccchurch.global/public/event?limit=1 | jq '.data[0].heroImageUrl'
# "/uploads/event/hero/abc-uuid.webp"

curl https://api.eccchurch.global/public/news?limit=1 | jq '.data[0].heroImageUrl'
# "/uploads/content/hero/news/abc-uuid.webp?v=1779527625597"

curl https://api.eccchurch.global/public/cabang/<id>/rekening | jq '.data.rekening[0].qrisImageUrl'
# "/uploads/qris/abc-uuid.png"
```

**Storage detail:**
- File saved di-VPS filesystem path `/var/www/ecc-core-platform/uploads/`
- Nginx serve langsung dari path itu via location block `/uploads/`
- TIDAK pakai S3 / object storage external (untuk MVP, single VPS deployment)
- TIDAK pakai signed URL — semua public read (auth gating di filename UUID-based, predictable URL ≠ leak data)

**Mobile SafeImage current behavior — sudah aligned:**
- Detect relative path (start dengan `/uploads/` atau `uploads/`)
- Auto-prepend `EXPO_PUBLIC_API_BASE_URL` (= `https://api.eccchurch.global`)
- Hasil URL final: `https://api.eccchurch.global/uploads/event/hero/abc.webp`
- Cache 7d (Nginx header `Cache-Control: public, immutable`)

**TIDAK ada perbedaan format antara `/admin/*` vs `/public/*`** — sama-sama relative path.

### C. Side-by-side field check — sample responses

**1. `GET /admin/ibadah/calendar?from=2026-05-24&to=2026-05-30`** — lihat A di atas

**2. `GET /admin/ibadah/:id`** — full detail dengan petugas:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "cabangId": "uuid",
    "kategoriIbadahId": "uuid",
    "nama": "Ibadah Minggu Pagi",
    "tipeJadwal": "WEEKLY",
    "tanggalMulai": "2026-01-04T00:00:00.000Z",
    "hari": "MINGGU",
    "jamMulai": "08:00",
    "jamSelesai": "10:00",
    "lokasi": "Aula Utama",
    "isOnline": true,
    "linkOnline": "https://youtube.com/live/abc123",
    "deskripsi": "Ibadah utama jemaat",
    "isActive": true,
    "isPublic": true,
    "createdAt": "...",
    "updatedAt": "...",
    "cabang": { ...full cabang object },
    "kategoriIbadah": { ...full kategori },
    "ibadahPelayanan": [ ...with petugas array ],
    "petugas": [ ...flattened array ]
  }
}
```

**3. `GET /public/event/:slug`** — lihat detail di backend-request-public-event-detail.md section "Response"

**4. `GET /public/news/:slug`** — lihat detail di backend-request-public-content-news-renungan.md

**5. `GET /public/cabang/:id/rekening`** — sudah include `qrisImageUrl: string | null` (relative path)

### Date field naming clarification

Berkait kasus dulu (`tanggal` vs `publishedAt` di news):
- `Konten.publishedAt` di DB
- Public news/renungan endpoint return field **`tanggal`** = `publishedAt` value (atau `tanggal` field di renungan kalau ada — fallback chain)
- Reason: mobile-friendly naming, news lebih natural "tanggal" daripada "publishedAt"
- Renungan return `tanggal` = `tanggal` field langsung (di Konten model ada kolom `tanggal` khusus renungan), atau `publishedAt` fallback

Konsisten di semua public content endpoint: field **`tanggal`** untuk display tanggal yang ditampilkan ke user.

### Mobile mitigation cleanup (post-deploy)

Setelah deploy ini, mobile bisa:
1. **Hapus** multi-field fallback `linkOnline → urlOnline → linkStream → ...`. Single source: `linkOnline` saja.
2. **Keep** `SafeImage` auto-prepend behavior — masih relevan untuk relative path.
3. **Keep** placeholder fallback di SafeImage — defensive untuk broken file di disk.
4. **Hapus** debug log kalau sudah verify URL format match expected.

### Timeline

Deployed 2026-05-24 (bundled dengan public event detail batch). Tidak perlu migration DB — pure code rename + add field di response.
