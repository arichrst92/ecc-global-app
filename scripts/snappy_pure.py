#!/usr/bin/env python3
"""
Pure-Python Snappy raw block decompressor.

Implements the Snappy compression format as documented at:
https://github.com/google/snappy/blob/main/format_description.txt

Only the raw (non-framed) format is supported, matching what yukuku/AndroidBible's
SnappyInputStream produces per-block.
"""


def decompress(data: bytes) -> bytes:
    """Decompress one Snappy-compressed block."""
    pos = 0
    n = len(data)

    # Read uncompressed length (varint, little-endian)
    expected_len = 0
    shift = 0
    while True:
        if pos >= n:
            raise ValueError("truncated varint")
        b = data[pos]
        pos += 1
        expected_len |= (b & 0x7f) << shift
        if (b & 0x80) == 0:
            break
        shift += 7
        if shift > 35:
            raise ValueError("varint too long")

    out = bytearray()

    while pos < n:
        tag = data[pos]
        pos += 1
        tag_type = tag & 0x03

        if tag_type == 0:  # Literal
            length = tag >> 2
            if length < 60:
                length += 1
            elif length == 60:
                length = data[pos] + 1
                pos += 1
            elif length == 61:
                length = data[pos] | (data[pos + 1] << 8)
                length += 1
                pos += 2
            elif length == 62:
                length = data[pos] | (data[pos + 1] << 8) | (data[pos + 2] << 16)
                length += 1
                pos += 3
            else:  # 63
                length = (data[pos] | (data[pos + 1] << 8)
                         | (data[pos + 2] << 16) | (data[pos + 3] << 24))
                length += 1
                pos += 4
            out.extend(data[pos:pos + length])
            pos += length

        elif tag_type == 1:  # Copy with 1-byte offset
            length = ((tag >> 2) & 0x07) + 4
            offset = ((tag >> 5) << 8) | data[pos]
            pos += 1
            _copy(out, offset, length)

        elif tag_type == 2:  # Copy with 2-byte offset
            length = (tag >> 2) + 1
            offset = data[pos] | (data[pos + 1] << 8)
            pos += 2
            _copy(out, offset, length)

        else:  # tag_type == 3, Copy with 4-byte offset
            length = (tag >> 2) + 1
            offset = (data[pos] | (data[pos + 1] << 8)
                     | (data[pos + 2] << 16) | (data[pos + 3] << 24))
            pos += 4
            _copy(out, offset, length)

    if len(out) != expected_len:
        raise ValueError(f"Decompressed length mismatch: expected {expected_len}, got {len(out)}")
    return bytes(out)


def _copy(out: bytearray, offset: int, length: int):
    """Copy from offset-bytes-before-current-end of out, into out itself.
    Note: source and destination can overlap (run-length encoding pattern)."""
    src = len(out) - offset
    if src < 0:
        raise ValueError(f"Invalid copy offset: src={src}")
    # Cannot use slice copy because src+length may exceed len(out)
    # (in which case the copy reads bytes we just wrote — RLE behavior).
    for i in range(length):
        out.append(out[src + i])


if __name__ == '__main__':
    # Quick self-test
    import sys
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'rb') as f:
            data = f.read()
        out = decompress(data)
        sys.stdout.buffer.write(out)
