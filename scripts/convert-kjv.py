#!/usr/bin/env python3
"""
Convert KJV source (aruljohn/Bible-kjv) → unified schema bible/kjv.json.

Source format (per book file):
  { "book": "Genesis", "chapters": [{ "chapter": "1", "verses": [{ "verse": "1", "text": "..." }] }] }

Target format (single file):
  {
    "version": "KJV",
    "versionFullName": "King James Version (Authorized Version)",
    "language": "en",
    "copyright": "Public Domain (1769)",
    "license": "public-domain",
    "source": "https://github.com/aruljohn/Bible-kjv",
    "books": [
      {
        "id": "GEN", "numericId": 1, "nama": "Genesis", "namaSingkat": "Gen",
        "testament": "OT", "order": 1, "chapterCount": 50,
        "chapters": [{ "bab": 1, "verses": [{ "nomor": 1, "teks": "..." }] }]
      }
    ]
  }

Usage:
  python3 scripts/convert-kjv.py <source_dir> <output_file>
"""

import json
import sys
import os

# Canonical book mapping: numeric_id → (3letter_code, namaEn_aruljohn, namaSingkat, testament)
# Order matches bible-books.ts canonical 1-66
BOOKS = [
    # (numeric_id, 3-letter, source_book_name, short, testament)
    (1,  'GEN', 'Genesis',         'Gen',  'OT'),
    (2,  'EXO', 'Exodus',          'Exo',  'OT'),
    (3,  'LEV', 'Leviticus',       'Lev',  'OT'),
    (4,  'NUM', 'Numbers',         'Num',  'OT'),
    (5,  'DEU', 'Deuteronomy',     'Deu',  'OT'),
    (6,  'JOS', 'Joshua',          'Jos',  'OT'),
    (7,  'JDG', 'Judges',          'Jdg',  'OT'),
    (8,  'RUT', 'Ruth',            'Rut',  'OT'),
    (9,  '1SA', '1 Samuel',        '1Sam', 'OT'),
    (10, '2SA', '2 Samuel',        '2Sam', 'OT'),
    (11, '1KI', '1 Kings',         '1Ki',  'OT'),
    (12, '2KI', '2 Kings',         '2Ki',  'OT'),
    (13, '1CH', '1 Chronicles',    '1Ch',  'OT'),
    (14, '2CH', '2 Chronicles',    '2Ch',  'OT'),
    (15, 'EZR', 'Ezra',            'Ezr',  'OT'),
    (16, 'NEH', 'Nehemiah',        'Neh',  'OT'),
    (17, 'EST', 'Esther',          'Est',  'OT'),
    (18, 'JOB', 'Job',             'Job',  'OT'),
    (19, 'PSA', 'Psalms',          'Psa',  'OT'),
    (20, 'PRO', 'Proverbs',        'Pro',  'OT'),
    (21, 'ECC', 'Ecclesiastes',    'Ecc',  'OT'),
    (22, 'SNG', 'Song of Solomon', 'Sng',  'OT'),  # bible-books.ts: "Song of Songs"
    (23, 'ISA', 'Isaiah',          'Isa',  'OT'),
    (24, 'JER', 'Jeremiah',        'Jer',  'OT'),
    (25, 'LAM', 'Lamentations',    'Lam',  'OT'),
    (26, 'EZK', 'Ezekiel',         'Ezk',  'OT'),
    (27, 'DAN', 'Daniel',          'Dan',  'OT'),
    (28, 'HOS', 'Hosea',           'Hos',  'OT'),
    (29, 'JOL', 'Joel',            'Jol',  'OT'),
    (30, 'AMO', 'Amos',            'Amo',  'OT'),
    (31, 'OBA', 'Obadiah',         'Oba',  'OT'),
    (32, 'JON', 'Jonah',           'Jon',  'OT'),
    (33, 'MIC', 'Micah',           'Mic',  'OT'),
    (34, 'NAM', 'Nahum',           'Nam',  'OT'),
    (35, 'HAB', 'Habakkuk',        'Hab',  'OT'),
    (36, 'ZEP', 'Zephaniah',       'Zep',  'OT'),
    (37, 'HAG', 'Haggai',          'Hag',  'OT'),
    (38, 'ZEC', 'Zechariah',       'Zec',  'OT'),
    (39, 'MAL', 'Malachi',         'Mal',  'OT'),
    # NT
    (40, 'MAT', 'Matthew',         'Mat',  'NT'),
    (41, 'MRK', 'Mark',            'Mrk',  'NT'),
    (42, 'LUK', 'Luke',            'Luk',  'NT'),
    (43, 'JHN', 'John',            'Jhn',  'NT'),
    (44, 'ACT', 'Acts',            'Act',  'NT'),
    (45, 'ROM', 'Romans',          'Rom',  'NT'),
    (46, '1CO', '1 Corinthians',   '1Co',  'NT'),
    (47, '2CO', '2 Corinthians',   '2Co',  'NT'),
    (48, 'GAL', 'Galatians',       'Gal',  'NT'),
    (49, 'EPH', 'Ephesians',       'Eph',  'NT'),
    (50, 'PHP', 'Philippians',     'Php',  'NT'),
    (51, 'COL', 'Colossians',      'Col',  'NT'),
    (52, '1TH', '1 Thessalonians', '1Th',  'NT'),
    (53, '2TH', '2 Thessalonians', '2Th',  'NT'),
    (54, '1TI', '1 Timothy',       '1Ti',  'NT'),
    (55, '2TI', '2 Timothy',       '2Ti',  'NT'),
    (56, 'TIT', 'Titus',           'Tit',  'NT'),
    (57, 'PHM', 'Philemon',        'Phm',  'NT'),
    (58, 'HEB', 'Hebrews',         'Heb',  'NT'),
    (59, 'JAS', 'James',           'Jas',  'NT'),
    (60, '1PE', '1 Peter',         '1Pe',  'NT'),
    (61, '2PE', '2 Peter',         '2Pe',  'NT'),
    (62, '1JN', '1 John',          '1Jn',  'NT'),
    (63, '2JN', '2 John',          '2Jn',  'NT'),
    (64, '3JN', '3 John',          '3Jn',  'NT'),
    (65, 'JUD', 'Jude',            'Jud',  'NT'),
    (66, 'REV', 'Revelation',      'Rev',  'NT'),
]

