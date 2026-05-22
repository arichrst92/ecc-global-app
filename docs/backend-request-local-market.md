# Backend Handoff: Local Market feature (Movement)

**Untuk**: Mobile dev (Ari Christian)
**Dari**: Tim Backend ECC
**Tanggal**: 2026-05-22
**Priority**: 🟢 **NORMAL** — fitur baru
**Status**: ✅ **READY** — endpoints + schema deployed, awaiting mobile UI

**Update 2026-05-22 (revision a)**:
- Tambah field `logoUrl` (square 512x512 auto-crop) — endpoint POST/DELETE `:id/logo`.
- PDF upload max diturunkan dari 10 MB ke **5 MB**.
- Migration tambahan: `20260522120000_local_business_logo`.

## TL;DR

**Local Market**: direktori UMKM/bisnis jemaat. Setiap jemaat boleh punya
multiple bisnis. Owner CRUD lewat mobile, browse public per-cabang lewat
mobile, portal admin read-only + delete moderasi.

## Schema (Prisma → DB)

```prisma
model LocalBusiness {
  id                String
  ownerJemaatId     String   // FK Jemaat (Cascade on delete)
  nama              String
  deskripsi         String?
  heroImageUrl      String?  // upload terpisah, image-webp (banner, max 1600px)
  logoUrl           String?  // upload terpisah, square 512x512 webp (auto-crop center)
  industri          String?  // free text (UI boleh datalist)
  tipeBisnis        TipeBisnis  // enum B2C | B2B | B2B2C
  isOnline          Boolean  @default(false)
  lokasi            String?  // text bebas
  websiteUrl        String?
  whatsappUrl       String?  // mis. https://wa.me/<no>
  companyProfileUrl String?  // upload terpisah, PDF passthrough
  socialLinks       Json?    // array of { platform: string, url: string }, max 10
  isActive          Boolean  @default(true)  // owner toggle untuk hide di browse
  createdAt, updatedAt
}
enum TipeBisnis { B2C  B2B  B2B2C }
```

`socialLinks` di-store sebagai Json array of `{platform, url}` objects — UI
bisa rendering icon per-platform tanpa junction table. PATCH replace
**entire array** (tidak merge).

## Endpoint mobile

Semua pakai **JWT Bearer** (`req.user.jemaatId` = owner / caller).

### A. CRUD bisnis saya — `/admin/me/businesses/*`

#### 1. List bisnis saya (semua, termasuk nonaktif)

```http
GET /admin/me/businesses
```

Response: `{ success, data: [LocalBusiness with owner...] }`. Sorted by
isActive desc, createdAt desc.

#### 2. Create

```http
POST /admin/me/businesses
{
  "nama": "Warung Budi",
  "deskripsi": "Makanan rumahan, halal",
  "industri": "Kuliner",
  "tipeBisnis": "B2C",
  "isOnline": false,
  "lokasi": "Jl. Mawar No 12, Jakarta",
  "websiteUrl": "https://warungbudi.id",
  "whatsappUrl": "https://wa.me/6281234567890",
  "socialLinks": [
    { "platform": "Instagram", "url": "https://instagram.com/warungbudi" },
    { "platform": "TikTok", "url": "https://tiktok.com/@warungbudi" }
  ]
}
```

Validation:
- `nama` 2-255 chars, required
- `deskripsi` opsional max 2000 chars
- `tipeBisnis` enum, required
- `industri` opsional max 100 chars
- `lokasi` opsional max 500 chars
- `websiteUrl` / `whatsappUrl` / `socialLinks[].url` harus URL valid
- `socialLinks` max 10 entries, `platform` 1-50 chars

Response: 201 + `{ success, data: LocalBusiness with owner }`.

#### 3. Detail (owner-only)

```http
GET /admin/me/businesses/:id
```

403 kalau bukan owner.

#### 4. Update (owner-only)

```http
PATCH /admin/me/businesses/:id
{ ...field2x yg diubah... }
```

Field semua opsional, kirim hanya yang berubah. `socialLinks` kalau dikirim
**replace entire array** — UI rebuild list dulu sebelum PATCH.

`isActive` toggle untuk hide/show di browse. Tidak delete data.

#### 5. Delete (owner-only)

```http
DELETE /admin/me/businesses/:id
```

Hard delete + cleanup files (hero + profile PDF) di server.

### B. File uploads

#### Hero banner image

```http
POST /admin/me/businesses/:id/hero
Content-Type: multipart/form-data
<file field, name bebas: foto/file/image/banner/...>
```

Accept JPG/PNG/WEBP/HEIC (mobile camera). Auto resize → webp max **1600px**
(fit:'inside', preserve aspect ratio). Max upload **5 MB**.
Response: `{ success, data: { id, heroImageUrl } }`.

```http
DELETE /admin/me/businesses/:id/hero    # clear banner
```

#### Logo (square)

```http
POST /admin/me/businesses/:id/logo
Content-Type: multipart/form-data
<file field, name bebas: foto/file/image/logo/...>
```

Accept image apa saja. **Auto-crop center jadi square 512x512 webp** via
sharp fit:'cover' — UI mobile boleh upload non-square, server akan
center-crop. Max upload 5 MB.
Response: `{ success, data: { id, logoUrl } }`.

```http
DELETE /admin/me/businesses/:id/logo    # clear logo
```

UX hint: kalau punya logo, mobile bisa overlay di sudut hero atau pakai
sebagai avatar bisnis di card list. Portal admin sudah pakai pattern logo
overlay di card grid.

#### Company profile PDF

