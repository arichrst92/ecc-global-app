#!/usr/bin/env python3
"""
Convert MobileFaceNet_TF .pb (frozen graph) → .tflite untuk dipakai di mobile.

Source: sirius-ai/MobileFaceNet_TF release `MobileFaceNet_9925_9680.pb`

Pipeline:
1. Load frozen graph dari .pb
2. Inspect input/output node names + shape (verify before convert)
3. Run TFLiteConverter dengan optimizations
4. Save mobilefacenet.tflite (~4-5MB)

USAGE (di laptop Ari, BUKAN di sandbox Claude):

    # Install deps (sekali setup)
    python3 -m venv ~/.venvs/mfn-convert
    source ~/.venvs/mfn-convert/bin/activate
    pip install tensorflow==2.13   # or any 2.x version

    # Run conversion
    python3 convert-mobilefacenet-pb-to-tflite.py \\
      --pb /path/to/MobileFaceNet_9925_9680.pb \\
      --out app/assets/ml/mobilefacenet.tflite

Output juga akan print actual input/output shapes + tensor info — wajib
verify sebelum dipakai (saya estimasi 128-dim, perlu konfirmasi karena
BE expect 192-dim per v2 doc).
"""

import argparse
import sys


def inspect_graph(pb_path: str):
    """Print all nodes + types — untuk find input/output node names."""
    import tensorflow as tf

    print(f'Loading {pb_path}...')
    with tf.io.gfile.GFile(pb_path, 'rb') as f:
        graph_def = tf.compat.v1.GraphDef()
        graph_def.ParseFromString(f.read())

    print(f'\nTotal nodes: {len(graph_def.node)}')

    # Find placeholders (likely inputs)
    placeholders = [n for n in graph_def.node if n.op == 'Placeholder']
    print(f'\nPlaceholders ({len(placeholders)}):')
    for n in placeholders:
        shape = n.attr.get('shape')
        print(f'  {n.name}: shape={shape}')

    # Find last few nodes (likely outputs)
    print(f'\nLast 10 nodes (potential outputs):')
    for n in graph_def.node[-10:]:
        print(f'  {n.name} ({n.op})')

    # Look for "embeddings" or "Logits" specifically
    print(f'\nNodes containing "embed" or "Logit":')
    for n in graph_def.node:
        if 'embed' in n.name.lower() or 'logit' in n.name.lower():
            print(f'  {n.name} ({n.op})')


def convert(pb_path: str, out_path: str, input_name: str, output_name: str):
    import tensorflow as tf

    print(f'\nConverting {pb_path}...')
    print(f'  Input:  {input_name}:0  shape=[1, 112, 112, 3]')
    print(f'  Output: {output_name}:0')

    converter = tf.compat.v1.lite.TFLiteConverter.from_frozen_graph(
        graph_def_file=pb_path,
        input_arrays=[input_name],
        output_arrays=[output_name],
        input_shapes={input_name: [1, 112, 112, 3]},
    )

    # Optimizations untuk smaller TFLite (optional)
    # converter.optimizations = [tf.lite.Optimize.DEFAULT]

    tflite_model = converter.convert()

    with open(out_path, 'wb') as f:
        f.write(tflite_model)

    import os
    size_kb = os.path.getsize(out_path) / 1024
    print(f'\n✅ Wrote {out_path} ({size_kb:.1f} KB)')

    # Verify dim
    print(f'\nVerifying output shape...')
    interpreter = tf.lite.Interpreter(model_path=out_path)
    interpreter.allocate_tensors()
    inp = interpreter.get_input_details()[0]
    out = interpreter.get_output_details()[0]
    print(f'  Input:  {inp["name"]} shape={inp["shape"]} dtype={inp["dtype"]}')
    print(f'  Output: {out["name"]} shape={out["shape"]} dtype={out["dtype"]}')

    output_dim = out['shape'][-1]
    print(f'\n📐 OUTPUT DIM: {output_dim}')
    print()
    if output_dim == 192:
        print('   ✓ Match BE expect (192-dim per v2 doc)')
    elif output_dim == 128:
        print('   ⚠ This MobileFaceNet outputs 128-dim, NOT 192.')
        print('   Decision needed:')
        print('   - Option A: Update mobile FACE_DESCRIPTOR_DIM = 128, ask BE re-update')
        print('   - Option B: Find different 192-dim variant')
    else:
        print(f'   ⚠ Unexpected dim {output_dim} — neither 128 nor 192.')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pb', required=True, help='Path ke .pb frozen graph')
    ap.add_argument('--out', required=True, help='Output .tflite path')
    ap.add_argument('--input', default='img_inputs', help='Input node name (default: img_inputs)')
    ap.add_argument('--output', default='embeddings', help='Output node name (default: embeddings)')
    ap.add_argument('--inspect-only', action='store_true', help='Cuma inspect graph, no convert')
    args = ap.parse_args()

    inspect_graph(args.pb)

    if args.inspect_only:
        print('\nInspect only mode — skip convert.')
        return

    convert(args.pb, args.out, args.input, args.output)


if __name__ == '__main__':
    try:
        import tensorflow as tf  # noqa
    except ImportError:
        print('ERROR: tensorflow not installed. Run:')
        print('  python3 -m venv ~/.venvs/mfn-convert')
        print('  source ~/.venvs/mfn-convert/bin/activate')
        print('  pip install tensorflow')
        sys.exit(1)
    main()