# Map source filename pattern to canonical book
# aruljohn uses: "Genesis.json", "1Samuel.json" (no space), "Song of Solomon.json", etc.
def find_source_file(source_dir, book_name):
    """Locate JSON file in source_dir matching the book."""
    candidates = [
        f"{book_name}.json",
        f"{book_name.replace(' ', '')}.json",  # "1Samuel.json"
    ]
    for fn in candidates:
        full = os.path.join(source_dir, fn)
        if os.path.exists(full):
            return full
    # Case insensitive fallback
    for fn in os.listdir(source_dir):
        if fn.lower() == f"{book_name.lower()}.json" or \
           fn.lower() == f"{book_name.replace(' ', '').lower()}.json":
            return os.path.join(source_dir, fn)
    return None


def convert(source_dir, output_file):
    books_out = []
    for numeric_id, code, src_name, short, testament in BOOKS:
        src_file = find_source_file(source_dir, src_name)
        if not src_file:
            raise FileNotFoundError(f"Missing source for {src_name} (id={numeric_id})")

        with open(src_file, 'r', encoding='utf-8') as f:
            src = json.load(f)

        chapters_out = []
        for ch in src['chapters']:
            verses_out = []
            for v in ch['verses']:
                verses_out.append({
                    'nomor': int(v['verse']),
                    'teks': v['text'].strip(),
                })
            chapters_out.append({
                'bab': int(ch['chapter']),
                'verses': verses_out,
            })

        books_out.append({
            'id': code,
            'numericId': numeric_id,
            'nama': src_name,
            'namaSingkat': short,
            'testament': testament,
            'order': numeric_id,
            'chapterCount': len(chapters_out),
            'chapters': chapters_out,
        })

    bible_out = {
        'version': 'KJV',
        'versionFullName': 'King James Version (Authorized Version)',
        'language': 'en',
        'copyright': 'Public Domain (1769)',
        'license': 'public-domain',
        'source': 'https://github.com/aruljohn/Bible-kjv',
        'books': books_out,
    }

    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(bible_out, f, ensure_ascii=False, separators=(',', ':'))

    # Stats
    total_chapters = sum(b['chapterCount'] for b in books_out)
    total_verses = sum(len(c['verses']) for b in books_out for c in b['chapters'])
    size_kb = os.path.getsize(output_file) / 1024
    print(f"Wrote {output_file}")
    print(f"  Books: {len(books_out)}, Chapters: {total_chapters}, Verses: {total_verses}")
    print(f"  Size: {size_kb:.1f} KB")


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <source_dir> <output_file>")
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
