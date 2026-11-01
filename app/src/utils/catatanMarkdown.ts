/**
 * Markdown ringan untuk Catatan saya — disimpan sebagai teks biasa supaya
 * tetap terbaca di mana pun, dirender dengan komponen RN (tanpa modul native).
 *
 *   # Judul bagian      - poin      1. nomor      > kutipan
 *   **tebal**   _miring_   ==stabilo==
 */
export type Inline = { text: string; bold?: boolean; italic?: boolean; mark?: boolean };
export type Block =
  | { type: 'h'; inl: Inline[] }
  | { type: 'li'; inl: Inline[] }
  | { type: 'ol'; n: string; inl: Inline[] }
  | { type: 'quote'; inl: Inline[] }
  | { type: 'p'; inl: Inline[] }
  | { type: 'gap' };

const TOKEN = /(\*\*[^*\n]+?\*\*|==[^=\n]+?==|_[^_\n]+?_)/g;
const WORD = /[A-Za-z0-9]/;
/** _miring_ hanya bila tidak menempel huruf (mis. nama_file tetap polos). */
const italicOk = (s: string, i: number, len: number) => !WORD.test(s[i - 1] ?? '') && !WORD.test(s[i + len] ?? '');

export function parseInline(s: string, base: Omit<Inline, 'text'> = {}): Inline[] {
  const out: Inline[] = [];
  const re = new RegExp(TOKEN.source, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const i = m.index;
    const tok = m[0];
    if (tok.startsWith('_') && !italicOk(s, i, tok.length)) {
      re.lastIndex = i + 1; // bukan penanda miring — coba lagi dari karakter berikutnya
      continue;
    }
    if (i > last) out.push({ ...base, text: s.slice(last, i) });
    if (tok.startsWith('**')) out.push(...parseInline(tok.slice(2, -2), { ...base, bold: true }));
    else if (tok.startsWith('==')) out.push(...parseInline(tok.slice(2, -2), { ...base, mark: true }));
    else out.push(...parseInline(tok.slice(1, -1), { ...base, italic: true }));
    last = i + tok.length;
  }
  if (last < s.length) out.push({ ...base, text: s.slice(last) });
  return out;
}

export function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of src.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    let m: RegExpMatchArray | null;
    if (!line.trim()) {
      if (blocks.length && blocks[blocks.length - 1]!.type !== 'gap') blocks.push({ type: 'gap' });
    } else if ((m = line.match(/^#{1,3}\s+(.*)$/))) blocks.push({ type: 'h', inl: parseInline(m[1]!) });
    else if ((m = line.match(/^\s*[-•*]\s+(.*)$/))) blocks.push({ type: 'li', inl: parseInline(m[1]!) });
    else if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) blocks.push({ type: 'ol', n: m[1]!, inl: parseInline(m[2]!) });
    else if ((m = line.match(/^>\s?(.*)$/))) blocks.push({ type: 'quote', inl: parseInline(m[1]!) });
    else blocks.push({ type: 'p', inl: parseInline(line) });
  }
  while (blocks.length && blocks[blocks.length - 1]!.type === 'gap') blocks.pop();
  return blocks;
}

