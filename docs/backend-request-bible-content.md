# Backend Request — Alkitab Content (TB LAI)

**Status**: ✅ **DECIDED 2026-05-21** — **Opsi B (bundle JSON di mobile asset)** dengan versi **TB + NKJV**, sumber data dari yukuku/androidbible. Tidak ada BE code change. Lihat section "Decision & Implementation Plan" di akhir doc untuk detail + licensing flag.

**Mobile context**:
- Fitur Alkitab di-ship sebagai sample-only di MVP (lihat `app/src/data/bible-sample-content.ts`).
- 66 kitab + total bab di-hardcode di mobile (`app/src/data/bible-books.ts`).
- Bookmarks local-only, per-jemaatId, di mobile store (`app/src/stores/bible.store.ts`).

**Yang mobile butuhkan dari BE** (saat decision diambil):

## Opsi A — BE host full TB LAI content

```
GET /alkitab/:bookId/:bab
→ { bookId, bab, ayat: [{ nomor, teks }] }
```

Trade-off:
- ✅ Konten lengkap, bisa di-update kalau ada koreksi TB LAI
- ✅ Mobile bundle stays kecil (~1MB vs ~5MB kalau bundle full)
- ❌ Butuh data source TB LAI yang clear license — LAI restrictive untuk redistribusi digital
- ❌ Butuh seed data + DB storage

## Opsi B — Bundle full di mobile asset

- Download TB JSON sekali saat install (~5MB)
- Tidak perlu BE endpoint
- Trade-off: licensing same issue — kita harus dapat izin dari LAI atau pakai versi public domain

## Opsi C — Tetap sample-only (current state)

- ~17 pasal populer di-bundle (Mazmur 23, Yohanes 3, dll)
- Fokus: ayat hari ini + bookmark popular passages
- Pasal lain tampil placeholder dengan notice
- ✅ Zero licensing risk
- ❌ User experience terbatas, tidak bisa baca Alkitab penuh

## Saran mobile

Untuk MVP, kita ship dengan **Opsi C** (current). Sebelum jump ke A atau B, perlu:
1. Klarifikasi legal/lisensi dengan LAI (apa boleh redistribute TB di app gereja non-komersial?)
2. Atau cari versi alternatif (BIS, AYT, MILT yang lebih permissive)

Begitu legal clear, mobile bisa adopt endpoint atau bundle asset dengan minimal refactor — hooks `getSampleChapter` tinggal di-replace dengan fetch.

## Endpoint extension (kalau Opsi A diambil)

```
GET /alkitab/books
→ List 66 kitab (mobile bisa skip karena sudah hardcode, tapi BE side-of-truth lebih baik)

GET /alkitab/verse-of-day
→ Server-curated verse of day (vs current client-side rotation)

GET /alkitab/search?q=...
→ Full text search across kitab (deferred — not in MVP scope)

GET/POST/DELETE /alkitab/bookmarks
→ Server-side bookmark sync (currently local-only di mobile)
```

## Test cases mobile siap

- `useBibleStore.addBookmark()` + `removeBookmark()` + persistence per-jemaatId
- `getSampleChapter(ref)` returns curated content for 17 refs
- Chapter reader graceful fallback ke placeholder kalau no sample
- Font size persists (sm/md/lg/xl)
- Last-read auto-save saat mount chapter screen
- Prev/Next nav antar chapter dan antar book

---

**Decision needed**: tim BE/product/legal decide Opsi A/B/C. Mobile siap adopt apapun pilihannya — kode sudah modular.

---

# Backend Response — 2026-05-21

**Dari**: Tim Backend ECC (IDEA dev team)
**Status**: 🔵 **DEFERRED** — analysis only, **tidak ada code change**. Awaiting product owner + legal team approval.

## Ringkasan

Request ini bukan straight engineering work — **gate utamanya legal/licensing**, bukan implementation. BE bisa serve Alkitab content (Opsi A) atau provide download (Opsi B) **kapan saja** kalau sudah ada sumber data yang clear license. Tanpa itu, semua kerja BE mubazir.

