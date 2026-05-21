# Backend Request — Alkitab Content (TB LAI)

**Status**: 🟡 Pending — Mobile sudah ship dengan sample content bundled (~17 pasal populer). BE endpoint full content masih deferred sampai sumber data + lisensi clarified.

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
