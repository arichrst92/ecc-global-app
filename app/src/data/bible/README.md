# Bible Content Bundle

Folder ini menampung file JSON Alkitab yang di-bundle ke mobile asset (Opsi B per
`docs/backend-request-bible-content.md`).

**Status**: ✅ KJV done (`kjv.json`). ⏳ Menunggu Ari drop `id-ayt.usfx.xml` untuk generate `ayt.json`.

## Decision — versi final (2026-05-21, updated)

| Code  | Versi                          | Source                                              | License                              |
|-------|--------------------------------|-----------------------------------------------------|--------------------------------------|
| `AYT` | Alkitab Yang Terbuka           | seven1m/open-bibles `id-ayt.usfx.xml`               | **CC BY-SA 4.0** — clean             |
| `KJV` | Authorized Version (King James)| github.com/aruljohn/Bible-kjv (JSON)                | Public domain (1769) — zero risk     |

**History versi**:
- Initial proposal BE: TB + NKJV — NKJV tidak ada di SABDA, TB hard to find clean
- Mid: TB + KJV via SABDA — SABDA cuma kasih inverted index (no punctuation)
- Tried: BIS — tidak ketemu di GitHub
- **Final**: AYT + KJV — AYT punya license CC BY-SA paling clean, available di seven1m/open-bibles dalam format USFX XML

## Format yang harus diikuti (target schema)

Per versi, **satu file JSON** dengan struktur ini:

```json
{
  "version": "TB",
  "versionFullName": "Terjemahan Baru",
  "language": "id",
  "copyright": "© Lembaga Alkitab Indonesia 1974",
  "license": "all-rights-reserved",
  "source": "https://data.sabda.org/bible.php?v=id-tb",
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

**Wajib**:
- 66 buku, urutan canonical (Kejadian → Wahyu)
- `id` pakai code standar 3-huruf (GEN, EXO, LEV, …, REV) — lihat mapping di
  bawah supaya match dengan `bible-books.ts` numeric id
- `testament`: `"OT"` (39 buku pertama) atau `"NT"` (27 buku terakhir)
- `order`: 1–66, sesuai posisi canonical
- `chapterCount`: total pasal di buku ini
- `chapters[].bab`: 1-indexed
- `verses[].nomor`: 1-indexed
- `verses[].teks`: teks ayat, **TIDAK** termasuk nomor ayat di dalam string

**Untuk KJV** (`kjv.json`), field sama tapi:
- `"version": "KJV"`
- `"versionFullName": "King James Version"` (atau "Authorized Version")
- `"language": "en"`
- `"copyright": "Public Domain (1769)"`
- `"license": "public-domain"`
- `"source": "https://data.sabda.org/bible.php?v=en-av"`
- `nama`/`namaSingkat`: pakai nama Inggris (Genesis, Gen, Exodus, Exo, dst)

## Mapping book ID standar (untuk konsistensi)

OT (1–39): GEN, EXO, LEV, NUM, DEU, JOS, JDG, RUT, 1SA, 2SA, 1KI, 2KI, 1CH, 2CH,
EZR, NEH, EST, JOB, PSA, PRO, ECC, SNG, ISA, JER, LAM, EZK, DAN, HOS, JOL, AMO,
OBA, JON, MIC, NAM, HAB, ZEP, HAG, ZEC, MAL

NT (40–66): MAT, MRK, LUK, JHN, ACT, ROM, 1CO, 2CO, GAL, EPH, PHP, COL, 1TH,
2TH, 1TI, 2TI, TIT, PHM, HEB, JAS, 1PE, 2PE, 1JN, 2JN, 3JN, JUD, REV

(`bible-books.ts` saat ini pakai numeric `id: 1-66`. Loader akan map antara
3-letter code ↔ numeric id via tabel.)

## Step Ari di SABDA

1. Buka https://data.sabda.org/bible.php?v=id-tb (untuk TB) dan
   https://data.sabda.org/bible.php?v=en-av (untuk KJV)
2. Lihat tombol download / link export — SABDA biasanya kasih SQL dump,
   CSV, atau format mereka sendiri (`.olb`, `.bib`). Format yang tersedia
   masih perlu diverifikasi.
3. Download file mentah → save di local disk.
4. Drag-drop file ke chat di sini, atau letakkan di:
   `/Users/idea/Projects/ecc-mobile-app/app/src/data/bible/_raw/`
   (saya akan cek apa formatnya + tulis converter ke schema target di atas)

Kalau halaman SABDA cuma kasih view per pasal (no bulk download), opsi alternatif:
- Tulis script scrape per pasal (66 buku × N pasal × 2 versi)
- Cek API SABDA: https://www.sabdaweb.net/ atau https://api.sabda.org/

## Setelah file drop

Begitu `tb.json` + `kjv.json` ada di folder ini (atau raw file tersedia +
saya convert), saya:

1. Tulis `app/src/data/bible/index.ts` dengan `getChapter(version, bookId, bab)` loader
2. Map antara numeric `bookId` (1–66) di `bible-books.ts` ↔ 3-letter code di JSON
3. Update `useBibleStore`: tambah `selectedVersionCode: 'TB' | 'KJV'` (default 'TB'), persist per jemaatId
4. Extend `BibleBookmark` dengan `versionCode` (1 bookmark per versi-bookId-bab-ayat)
5. UI: version picker di header chapter reader (modal serupa font size)
6. Replace `getSampleChapter` import dengan `getChapter` di reader screen
7. Hapus placeholder "sample-only" notice
8. Test offline-first behavior + performance loading ~5MB JSON × 2 versi

## ⚠ Licensing reminder

- **TB**: © LAI 1974, restrictive. Bundle tanpa izin LAI = risiko C&D (low prob
  untuk app gereja non-komersial, tapi technically infringing). Long-term:
  follow-up resmi ke LAI.
- **KJV**: Public domain, zero risk.

SABDA host TB resmi — kemungkinan punya arrangement dengan LAI. Worth bertanya
ke SABDA email/kontak: apakah TB JSON dataset boleh di-redistribute lewat aplikasi
non-komersial?