BE rekomendasi **lanjut Opsi C sampai legal clear**, sambil persiapan minimum supaya migrasi ke A/B cepat saat go-ahead.

## BE perspective per opsi

### Opsi A — BE host full content + API

**Effort BE**:
- Schema + migration: `Alkitab`, `Kitab`, `Pasal`, `Ayat` tables → 1 hari
- Seed pipeline (TB JSON → Postgres batch insert) → 1 hari
- 4 endpoint baru (`/alkitab/books`, `/alkitab/:bookId/:bab`, verse-of-day, search) → 1.5 hari
- Caching layer (Redis atau in-memory) → Alkitab read-only, cache friendly → 0.5 hari
- Bookmark sync (POST/GET/DELETE) → 0.5 hari
- Docs + tests → 0.5 hari

**Total**: ~5 hari sprint.

**Storage cost**: full TB LAI ~5MB JSON / ~10MB Postgres dengan index. Negligible.

**Bandwidth cost**: per-chapter fetch ~5-20KB. 1000 active reader × 10 chapter/hari = ~150 MB/hari → ~5 GB/bulan. Acceptable.

**Pro:**
- ✅ Single source of truth
- ✅ Bisa update koreksi typo / formatting
- ✅ Verse of day server-curated (vs random client)
- ✅ Search across kitab feasible
- ✅ Bookmark sync cross-device

**Con:**
- ❌ Mobile UX butuh online (atau cache aggressive di mobile)
- ❌ Licensing gate — kalau LAI tidak izinkan API distribution, BE tidak boleh host
- ❌ Performance critical — kalau API lambat, baca jadi annoying

### Opsi B — Bundle full di mobile asset

**Effort BE**: ~0 (cuma host static file 1x untuk download).

**Effort mobile**: 1-2 hari (download + AsyncStorage / SQLite cache + offline-first reader).

**Pro:**
- ✅ Offline-first by default
- ✅ Performa instant (no network)
- ✅ Zero BE cost
- ✅ Mobile dev iterate cepat (no API contract)

**Con:**
- ❌ Initial download ~5MB (acceptable di WiFi, painful di 3G)
- ❌ Update content butuh OTA update mobile (Expo OTA atau force re-download)
- ❌ Search index harus di-pre-build atau scan in-memory
- ❌ Bookmark sync tetap butuh BE endpoint kalau cross-device

### Opsi C — Sample-only (current state)

**Effort BE**: 0.

**Effort mobile**: sudah ship.

**Pro:**
- ✅ Zero licensing risk
- ✅ Zero infrastructure cost
- ✅ Fokus ke kitab + ayat populer (Mazmur 23, Yohanes 3, dll yang admin & jemaat sering rujuk di renungan)

**Con:**
- ❌ Tidak bisa baca penuh — keluhan user pasti muncul kalau buka pasal di luar 17 sample
- ❌ Long-term tidak sustainable kalau ECC marketing app sebagai "companion alkitab"

## Decision matrix untuk product/legal

| Pertanyaan | Decision dampak |
|---|---|
| Apakah LAI izinkan redistribute TB di app gereja? | Ya → Opsi A/B feasible. Tidak → cari alternative |
| Kalau LAI tidak izinkan, apakah ECC OK pakai versi lain? | Ya (BIS/AYT/MILT) → opsi A/B dengan versi alt. Tidak → stuck di C |
| Apakah app harus offline-capable? | Ya → Opsi B better. Tidak → Opsi A |
| Apakah user butuh search Alkitab? | Ya, langsung → Opsi A (server-side). Defer → Opsi B/C cukup |
| Budget bandwidth + DB cost? | Comfortable → Opsi A. Minimize → Opsi B |

## Alternative versi (public domain / permissive license)

Kalau LAI tidak izinkan TB, beberapa pilihan:

| Versi | License | Source |
|---|---|---|
| **AYT** (Alkitab Yang Terbuka) | CC BY-SA 4.0 — **paling permissive** | github.com/seven1m/open-bibles |
| **BIS** (Bahasa Indonesia Sehari-hari) | LAI © tapi commonly redistributed | Multiple sources |
| **MILT** (Masoretic Indonesian Literal Translation) | Free use untuk gereja | malachi.id |
| **WBTC** (World Bible Translation Center Indonesia) | Permissive | wbtc.org |

**Rekomendasi BE**: kalau LAI restrict, **AYT** paling clean (explicit CC BY-SA, sudah ada di public Bible API gateways seperti scripture.api.bible / bible.helloao.org).

## BE recommendation — pragmatic phased approach

**Fase saat ini (Q3 2026 launch)**: Tetap **Opsi C** + improve sample coverage.

Concrete actions yang BE+mobile bisa lakukan sekarang **tanpa legal blocker**:

1. **Expand sample dari 17 → 50 pasal** populer (Mazmur 23/27/91, Yohanes 1/3/14, Roma 8/12, dll). Effort mobile 1 hari kompilasi.
2. **Verse of the day server-curated** — BE bikin endpoint `GET /alkitab/verse-of-day` yang return ayat hari ini dari pool sample 50 pasal × ~30 ayat populer. Effort BE 0.5 hari.
3. **Bookmark server sync** untuk yang ada di sample — endpoint `/admin/me/bible-bookmarks` (CRUD), simpan reference saja (`bookId + bab + ayat`), tidak simpan content. Effort BE 0.5 hari.

Total effort interim: ~1 hari BE + 1 hari mobile. Improve UX tanpa licensing risk.

**Fase 2 (post legal clear)**: Jump ke Opsi A atau B sesuai keputusan.

## Questions untuk product owner + legal team

1. **Apakah ada kontak resmi LAI** yang bisa dihubungi untuk izin redistribusi?
2. **Apakah ECC mau pertimbangkan AYT** sebagai alternatif TB (lisensi clean, mendekati TB style)?
3. **Apakah Alkitab feature high priority** (akan jadi differentiator vs YouVersion / Sabda) atau secondary?
4. **Anggaran legal/admin** untuk follow-up LAI?
5. **Timeline target** kapan Alkitab full content harus live (kalau ada)?

## Triggers untuk un-defer

- ✅ Legal clear LAI (best case)
- ✅ Decision pakai AYT (clean alternative)
- ✅ Concrete user feedback "tidak bisa baca pasal X" frequent → trigger Opsi A/B
- ✅ Q4 2026 milestone review

## File yang BELUM berubah

**Penting**: code BE + mobile tidak di-modify. Patch ini analysis-only.

Saat product owner + legal approve direction, BE akan implement sesuai opsi. KB akan dapat patch entry baru dan file ini di-update ke RESOLVED.

## Action items

- [ ] **Product owner**: review 5 questions di atas, dialog dengan legal team
- [ ] **Legal team**: kontak LAI atau identify alternative version
- [ ] **Mobile + BE (opsional interim)**: implement "expand sample 50 pasal + verse-of-day endpoint + bookmark sync" — improve UX tanpa licensing risk
- [ ] **BE**: re-evaluate priority di sprint planning Q4 2026

---

*Status DEFERRED 2026-05-21. Awaiting product/legal decision sebelum implementation.*

---

# Decision & Implementation Plan — 2026-05-21 (Update)

**Decision**: pakai **Opsi B (bundle JSON di mobile asset)**, sumber data **yukuku/androidbible**, versi **TB (Terjemahan Baru)** + **NKJV (New King James Version)**.

## ⚠ Licensing flag — perlu attention dari product/legal

Sebelum proceed implementation, mohon **legal team verify** karena keduanya copyrighted:

### TB (Terjemahan Baru)
- **Copyright**: Lembaga Alkitab Indonesia (LAI) © 1974
- **Restrictive**: LAI strict untuk distribusi digital. Yukuku host TB di api.alkitab.app — kemungkinan punya **licensing arrangement spesifik dengan LAI**, tidak otomatis grant downstream right.
- **Risk untuk ECC**: kalau bundle TB tanpa izin LAI, risiko cease & desist (low probability tapi technically infringing).

