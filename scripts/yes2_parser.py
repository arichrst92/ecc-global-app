#!/usr/bin/env python3
"""
YES2 binary format parser — port of yukuku/androidbible Yes2Reader.java.

Format:
  [Header]    8 bytes: 98 58 0d 0a 00 5d e0 02
  [Section Index]
    sectionIndex.size     (int32, big-endian)
    sectionIndexVersion   (uint8, must be 1)
    section_count         (int32)
    For each section:
      name_len            (uint8)
      name                (ASCII bytes, name_len long)
      offset              (int32)
      attributes_size     (int32)
      content_size        (int32)
      reserved            (4 bytes)
  [Sections]              ordered by offset
  [Footer]                1 byte: 0x00

Each section's data starts at sectionDataStartOffset + entry.offset.
First entry.attributes_size bytes are Bintex-encoded attribute map.
After that, content_size bytes of section content.

Sections:
  versionInfo  — Bintex simple map (shortName, longName, locale, etc.)
  booksInfo    — int32 book_count, then [book_count] Yes2Book Bintex maps
  text         — verse text data; may be Snappy-compressed
"""

import struct
import sys
from io import BytesIO


YES2_MAGIC = b'\x98\x58\x0d\x0a\x00\x5d\xe0\x02'


class BintexReader:
    """Port of yuku/bintex/BintexReader.java"""

    def __init__(self, buf, offset=0):
        # buf is bytes; we maintain our own cursor
        self.buf = buf
        self.pos = offset

    def remaining(self):
        return len(self.buf) - self.pos

    def read_byte(self):
        if self.pos >= len(self.buf):
            raise EOFError()
        b = self.buf[self.pos]
        self.pos += 1
        return b

    def read_uint8(self):
        return self.read_byte()

    def read_uint16(self):
        hi = self.read_byte()
        lo = self.read_byte()
        return (hi << 8) | lo

    def read_int(self):
        """big-endian int32"""
        b0 = self.read_byte()
        b1 = self.read_byte()
        b2 = self.read_byte()
        b3 = self.read_byte()
        return (b0 << 24) | (b1 << 16) | (b2 << 8) | b3

    def read_raw(self, n):
        if self.pos + n > len(self.buf):
            raise EOFError(f"read_raw({n}) at pos {self.pos}, buf={len(self.buf)}")
        data = self.buf[self.pos:self.pos + n]
        self.pos += n
        return bytes(data)

    def read_varuint(self):
        first = self.read_byte()
        if (first & 0x80) == 0:
            return first
        if (first & 0xc0) == 0x80:
            n = self.read_byte()
            return ((first & 0x3f) << 8) | n
        if (first & 0xe0) == 0xc0:
            n1 = self.read_byte()
            n0 = self.read_byte()
            return ((first & 0x1f) << 16) | (n1 << 8) | n0
        if (first & 0xf0) == 0xe0:
            n2 = self.read_byte()
            n1 = self.read_byte()
            n0 = self.read_byte()
            return ((first & 0x0f) << 24) | (n2 << 16) | (n1 << 8) | n0
        if first == 0xf0:
            n3 = self.read_byte()
            n2 = self.read_byte()
            n1 = self.read_byte()
            n0 = self.read_byte()
            return (n3 << 24) | (n2 << 16) | (n1 << 8) | n0
        raise ValueError(f"unknown varuint first byte: {first:#x}")

    # ---- value-typed readers (for ValueSimpleMap) ----

    def _read_value_int(self, t):
        if t == 0x0e: return 0
        if 0x01 <= t <= 0x07: return t
        if t == 0x0f: return -1
        if t in (0x10, 0x11):
            a = self.read_byte()
            return ~a if t == 0x11 else a
        if t in (0x20, 0x21):
            a = self.read_uint16()
            return ~a if t == 0x21 else a
        if t in (0x30, 0x31):
            a = (self.read_byte() << 16) | (self.read_byte() << 8) | self.read_byte()
            return ~a if t == 0x31 else a
        if t in (0x40, 0x41):
            a = self.read_int()
            return ~a if t == 0x41 else a
        raise ValueError(f"value not int: type={t:#x}")

    def _read_value_string(self, t):
        if t == 0x0c: return None
        if t == 0x0d: return ""
        # 8-bit short string len 1-15
        if 0x51 <= t <= 0x5f:
            length = t & 0x0f
            return self._read_8bit_string(length)
        # 16-bit short string len 1-15
        if 0x61 <= t <= 0x6f:
            length = t & 0x0f
            return self._read_16bit_string(length)
        if t == 0x70:
            length = self.read_byte()
            return self._read_8bit_string(length)
        if t == 0x71:
            length = self.read_byte()
            return self._read_16bit_string(length)
        if t == 0x72:
            length = self.read_int()
            return self._read_8bit_string(length)
        if t == 0x73:
            length = self.read_int()
            return self._read_16bit_string(length)
        raise ValueError(f"value not string: type={t:#x}")

    def _read_8bit_string(self, length):
        # 8-bit = each char is one byte (interpreted as Latin-1)
        b = self.read_raw(length)
        return b.decode('latin-1')

    def _read_16bit_string(self, length):
        # 16-bit big-endian per char (UTF-16BE essentially)
        b = self.read_raw(length * 2)
        return b.decode('utf-16-be')

    def _read_value_uint8_array(self, t):
        if t == 0xc0:
            length = self.read_byte()
        elif t == 0xc8:
            length = self.read_int()
        else:
            raise ValueError(f"value not uint8 array: type={t:#x}")
        return [b for b in self.read_raw(length)]

    def _read_value_uint16_array(self, t):
        if t == 0xc1:
            length = self.read_byte()
        elif t == 0xc9:
            length = self.read_int()
        else:
            raise ValueError(f"value not uint16 array: type={t:#x}")
        return [self.read_uint16() for _ in range(length)]

    def _read_value_int_array(self, t):
        if t in (0xc0, 0xc8): return self._read_value_uint8_array(t)
        if t in (0xc1, 0xc9): return self._read_value_uint16_array(t)
        if t == 0xc4:
            length = self.read_byte()
        elif t == 0xcc:
            length = self.read_int()
        else:
            raise ValueError(f"value not int array: type={t:#x}")
        return [self.read_int() for _ in range(length)]

    def _read_value_simple_map(self, t):
        if t == 0x90:
            return {}
        if t != 0x91:
            raise ValueError(f"value not simple map: type={t:#x}")
        size = self.read_byte()
        res = {}
        for _ in range(size):
            key_len = self.read_byte()
            k = self._read_8bit_string(key_len)
            v = self.read_value()
            res[k] = v
        return res

    # SUPPORTED_TYPE_MAP from Java
    _TYPE_INT_BYTES = set([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x0e, 0x0f,
                          0x10, 0x11, 0x20, 0x21, 0x30, 0x31, 0x40, 0x41])
    _TYPE_STR_BYTES = set([0x0c, 0x0d, 0x70, 0x71, 0x72, 0x73]) | set(range(0x51, 0x60)) | set(range(0x61, 0x70))
    _TYPE_ARR_BYTES = set([0xc0, 0xc1, 0xc4, 0xc8, 0xc9, 0xcc])
    _TYPE_MAP_BYTES = set([0x90, 0x91])

    def read_value(self):
        t = self.read_byte()
        if t in self._TYPE_INT_BYTES:
            return self._read_value_int(t)
        if t in self._TYPE_STR_BYTES:
            return self._read_value_string(t)
        if t in self._TYPE_ARR_BYTES:
            return self._read_value_int_array(t)
        if t in self._TYPE_MAP_BYTES:
            return self._read_value_simple_map(t)
        raise ValueError(f"value has unknown type: {t:#x} at pos {self.pos-1}")

    def read_value_simple_map(self):
        t = self.read_byte()
        return self._read_value_simple_map(t)


