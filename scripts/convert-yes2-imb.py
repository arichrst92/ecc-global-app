#!/usr/bin/env python3
"""
Convert YES2 .yes file (Indonesian Modern Bible from alkitab.app) → unified
schema bible/imb.json.

Steps:
  1. Read header + section index (yes2_parser)
  2. Decompress Snappy text section into one big buffer
  3. For each book, seek to offset + each chapter offset, read verses
  4. Strip inline formatting codes (@@@8, @5, @<f1@>...@/, etc.)
  5. Map IMB bookId 0-65 → numericId 1-66 + Indonesian names from bible-books.ts

Usage:
  python3 scripts/convert-yes2-imb.py <yes_file> <output_json>
"""

import json
import re
import sys
import os

# Allow imports from same dir
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from yes2_parser import Yes2File, BintexReader
from snappy_pure import decompress as snappy_decompress


# Mapping: bookId (0-65 in YES2) → (numeric_id 1-66, 3-letter code, nama_id, singkatan_id, testament)
# Order matches yukuku canonical Bible order (same as our bible-books.ts)
BOOKS_META = [
    (1,  'GEN', 'Kejadian',          'Kej',  'OT'),
    (2,  'EXO', 'Keluaran',          'Kel',  'OT'),
    (3,  'LEV', 'Imamat',            'Im',   'OT'),
    (4,  'NUM', 'Bilangan',          'Bil',  'OT'),
    (5,  'DEU', 'Ulangan',           'Ul',   'OT'),
    (6,  'JOS', 'Yosua',             'Yos',  'OT'),
    (7,  'JDG', 'Hakim-Hakim',       'Hak',  'OT'),
    (8,  'RUT', 'Rut',               'Rut',  'OT'),
    (9,  '1SA', '1 Samuel',          '1Sam', 'OT'),
    (10, '2SA', '2 Samuel',          '2Sam', 'OT'),
    (11, '1KI', '1 Raja-Raja',       '1Raj', 'OT'),
    (12, '2KI', '2 Raja-Raja',       '2Raj', 'OT'),
    (13, '1CH', '1 Tawarikh',        '1Taw', 'OT'),
    (14, '2CH', '2 Tawarikh',        '2Taw', 'OT'),
    (15, 'EZR', 'Ezra',              'Ezr',  'OT'),
    (16, 'NEH', 'Nehemia',           'Neh',  'OT'),
    (17, 'EST', 'Ester',             'Est',  'OT'),
    (18, 'JOB', 'Ayub',              'Ayb',  'OT'),
    (19, 'PSA', 'Mazmur',            'Mzm',  'OT'),
    (20, 'PRO', 'Amsal',             'Ams',  'OT'),
    (21, 'ECC', 'Pengkhotbah',       'Pkh',  'OT'),
    (22, 'SNG', 'Kidung Agung',      'Kid',  'OT'),
    (23, 'ISA', 'Yesaya',            'Yes',  'OT'),
    (24, 'JER', 'Yeremia',           'Yer',  'OT'),
    (25, 'LAM', 'Ratapan',           'Rat',  'OT'),
    (26, 'EZK', 'Yehezkiel',         'Yeh',  'OT'),
    (27, 'DAN', 'Daniel',            'Dan',  'OT'),
    (28, 'HOS', 'Hosea',             'Hos',  'OT'),
    (29, 'JOL', 'Yoel',              'Yl',   'OT'),
    (30, 'AMO', 'Amos',              'Am',   'OT'),
    (31, 'OBA', 'Obaja',             'Ob',   'OT'),
    (32, 'JON', 'Yunus',             'Yun',  'OT'),
    (33, 'MIC', 'Mikha',             'Mi',   'OT'),
    (34, 'NAM', 'Nahum',             'Nah',  'OT'),
    (35, 'HAB', 'Habakuk',           'Hab',  'OT'),
    (36, 'ZEP', 'Zefanya',           'Zef',  'OT'),
    (37, 'HAG', 'Hagai',             'Hag',  'OT'),
    (38, 'ZEC', 'Zakharia',          'Za',   'OT'),
    (39, 'MAL', 'Maleakhi',          'Mal',  'OT'),
    (40, 'MAT', 'Matius',            'Mat',  'NT'),
    (41, 'MRK', 'Markus',            'Mrk',  'NT'),
    (42, 'LUK', 'Lukas',             'Luk',  'NT'),
    (43, 'JHN', 'Yohanes',           'Yoh',  'NT'),
    (44, 'ACT', 'Kisah Para Rasul',  'Kis',  'NT'),
    (45, 'ROM', 'Roma',              'Rm',   'NT'),
    (46, '1CO', '1 Korintus',        '1Kor', 'NT'),
    (47, '2CO', '2 Korintus',        '2Kor', 'NT'),
    (48, 'GAL', 'Galatia',           'Gal',  'NT'),
    (49, 'EPH', 'Efesus',            'Ef',   'NT'),
    (50, 'PHP', 'Filipi',            'Flp',  'NT'),
    (51, 'COL', 'Kolose',            'Kol',  'NT'),
    (52, '1TH', '1 Tesalonika',      '1Tes', 'NT'),
    (53, '2TH', '2 Tesalonika',      '2Tes', 'NT'),
    (54, '1TI', '1 Timotius',        '1Tim', 'NT'),
    (55, '2TI', '2 Timotius',        '2Tim', 'NT'),
    (56, 'TIT', 'Titus',             'Tit',  'NT'),
    (57, 'PHM', 'Filemon',           'Flm',  'NT'),
    (58, 'HEB', 'Ibrani',            'Ibr',  'NT'),
    (59, 'JAS', 'Yakobus',           'Yak',  'NT'),
    (60, '1PE', '1 Petrus',          '1Ptr', 'NT'),
    (61, '2PE', '2 Petrus',          '2Ptr', 'NT'),
    (62, '1JN', '1 Yohanes',         '1Yoh', 'NT'),
    (63, '2JN', '2 Yohanes',         '2Yoh', 'NT'),
    (64, '3JN', '3 Yohanes',         '3Yoh', 'NT'),
    (65, 'JUD', 'Yudas',             'Yud',  'NT'),
    (66, 'REV', 'Wahyu',             'Why',  'NT'),
]