### NKJV (New King James Version)
- **Copyright**: Thomas Nelson © 1982 (Nashville, USA)
- **Highly restrictive**: Thomas Nelson **sangat ketat** untuk free redistribution. Lisensi default mereka cuma allow penggunaan personal + quote terbatas (max 500 ayat di non-commercial publication, dengan attribution).
- **Risk untuk ECC**: bundle NKJV full text di app gereja Indonesia tanpa lisensi eksplisit Thomas Nelson = **high risk** copyright infringement. Yukuku/Quick Bible mungkin punya arrangement private, tapi tidak transferable ke ECC.

### Recommendation BE

1. **Cek arrangement yukuku** — kontak yukuku (via GitHub issues atau alkitab.app email) untuk konfirmasi:
   - Apakah TB yang mereka host punya lisensi LAI yang allow redistribute? (Sub-licensing OK?)
   - NKJV: apakah mereka punya lisensi Thomas Nelson yang allow distribusi via aplikasi lain?
2. **Alternative yang lebih aman**:
   - Ganti TB → **AYT** (CC BY-SA, no licensing risk)
   - Ganti NKJV → **WEB** (World English Bible, public domain) atau **KJV** (1611, public domain)
   - Kedua alternative free + tersedia di yukuku ecosystem

3. **Kalau tetap TB + NKJV**, sebaiknya:
   - Dapat izin tertulis dari LAI (untuk TB) dan Thomas Nelson (untuk NKJV)
   - Atau cari sub-license dari yukuku kalau mereka berkenan

**BE tidak block implementation** — flag licensing risk untuk awareness product/legal. Proceed dengan acknowledgment risiko.

---

## Implementation plan (mobile-only, no BE work)

Karena strategi bundle JSON di mobile asset:

### 1. Sumber data — yukuku/androidbible

Yukuku punya base URL `https://api.alkitab.app` dengan downloadable bible versions dalam format `.yes` (binary). Untuk convert ke JSON:

**Option 1 — Pakai community JSON repos**:
- Cari forks atau community projects yang sudah extract yukuku data ke JSON (mis. di GitHub search "alkitab json indonesia")
- Pro: zero parsing work
- Con: harus verify source quality + license trail

**Option 2 — Convert manual dari yukuku source**:
- Download `.yes` files dari yukuku version catalog
- Pakai converter tools dari yukuku Drive folder (link ada di README mereka)
- Atau implement YES2 binary parser sesuai docs/binary-formats.md di yukuku repo
- Convert → clean JSON
- Pro: full control quality
- Con: 1-2 hari extra work

**Option 3 — Open-bibles repo**:
- `github.com/seven1m/open-bibles` punya banyak versi dalam JSON-friendly format
- Cari TB + NKJV di sana
- Pro: clean source, license metadata included
- Con: TB/NKJV mungkin tidak ada — harus cek

**Rekomendasi**: cek Option 3 dulu, fallback ke Option 1, terakhir Option 2.

### 2. Format JSON yang disarankan

Per kitab, satu file JSON:

```json
{
  "version": "TB",
  "versionFullName": "Terjemahan Baru",
  "language": "id",
  "copyright": "© Lembaga Alkitab Indonesia 1974",
  "license": "all-rights-reserved (verify dengan LAI)",
  "books": [
    {
      "id": "GEN",
      "nama": "Kejadian",
      "namaSingkat": "Kej",
      "testament": "OT",
      "order": 1,
      "chapterCount": 50,
      "chapters": [
        {
          "bab": 1,
          "verses": [
            { "nomor": 1, "teks": "Pada mulanya Allah menciptakan langit dan bumi." },
            { "nomor": 2, "teks": "..." }
          ]
        }
      ]
    }
  ]
}
```