class Yes2File:
    def __init__(self, path):
        with open(path, 'rb') as f:
            self.data = f.read()
        if self.data[:8] != YES2_MAGIC:
            raise ValueError(f"Not a YES2 file. Header: {self.data[:8].hex()}")
        self._parse_section_index()
        self.version_info = None
        self.books = None

    def _parse_section_index(self):
        # bytes 0-7 = magic
        # bytes 8-11 = sectionIndex.size (int32)
        size = struct.unpack('>i', self.data[8:12])[0]
        # Section index begins at offset 12
        # 1 byte version, 4 bytes section_count, then entries
        br = BintexReader(self.data, offset=12)
        version = br.read_uint8()
        if version != 1:
            raise ValueError(f"Unsupported section index version: {version}")
        section_count = br.read_int()
        entries = {}
        for _ in range(section_count):
            name_len = br.read_uint8()
            name = br.read_raw(name_len).decode('ascii')
            offset = br.read_int()
            attributes_size = br.read_int()
            content_size = br.read_int()
            br.read_raw(4)  # reserved
            entries[name] = {
                'offset': offset,
                'attributes_size': attributes_size,
                'content_size': content_size,
            }
        self.section_index = entries
        self.section_data_start = br.pos  # absolute offset after section index

    def get_section_content_bytes(self, name):
        e = self.section_index.get(name)
        if e is None:
            return None, None
        # absolute offset = sectionDataStart + e.offset
        abs_start = self.section_data_start + e['offset']
        attrs_start = abs_start
        attrs_end = attrs_start + e['attributes_size']
        content_start = attrs_end
        content_end = content_start + e['content_size']
        attrs_bytes = self.data[attrs_start:attrs_end]
        content_bytes = self.data[content_start:content_end]
        return attrs_bytes, content_bytes

    def get_section_attributes(self, name):
        attrs_bytes, _ = self.get_section_content_bytes(name)
        if attrs_bytes is None or len(attrs_bytes) == 0:
            return None
        return BintexReader(attrs_bytes).read_value_simple_map()

    def load_version_info(self):
        _, content = self.get_section_content_bytes('versionInfo')
        if content is None:
            return None
        return BintexReader(content).read_value_simple_map()

    def load_books_info(self):
        _, content = self.get_section_content_bytes('booksInfo')
        br = BintexReader(content)
        book_count = br.read_int()
        books = []
        for _ in range(book_count):
            books.append(br.read_value_simple_map())
        return books

    def load_text_section(self):
        """Return (attrs_map_or_None, raw_content_bytes)."""
        attrs_bytes, content = self.get_section_content_bytes('text')
        attrs = None
        if attrs_bytes and len(attrs_bytes) > 0:
            attrs = BintexReader(attrs_bytes).read_value_simple_map()
        return attrs, content


