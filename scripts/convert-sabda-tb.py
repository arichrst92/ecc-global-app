#!/usr/bin/env python3
"""
Convert SABDA TB inverted index CSV → unified schema bible/tb.json.

Source format (SABDA CSV):
  KATA|JUMLAH_KEMUNCULAN|POSISI_KATA POSISI_KATA ...
  Posisi 8 digit = 5 digit verse_id (1-31102) + 3 digit word position

Approach:
  1. Parse CSV → build verse_id → [(pos, word), ...] map
  2. Use KJV structure (kjv.json) untuk derive verse_id → (book, chapter, verse)
     mapping (KJV & TB share canonical 31,102 verse Protestant Bible structure)
  3. Reconstruct each verse: sort by position, join words with space
  4. Output JSON matching schema in app/src/data/bible/README.md

Trade-off: SABDA index doesn't preserve punctuation/quotation. Reconstructed
text is verbatim word-for-word but missing punctuation marks. Acceptable for
MVP since each verse rendered separately in reader UI.

Usage:
  python3 scripts/convert-sabda-tb.py <sabda_csv> <kjv_json> <output_json>
"""

import json
import sys
import os
from collections import defaultdict

# 3-letter codes per canonical book (must match convert-kjv.py BOOKS table)
CODES = ['GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA',
         '1KI','2KI','1CH','2CH','EZR','NEH','EST','JOB','PSA','PRO',
         'ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO',
         'OBA','JON','MIC','NAM','HAB','ZEP','HAG','ZEC','MAL',
         'MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH',
         'PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS',
         '1PE','2PE','1JN','2JN','3JN','JUD','REV']

# Indonesian book names (sesuai bible-books.ts)
NAMA_ID = [
    'Kejadian','Keluaran','Imamat','Bilangan','Ulangan',
    'Yosua','Hakim-Hakim','Rut','1 Samuel','2 Samuel',
    '1 Raja-Raja','2 Raja-Raja','1 Tawarikh','2 Tawarikh','Ezra',
    'Nehemia','Ester','Ayub','Mazmur','Amsal',
    'Pengkhotbah','Kidung Agung','Yesaya','Yeremia','Ratapan',
    'Yehezkiel','Daniel','Hosea','Yoel','Amos',
    'Obaja','Yunus','Mikha','Nahum','Habakuk',
    'Zefanya','Hagai','Zakharia','Maleakhi',
    'Matius','Markus','Lukas','Yohanes','Kisah Para Rasul',
    'Roma','1 Korintus','2 Korintus','Galatia','Efesus',
    'Filipi','Kolose','1 Tesalonika','2 Tesalonika','1 Timotius',
    '2 Timotius','Titus','Filemon','Ibrani','Yakobus',
    '1 Petrus','2 Petrus','1 Yohanes','2 Yohanes','3 Yohanes',
    'Yudas','Wahyu'
]

SINGKATAN_ID = [
    'Kej','Kel','Im','Bil','Ul','Yos','Hak','Rut','1Sam','2Sam',
    '1Raj','2Raj','1Taw','2Taw','Ezr','Neh','Est','Ayb','Mzm','Ams',
    'Pkh','Kid','Yes','Yer','Rat','Yeh','Dan','Hos','Yl','Am',
    'Ob','Yun','Mi','Nah','Hab','Zef','Hag','Za','Mal',
    'Mat','Mrk','Luk','Yoh','Kis','Rm','1Kor','2Kor','Gal','Ef',
    'Flp','Kol','1Tes','2Tes','1Tim','2Tim','Tit','Flm','Ibr','Yak',
    '1Ptr','2Ptr','1Yoh','2Yoh','3Yoh','Yud','Why'
]


def parse_sabda(csv_path):
    """Return verse_id -> [(pos, word), ...]"""
    verse_words = defaultdict(list)
    with open(csv_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\n')
            if not line:
                continue
            parts = line.split('|')
            if len(parts) < 3:
                continue
            word = parts[0]
            for p in parts[2].split():
                if len(p) != 8 or not p.isdigit():
                    continue
                vid = int(p[:5])
                pos = int(p[5:8])
                verse_words[vid].append((pos, word))
    return verse_words


def build_vrefs_from_kjv(kjv_path):
    """Derive verse_id -> (numeric_book_id, bab, nomor) from KJV structure.

    KJV has same 31,102 verses in same canonical order as TB."""
    with open(kjv_path, 'r', encoding='utf-8') as f:
        kjv = json.load(f)
    vrefs = {}  # verse_id -> (numeric_id, bab, nomor)
    vid = 1
    for book in kjv['books']:
        for ch in book['chapters']:
            for v in ch['verses']:
                vrefs[vid] = (book['numericId'], ch['bab'], v['nomor'])
                vid += 1
    return vrefs


def reconstruct(verse_words, vid):
    """Build verse text from words, sorted by position."""
    words = sorted(verse_words[vid], key=lambda x: x[0])
    return ' '.join(w for _, w in words)


def convert(csv_path, kjv_path, output_path):
    print(f"Parsing {csv_path}...")
    verse_words = parse_sabda(csv_path)
    print(f"  {len(verse_words)} verses with word data")

    print(f"Building vrefs from {kjv_path}...")
    vrefs = build_vrefs_from_kjv(kjv_path)
    print(f"  {len(vrefs)} canonical verse references")

    # Group verses by book + chapter
    books_data = defaultdict(lambda: defaultdict(list))  # numeric_id -> bab -> [(nomor, text)]
    for vid, (nid, bab, nomor) in vrefs.items():
        text = reconstruct(verse_words, vid)
        books_data[nid][bab].append((nomor, text))

    # Build output
    books_out = []
    for nid in range(1, 67):
        code = CODES[nid - 1]
        nama = NAMA_ID[nid - 1]
        singkat = SINGKATAN_ID[nid - 1]
        testament = 'OT' if nid <= 39 else 'NT'
        chapters_data = books_data[nid]

        chapters_out = []
        for bab in sorted(chapters_data.keys()):
            verses = sorted(chapters_data[bab])
            chapters_out.append({
                'bab': bab,
                'verses': [{'nomor': n, 'teks': t} for n, t in verses],
            })

        books_out.append({
            'id': code,
            'numericId': nid,
            'nama': nama,
            'namaSingkat': singkat,
            'testament': testament,
            'order': nid,
            'chapterCount': len(chapters_out),
            'chapters': chapters_out,
        })

    bible_out = {
        'version': 'TB',
        'versionFullName': 'Terjemahan Baru',
        'language': 'id',
        'copyright': '© Lembaga Alkitab Indonesia 1974',
        'license': 'all-rights-reserved (acknowledgment risk)',
        'source': 'SABDA inverted index (https://data.sabda.org/bible.php?v=id-tb)',
        'notes': 'Reconstructed from SABDA index — verbatim word order, no punctuation marks. Each verse rendered separately in reader UI.',
        'books': books_out,
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(bible_out, f, ensure_ascii=False, separators=(',', ':'))

    total_chapters = sum(b['chapterCount'] for b in books_out)
    total_verses = sum(len(c['verses']) for b in books_out for c in b['chapters'])
    size_kb = os.path.getsize(output_path) / 1024
    print(f"Wrote {output_path}")
    print(f"  Books: {len(books_out)}, Chapters: {total_chapters}, Verses: {total_verses}")
    print(f"  Size: {size_kb:.1f} KB")


if __name__ == '__main__':
    if len(sys.argv) != 4:
        print(f"Usage: {sys.argv[0]} <sabda_csv> <kjv_json> <output_json>")
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2], sys.argv[3])