Size estimate per versi:
- TB: ~5MB raw JSON, ~1.5MB gzipped
- NKJV: ~5MB raw JSON, ~1.5MB gzipped
- Total bundle: ~3MB gzipped (acceptable untuk initial app install via OTA)

### 3. Mobile loader pattern (rekomendasi)

```typescript
// app/src/data/bible/index.ts
import tbData from './tb.json';
import nkjvData from './nkjv.json';

const VERSIONS = { TB: tbData, NKJV: nkjvData } as const;

export type BibleVersionCode = keyof typeof VERSIONS;

export function getChapter(
  versionCode: BibleVersionCode,
  bookId: string,
  bab: number,
) {
  const version = VERSIONS[versionCode];
  const book = version.books.find((b) => b.id === bookId);
  return book?.chapters.find((c) => c.bab === bab) ?? null;
}

export function searchVerse(versionCode: BibleVersionCode, query: string) {
  // Linear search across chapters — OK untuk ~31k verse per versi
  // Optimization: pre-build inverted index kalau search jadi lambat
}
```

Lazy-load per versi pakai dynamic import kalau bundle size jadi concern:

```typescript
async function loadVersion(code: BibleVersionCode) {
  if (code === 'TB') return (await import('./tb.json')).default;
  if (code === 'NKJV') return (await import('./nkjv.json')).default;
}
```

### 4. UI changes di mobile

- Settings → "Versi Alkitab" picker → TB (default) / NKJV
- Persist `selectedVersionCode` di store / SecureStore per jemaatId
- Chapter reader render dari `getChapter(version, bookId, bab)`
- Hapus placeholder "sample-only" notice
- Bookmark store extended dengan `versionCode` (1 bookmark per versi-bookId-bab-ayat)

### 5. Optional BE work yang tetap useful

Walau content bundle di mobile, BE tetap bisa kasih value:

- ✅ **`GET /admin/alkitab/verse-of-day`** — server-curated verse of day, return `{ versionCode, bookId, bab, ayat }`. Mobile lookup teks dari local bundle. **Effort BE: 0.5 hari**.
- ✅ **`/admin/me/bible-bookmarks`** (CRUD) — server-side bookmark sync cross-device. Simpan **reference saja** (`versionCode + bookId + bab + ayat`), bukan teks. **Effort BE: 0.5 hari**.

Kedua endpoint ini tidak butuh content TB/NKJV di BE — cuma referensi. Tidak ada licensing concern.

**Recommendation**: implement kedua endpoint ini bareng mobile launch Alkitab feature. Total BE effort ~1 hari.

## Action items

### Legal / product (BLOCKING sebelum mobile mulai bundle)
- [ ] **CRITICAL**: verify lisensi TB dengan LAI untuk redistribusi di mobile app gereja
- [ ] **CRITICAL**: verify lisensi NKJV dengan Thomas Nelson untuk redistribusi
- [ ] Decide: tetap TB+NKJV atau switch ke AYT+WEB (lebih aman)
- [ ] Kalau tetap TB+NKJV, target dapat surat izin (email confirmation OK)

### Mobile
- [ ] Identify JSON source (preferred Option 3 → 1 → 2)
- [ ] Convert/extract data → bundle ke `app/src/data/bible/{tb,nkjv}.json`
- [ ] Implement `getChapter(version, bookId, bab)` loader
- [ ] Update store: tambah `selectedVersionCode`, extend bookmarks dengan version
- [ ] UI: version picker di settings, reader switch per version
- [ ] Test offline-first behavior, performance loading 5MB JSON

### BE (opsional, recommended)
- [ ] Implement `GET /admin/alkitab/verse-of-day` — server-curated reference
- [ ] Implement `/admin/me/bible-bookmarks` (CRUD) — server-side sync, reference-only

## File yang BELUM berubah BE-side

Code BE tidak di-modify untuk content. Endpoint helper (verse-of-day, bookmark-sync) di-implement nanti kalau product OK dengan optional BE work di atas.

---

*Decision logged 2026-05-21. Legal verification BLOCKING sebelum mobile bundle.*
