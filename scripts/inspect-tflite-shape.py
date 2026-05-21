#!/usr/bin/env python3
"""
Inspect TFLite model file untuk extract output tensor shapes.

Pure stdlib — tidak butuh tensorflow / tflite-runtime. Parse FlatBuffer
binary langsung, cari tensor metadata.

USAGE:
    python3 scripts/inspect-tflite-shape.py app/assets/ml/mobilefacenet.tflite

Output: list semua tensors dengan shape + name. Output tensor (descriptor)
biasanya terakhir / yang shape-nya [1, dim].
"""

import struct
import sys


def read_u32(buf, off):
    return struct.unpack_from('<I', buf, off)[0]


def read_i32(buf, off):
    return struct.unpack_from('<i', buf, off)[0]


def parse_tflite(path):
    with open(path, 'rb') as f:
        buf = f.read()

    # FlatBuffer structure: first 4 bytes = root table offset (uoffset_t)
    root_offset = read_u32(buf, 0)
    print(f'File: {path}')
    print(f'Size: {len(buf)/1024:.1f} KB')
    print(f'Magic: {buf[4:8].decode("ascii", errors="replace")}')
    print(f'Root offset: {root_offset}')
    print()

    # Naive approach: scan for int32 sequences yang look like shape arrays
    # [batch, h, w, c] = 4 ints, atau [batch, dim] = 2 ints
    # Common patterns we expect untuk MobileFaceNet:
    # Input:  [1, 112, 112, 3]
    # Output: [1, 128] atau [1, 192]
    print('Scanning for shape-like int32 sequences in binary...')
    print('(Heuristic: looking for known patterns)')
    print()

    # Search for [1, 112, 112, 3] = bytes: 01 00 00 00 70 00 00 00 70 00 00 00 03 00 00 00
    input_pattern = struct.pack('<iiii', 1, 112, 112, 3)
    pos = 0
    found_input = []
    while True:
        idx = buf.find(input_pattern, pos)
        if idx == -1:
            break
        found_input.append(idx)
        pos = idx + 1
    print(f'Input shape [1, 112, 112, 3] found at offsets: {found_input}')

    # Search for [1, 128] and [1, 192]
    for dim in (128, 192, 256, 512):
        pattern = struct.pack('<ii', 1, dim)
        pos = 0
        hits = []
        while True:
            idx = buf.find(pattern, pos)
            if idx == -1:
                break
            hits.append(idx)
            pos = idx + 1
        marker = '✓ LIKELY OUTPUT DIM' if hits and dim in (128, 192) else ''
        print(f'Shape [1, {dim}] found at offsets {hits[:5]} {marker}')

    # Search tensor names yang familiar
    print()
    print('Tensor names in binary:')
    for name in (b'embeddings', b'img_inputs', b'Logits', b'input', b'output'):
        idx = buf.find(name)
        if idx != -1:
            # Context: 100 bytes around it
            print(f'  "{name.decode()}" at offset {idx}')

    # Conclusion heuristic
    print()
    has_192 = struct.pack('<ii', 1, 192) in buf
    has_128 = struct.pack('<ii', 1, 128) in buf
    if has_192 and not has_128:
        print('🎯 CONCLUSION: Output dim = 192 (match BE expect)')
    elif has_128 and not has_192:
        print('🎯 CONCLUSION: Output dim = 128 (BE expect 192, mismatch!)')
    elif has_192 and has_128:
        print('🤔 BOTH 128 and 192 present — could be intermediate tensors.')
        print('   Run actual TFLite interpreter to confirm true output:')
        print('     import tensorflow as tf')
        print('     i = tf.lite.Interpreter(model_path="app/assets/ml/mobilefacenet.tflite")')
        print('     i.allocate_tensors()')
        print('     print(i.get_output_details())')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(f'Usage: {sys.argv[0]} <path.tflite>')
        sys.exit(1)
    parse_tflite(sys.argv[1])