```http
POST /admin/me/businesses/:id/profile-pdf
Content-Type: multipart/form-data
<file field name bebas, file harus .pdf / application/pdf>
```

Max **5 MB**. PDF passthrough (tidak ada konversi). Response:
`{ success, data: { id, companyProfileUrl } }`.

```http
DELETE /admin/me/businesses/:id/profile-pdf    # clear PDF
```

### C. Browse Local Market — `/admin/me/local-market/*`

#### 1. List public (filter by cabang/industri/tipe/search)

```http
GET /admin/me/local-market
  ?cabangId=<uuid>            (filter cabang owner)
  &industri=Kuliner
  &tipeBisnis=B2C
  &isOnline=true|false
  &search=warung              (di nama/deskripsi/industri/owner.nama)
  &page=1&limit=20
  &sortBy=createdAt&sortOrder=desc
```

Hanya tampilkan `isActive=true`. Default sort = createdAt desc (newest
first). Pagination standar.

Response: `{ success, data: [LocalBusiness with owner], meta: {...} }`.

#### 2. Detail public

```http
GET /admin/me/local-market/:id
```

Kalau `isActive=false` dan caller bukan owner → 404 (sembunyikan).

## Suggested mobile UX

### Owner flow (Profile → My Businesses)

1. **My Businesses tab** di profile setting / quick-access.
2. List bisnis owner (semua, termasuk nonaktif dengan badge).
3. Button "+ Tambah Bisnis" → form create.
4. Tap bisnis → detail screen dengan tab Edit / Hero / Profile PDF / Toggle Aktif.
5. Form fields:
   - Nama, Deskripsi (textarea), Industri (text + suggested datalist),
     Tipe Bisnis (radio: B2C/B2B/B2B2C), Online toggle, Lokasi (text),
     Website, WhatsApp.
   - Social Media: list dynamic, tap "+ Tambah" → input platform name + URL,
     remove icon per row. Submit kirim entire array.
6. Upload hero, **logo**, & PDF terpisah (post-create) supaya UX tidak block.
   Suggested order: create form → tap hasil → tab Logo/Hero/PDF untuk upload.
7. Delete: confirmation modal "Hapus permanen?".

### Browse flow (Tab Movement → Local Market)

1. **Local Market tab** di Movement (atau standalone tab).
2. Default tampilkan bisnis di cabang user, dengan switcher "Cabang lain".
3. Filter chip row: All / Online / Offline + filter modal (tipe, industri).
4. Search bar.
5. Card grid: hero image dengan **logo overlay** di sudut, nama, badge tipe,
   industri, owner avatar+nama. (Kalau ga ada hero, fallback ke logo besar
   atau placeholder; kalau ga ada logo, cuma hero/placeholder.)
6. Tap card → detail screen: hero, deskripsi, lokasi, links (website, WA
   tap-to-chat, social media open in browser/app), download PDF profile,
   "Lihat owner" → public profile jemaat.

## Portal admin — sudah selesai

- Sidebar **Movement → Local Market**
- `/dashboard/local-business` — grid view dengan filter cabang/tipe/industri/aktif/search
- Detail modal dengan semua links + delete moderasi
- RBAC: menuKey `local-business`, default Fulltimer full access via migration backfill

## Migration deployment

Migrations:
- `20260522110000_movement_local_business` — base table + enum + RBAC.
- `20260522120000_local_business_logo` — `ALTER TABLE ADD COLUMN logo_url TEXT`.

```bash
cd packages/database
DATABASE_URL=... npx prisma migrate deploy
# Run kedua migration secara berurutan (auto by filename order).
```

## Action items mobile

- [ ] `src/types/localBusiness.ts` — `LocalBusiness`, `SocialLink`, `TipeBisnis` types
- [ ] `src/api/businesses.ts` — owner CRUD + upload helpers (FormData)
- [ ] `src/api/localMarket.ts` — browse + detail
- [ ] `src/hooks/useMyBusinesses.ts` — owner list
- [ ] `src/hooks/useLocalMarket.ts` — paginated browse dengan filter
- [ ] `app/profile/businesses/index.tsx` — owner list + add button
- [ ] `app/profile/businesses/[id].tsx` — owner detail/edit + upload logo/hero/PDF tabs
- [ ] `app/profile/businesses/new.tsx` — create form
- [ ] Logo upload UX: image picker → preview (square crop preview optional,
      server bakal crop center) → upload
- [ ] `app/market/index.tsx` — browse list + filter
- [ ] `app/market/[id].tsx` — public detail
- [ ] Tab entry / Movement section link

## Catatan implementasi

- **TZ-safe**: timestamps full datetime, mobile pakai `Date.toLocaleString()`.
- **WA URL format**: simpan as `https://wa.me/<nomor_e164_tanpa_plus>` untuk
  konsistensi. Validate URL format saja, bukan WA-specific.
- **Industri** free text. Untuk UX consistency mobile boleh kasih preset
  suggestion (Kuliner, F&B, Fashion, Tech/IT, Konsultan, Jasa, Retail, ...)
  tapi user boleh ketik bebas.
- **Privacy**: bisnis row tidak ekspose `noHp` owner. WhatsApp URL adalah
  yang owner manually input — boleh nomor pribadi atau nomor bisnis.
  Jangan derive dari `Jemaat.noHp` di FE.
- **Image rotation**: hero image di-rotate via sharp `.rotate()` sebelum
  resize → EXIF auto-orientation di-handle backend, mobile tidak perlu
  rotate manual.

---

Ready untuk integrasi. Tanya kalau ada edge case yang belum ke-cover.
