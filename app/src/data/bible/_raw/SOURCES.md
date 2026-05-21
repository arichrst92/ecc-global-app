# Bible Source Repos — Shortlist untuk Download

Drop file/folder hasil download ke `_raw/` ini. Saya inspect format + tulis
converter ke schema `bible/README.md`.

## Untuk KJV (public domain, gampang)

### 1. aruljohn/Bible-kjv ⭐ rekomendasi utama
**URL**: https://github.com/aruljohn/Bible-kjv

**Format**: JSON per buku (66 files), pattern:
```json
// Genesis.json
{
  "book": "Genesis",
  "chapters": [
    {
      "chapter": "1",
      "verses": [
        { "verse": "1", "text": "In the beginning God created the heaven and the earth." }
      ]
    }
  ]
}
```

**Cara download**:
- Klik "Code" → "Download ZIP" di GitHub
- Atau clone: `git clone https://github.com/aruljohn/Bible-kjv.git`
- Drop seluruh folder JSON ke `_raw/kjv-aruljohn/`

### 2. wldeh/bible-api
**URL**: https://github.com/wldeh/bible-api

**Format**: per-verse JSON, multi-language. Path: `bibles/en-kjv/books/GEN/chapters/1/verses/`

Lebih granular tapi banyak file kecil. OK kalau Bible-kjv ga work.

### 3. scrollmapper/bible_databases
**URL**: https://github.com/scrollmapper/bible_databases

**Format**: SQLite + CSV dump. Ada di `formats/json/english/`. Heavier tapi multi-version.

---

## Untuk TB (licensing flag, lebih hati-hati)

### 1. wldeh/bible-api ⭐ cek dulu
**URL**: https://github.com/wldeh/bible-api/tree/main/bibles

Cek subfolder: `id-tb`, `id-terjemahan-baru`, atau similar. Kalau ada, format
sama dengan KJV-nya (per-verse JSON).

### 2. gratis1010/Alkitab-Bahasa-Indonesia
**URL**: https://github.com/gratis1010/Alkitab-Bahasa-Indonesia

**Format**: JSON. License unclear (perlu check repo README). Mungkin TB extracted
dari source lain. Worth try kalau wldeh ga punya.

### 3. JSGFCB/idn-Bible
**URL**: https://github.com/JSGFCB/idn-Bible

Repo Bahasa Indonesia, beberapa versi. Cek folder/branch.

### 4. yukuku/androidbible (last resort)
**URL**: https://github.com/yukuku/androidbible

Format `.yes` binary — perlu parser. Skip dulu kecuali repos lain ga ada TB.

---

## Format yang flexible diterima

Apapun bentuk file/folder yang Ari drop, saya bisa convert ke schema target di
`../README.md` selama isinya **lengkap** (66 buku, semua pasal, semua ayat).
Format yang gampang di-parse:

- **JSON per book** (Genesis.json, Exodus.json, ...) — paling clean
- **One big JSON** (single bible.json dengan books array)
- **CSV/TSV** (book,chapter,verse,text)
- **USFM/OSIS XML** (standar bible format, perlu parser tapi doable)
- **SQLite DB** (`.db` atau `.sqlite`) — query langsung

Yang lebih sulit (skip kalau ada alternatif):
- `.yes` (yukuku binary)
- Plain text dengan format custom (perlu rule-based parser)

---

## Verification checklist setelah download

Sebelum drop file ke `_raw/`, quick check:
- [ ] **66 buku** lengkap (39 OT + 27 NT) — kalau cuma NT atau cuma OT, sebutkan
- [ ] **Punctuation present** — buka random verse, cek ada titik/koma
- [ ] **Indonesian characters** untuk TB (tidak corrupt, "Allah" bukan "Al?ah")
- [ ] **No HTML/markdown noise** di teks ayat
- [ ] **License info di README** — copyright statement