def decode_verses(verse_bytes, verse_count, text_encoding=2):
    """Decode raw verse text bytes into list of strings.

    Each verse: varuint length + UTF-8 (encoding=2) or ASCII (encoding=1) bytes.
    """
    br = BintexReader(verse_bytes)
    verses = []
    for _ in range(verse_count):
        vlen = br.read_varuint()
        raw = br.read_raw(vlen)
        if text_encoding == 1:
            verses.append(raw.decode('ascii'))
        else:
            verses.append(raw.decode('utf-8'))
    return verses


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <yes_file> [--dump]")
        sys.exit(1)
    yes = Yes2File(sys.argv[1])
    print(f"Sections: {list(yes.section_index.keys())}")
    for name, e in yes.section_index.items():
        print(f"  {name}: offset={e['offset']}, attrs={e['attributes_size']}, content={e['content_size']}")

    vinfo = yes.load_version_info()
    print(f"\nversionInfo: {vinfo}")

    books = yes.load_books_info()
    print(f"\nBooks ({len(books)}):")
    for b in books[:3]:
        print(f"  {b}")
    print(f"  ...")
    if books:
        print(f"  {books[-1]}")

    attrs, text_content = yes.load_text_section()
    print(f"\nText section attrs: {attrs}")
    print(f"Text content size: {len(text_content)} bytes")
