/**
 * Label builder — generate ESC/POS commands untuk print thermal label.
 *
 * Standard ESC/POS commands (https://reference.epson-biz.com/modules/ref_escpos):
 * - ESC @         — initialize printer
 * - ESC ! n       — text style (bit flags)
 * - ESC a n       — alignment (0=left, 1=center, 2=right)
 * - GS V m        — paper cut (m=0 full, m=1 partial)
 * - GS k m n d... — print barcode/QR (m=2 for 2D QR)
 *
 * Layout 58mm paper (~32 char per line, default font):
 *   ┌─────────────────────────────┐
 *   │   ECC Jakarta · Ibadah      │  ← header center
 *   │   ─────────────────         │
 *   │                             │
 *   │       [QR 200x200]          │  ← QR code center
 *   │                             │
 *   │       ABC23XYZ              │  ← kode mono center
 *   │                             │
 *   │     ARI CHRISTIAN           │  ← nama center bold
 *   │                             │
 *   │   Min, 19 Mei · 08:00       │  ← detail center small
 *   │   ─────────────────         │
 *   │        ✓ JOIN               │  ← status center
 *   │                             │
 *   └─────────────────────────────┘
 *
 * Layout 80mm paper (~48 char per line) — sama tapi padding lebih lapang.
 */

import type { LabelPayload, PaperSize } from './printer';

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** Generate ESC/POS byte array untuk label payload */
export function buildLabelCommands(
  payload: LabelPayload,
  paperSize: PaperSize,
): Uint8Array {
  const cmds: number[] = [];

  // Init
  cmds.push(ESC, 0x40); // ESC @

  // Header — center, bold
  cmds.push(ESC, 0x61, 0x01); // ESC a 1 (center)
  cmds.push(ESC, 0x21, 0x08); // ESC ! 8 (bold)
  appendText(cmds, payload.header);
  cmds.push(LF, LF);

  // Reset style
  cmds.push(ESC, 0x21, 0x00);

  // QR code — center
  appendQrCode(cmds, payload.kode, paperSize === '80mm' ? 8 : 6);
  cmds.push(LF);

  // Kode mono — center
  cmds.push(ESC, 0x21, 0x10); // double-height
  appendText(cmds, payload.kode);
  cmds.push(LF);
  cmds.push(ESC, 0x21, 0x00); // reset

  cmds.push(LF);

  // Nama — center, bold, double-width
  cmds.push(ESC, 0x21, 0x30); // bold + double-width + double-height
  appendText(cmds, payload.namaLengkap.toUpperCase());
  cmds.push(LF);
  cmds.push(ESC, 0x21, 0x00); // reset

  cmds.push(LF);

  // Detail (optional)
  if (payload.detail) {
    appendText(cmds, payload.detail);
    cmds.push(LF);
  }

  // Separator
  cmds.push(LF);
  const sepWidth = paperSize === '80mm' ? 32 : 24;
  appendText(cmds, '-'.repeat(sepWidth));
  cmds.push(LF);

  // Status (optional)
  if (payload.status) {
    cmds.push(ESC, 0x21, 0x08); // bold
    appendText(cmds, payload.status);
    cmds.push(LF);
    cmds.push(ESC, 0x21, 0x00);
  }

  // Feed extra lines + cut
  cmds.push(LF, LF, LF);
  cmds.push(GS, 0x56, 0x00); // GS V 0 — full cut

  return new Uint8Array(cmds);
}

/** Append ASCII text bytes ke array (non-ASCII di-strip untuk safety) */
function appendText(arr: number[], text: string): void {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    // Keep printable ASCII + latin extended
    if (c >= 0x20 && c <= 0xff) {
      arr.push(c);
    } else {
      arr.push(0x3f); // '?'
    }
  }
}

/** Append QR code commands ke array */
function appendQrCode(arr: number[], data: string, moduleSize: number): void {
  // Center alignment
  arr.push(ESC, 0x61, 0x01);

  // Model 2 (standard)
  arr.push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);

  // Module size (1-16, default 3-8)
  arr.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize);

  // Error correction (48=L, 49=M, 50=Q, 51=H)
  arr.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);

  // Store QR data
  const dataBytes = Array.from(data).map((c) => c.charCodeAt(0));
  const len = dataBytes.length + 3;
  const pL = len & 0xff;
  const pH = (len >> 8) & 0xff;
  arr.push(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
  for (const b of dataBytes) arr.push(b);

  // Print stored QR
  arr.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
}

/**
 * Generate plain-text label preview untuk UI preview di Settings.
 * Tidak include QR (di-replace dengan placeholder text).
 */
export function previewLabel(payload: LabelPayload, paperSize: PaperSize): string {
  const width = paperSize === '80mm' ? 32 : 24;
  const sep = '-'.repeat(width);
  const center = (s: string) => {
    const pad = Math.max(0, Math.floor((width - s.length) / 2));
    return ' '.repeat(pad) + s;
  };

  const lines: string[] = [];
  lines.push(center(payload.header));
  lines.push(sep);
  lines.push('');
  lines.push(center('[QR CODE]'));
  lines.push(center(payload.kode));
  lines.push('');
  lines.push(center(payload.namaLengkap.toUpperCase()));
  if (payload.detail) {
    lines.push('');
    lines.push(center(payload.detail));
  }
  lines.push(sep);
  if (payload.status) {
    lines.push(center(`✓ ${payload.status}`));
  }
  return lines.join('\n');
}