/** Teks polos (untuk pratinjau daftar & bagikan). */
export function plainText(src: string): string {
  return src
    .split('\n')
    .map((l) => l.replace(/^#{1,3}\s+/, '').replace(/^>\s?/, '“').replace(/^\s*[-*]\s+/, '• '))
    .join('\n')
    .replace(/\*\*([^*\n]+?)\*\*/g, '$1')
    .replace(/==([^=\n]+?)==/g, '$1')
    .replace(/(^|[^A-Za-z0-9])_([^_\n]+?)_(?![A-Za-z0-9])/g, '$1$2')
    .trim();
}

// ---------- Bantuan editor ----------

export type Sel = { start: number; end: number };
export type Edit = { text: string; sel: Sel };

/** Bungkus seleksi dengan penanda (**, _, ==); tanpa seleksi → kursor di tengah. */
export function wrapInline(text: string, sel: Sel, marker: string): Edit {
  const { start, end } = sel;
  const inner = text.slice(start, end);
  // Sudah terbungkus → lepas.
  if (text.slice(start - marker.length, start) === marker && text.slice(end, end + marker.length) === marker) {
    const t = text.slice(0, start - marker.length) + inner + text.slice(end + marker.length);
    return { text: t, sel: { start: start - marker.length, end: end - marker.length } };
  }
  const t = text.slice(0, start) + marker + inner + marker + text.slice(end);
  return { text: t, sel: { start: start + marker.length, end: end + marker.length } };
}

const LINE_PREFIX = /^(#{1,3}\s+|\s*[-•*]\s+|\s*\d+[.)]\s+|>\s?)/;

/** Pasang/lepas awalan baris (# , - , 1. , > ) untuk semua baris yang terseleksi. */
export function toggleLinePrefix(text: string, sel: Sel, kind: 'h' | 'li' | 'ol' | 'quote'): Edit {
  const ls = text.lastIndexOf('\n', sel.start - 1) + 1;
  let le = text.indexOf('\n', sel.end);
  if (le === -1) le = text.length;
  const lines = text.slice(ls, le).split('\n');
  const want = (i: number) => (kind === 'h' ? '# ' : kind === 'li' ? '- ' : kind === 'ol' ? `${i + 1}. ` : '> ');
  const has = (l: string) =>
    kind === 'h' ? /^#{1,3}\s+/.test(l) : kind === 'li' ? /^\s*[-•*]\s+/.test(l) : kind === 'ol' ? /^\s*\d+[.)]\s+/.test(l) : /^>\s?/.test(l);
  const allHave = lines.every(has);
  const next = lines.map((l, i) => (allHave ? l.replace(LINE_PREFIX, '') : want(i) + l.replace(LINE_PREFIX, '')));
  const block = next.join('\n');
  const t = text.slice(0, ls) + block + text.slice(le);
  const delta = block.length - (le - ls);
  return { text: t, sel: lines.length === 1 ? { start: ls + block.length, end: ls + block.length } : { start: ls, end: le + delta } };
}

/** Sisipkan teks di posisi kursor (blok baru → di baris sendiri). */
export function insertBlock(text: string, sel: Sel, block: string): Edit {
  const before = text.slice(0, sel.start);
  const after = text.slice(sel.end);
  const pre = before && !before.endsWith('\n') ? '\n' : '';
  const post = after && !after.startsWith('\n') ? '\n' : '';
  const t = before + pre + block + post + after;
  const c = before.length + pre.length + block.length;
  return { text: t, sel: { start: c, end: c } };
}

/**
 * Lanjutkan daftar otomatis: Enter setelah "- isi" → "- " baru; Enter pada
 * poin kosong → keluar dari daftar. `prev` = teks sebelum perubahan.
 */
export function continueList(prev: string, next: string, cursor: number): Edit | null {
  if (next.length !== prev.length + 1 || next[cursor - 1] !== '\n') return null;
  if (next.slice(0, cursor - 1) + next.slice(cursor) !== prev) return null;
  const ls = next.lastIndexOf('\n', cursor - 2) + 1;
  const line = next.slice(ls, cursor - 1);
  const m = line.match(/^(\s*)([-•*]|\d+[.)])\s+(.*)$/);
  if (!m) return null;
  if (!m[3]!.trim()) {
    // Poin kosong → hapus awalan & baris baru.
    const t = next.slice(0, ls) + next.slice(cursor);
    return { text: t, sel: { start: ls, end: ls } };
  }
  const num = m[2]!.match(/^(\d+)([.)])$/);
  const prefix = `${m[1]}${num ? `${Number(num[1]) + 1}${num[2]}` : m[2]} `;
  const t = next.slice(0, cursor) + prefix + next.slice(cursor);
  return { text: t, sel: { start: cursor + prefix.length, end: cursor + prefix.length } };
}
