# Backend Request — Alkitab Content (TB LAI)

**Status**: 🔵 **DEFERRED 2026-05-21** — BE analysis selesai (lihat section "Backend Response" di akhir doc). Awaiting product owner + legal team decision sebelum implement.

Mobile saat ini ship dengan Opsi C (sample-only, ~17 pasal bundled). BE endpoint full content masih pending sampai sumber data + lisensi clarified.

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