# Strip yukuku inline formatting codes from verse text.
# Reference: docs/text-rendering.md in androidbible repo
# Common patterns:
#   ^ at start of verse — paragraph break marker
#   @^ inline           — paragraph break within verse (e.g., dialog change)
#   @@@8...@8           — block formatting (italic, indent, etc.)
#   @5, @6, @7, @8, @9  — single-char inline format codes (red letter, etc.)
#   @<f1@>...@/         — footnote markers
#   @<x1@>...@/         — cross-reference markers
#   @<i@>...@/          — inline italic
#
# Strategy: remove all @-prefixed control sequences and ^ paragraph markers,
# replacing inline paragraph breaks with a single space to preserve word
# boundaries.

# Match @-prefixed codes: @<tag@>, <tag@> (sometimes leading @ is missing),
# @/, @digit, @@@..., @@, @^, plain @
INLINE_CODE_RE = re.compile(
    r'@?<[^@<>]*@>|@/|@\^|@@@\w*|@@|@\d'
)


def clean_verse(text):
    """Strip yukuku inline formatting codes, keep raw text."""
    # 1. Drop leading paragraph marker
    if text.startswith('^'):
        text = text[1:]
    # 2. Inline @^ paragraph break → single space
    text = text.replace('@^', ' ')
    # 3. Strip other @-codes
    cleaned = INLINE_CODE_RE.sub('', text)
    # 4. Collapse multiple spaces from format stripping
    cleaned = re.sub(r'\s+', ' ', cleaned)
    return cleaned.strip()


def decompress_all(yes, attrs, content):
    """Decompress all Snappy blocks into one big buffer."""
    info = attrs['compression.info']
    block_size = info['block_size']
    sizes = info['compressed_block_sizes']
    out = bytearray()
    pos = 0
    for s in sizes:
        block = content[pos:pos + s]
        pos += s
        out.extend(snappy_decompress(block))
    return bytes(out)


def convert(yes_path, output_path):
    print(f"Parsing {yes_path}...")
    yes = Yes2File(yes_path)
    vinfo = yes.load_version_info()
    print(f"  Version: {vinfo['shortName']} ({vinfo['longName']})")
    print(f"  Locale: {vinfo['locale']}, encoding: {vinfo['textEncoding']}, books: {vinfo['book_count']}")

    books_meta = yes.load_books_info()
    print(f"  YES2 books: {len(books_meta)}")
    if len(books_meta) != 66:
        print(f"  WARNING: expected 66 books, got {len(books_meta)}")

    attrs, content = yes.load_text_section()
    if attrs and attrs.get('compression.name') == 'snappy-blocks':
        print(f"  Decompressing text section ({len(content)} compressed bytes)...")
        text_buf = decompress_all(yes, attrs, content)
        print(f"  Decompressed to {len(text_buf)} bytes")
    else:
        text_buf = content
        print(f"  Text section uncompressed: {len(text_buf)} bytes")

    text_encoding = vinfo.get('textEncoding', 2)
    encoding_name = 'utf-8' if text_encoding == 2 else 'ascii'

    books_out = []
    for idx, ybook in enumerate(books_meta):
        if idx >= len(BOOKS_META):
            break
        numeric_id, code, nama, singkat, testament = BOOKS_META[idx]
        book_offset = ybook['offset']
        chapter_offsets = ybook['chapter_offsets']
        verse_counts = ybook['verse_counts']
        chapter_count = ybook['chapter_count']

        chapters_out = []
        for ch_idx in range(chapter_count):
            ch_offset_in_book = chapter_offsets[ch_idx]
            ch_global = book_offset + ch_offset_in_book
            vc = verse_counts[ch_idx]

            br = BintexReader(text_buf, offset=ch_global)
            verses = []
            for v_idx in range(vc):
                vlen = br.read_varuint()
                raw = br.read_raw(vlen)
                txt = raw.decode(encoding_name)
                txt = clean_verse(txt)
                verses.append({'nomor': v_idx + 1, 'teks': txt})

            chapters_out.append({'bab': ch_idx + 1, 'verses': verses})

        books_out.append({
            'id': code,
            'numericId': numeric_id,
            'nama': nama,
            'namaSingkat': singkat,
            'testament': testament,
            'order': numeric_id,
            'chapterCount': chapter_count,
            'chapters': chapters_out,
        })

    bible_out = {
        'version': vinfo['shortName'],
        'versionFullName': vinfo['longName'],
        'language': vinfo['locale'],
        'copyright': vinfo.get('description', ''),
        'license': 'see-copyright',
        'source': 'https://api.alkitab.app/versions/get_yes?preset_name=in-imb',
        'books': books_out,
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(bible_out, f, ensure_ascii=False, separators=(',', ':'))

    total_chapters = sum(b['chapterCount'] for b in books_out)
    total_verses = sum(len(c['verses']) for b in books_out for c in b['chapters'])
    size_kb = os.path.getsize(output_path) / 1024
    print(f"\nWrote {output_path}")
    print(f"  Books: {len(books_out)}, Chapters: {total_chapters}, Verses: {total_verses}")
    print(f"  Size: {size_kb:.1f} KB")


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <yes_file> <output_json>")
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
