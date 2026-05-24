# BE Request — Konfirmasi `linkOnline` ibadah + image URL absolute

**Owner:** Mobile (Ari)
**Status:** Pending BE response
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

- [ ] Confirm Prisma model field name untuk ibadah online link
- [ ] Confirm field di-include di semua 4 endpoint (list, calendar, detail, public/calendar)
- [ ] Share sample JSON response untuk 5 endpoint di atas
- [ ] Confirm image URL format (absolute vs relative) + konsisten across endpoint
