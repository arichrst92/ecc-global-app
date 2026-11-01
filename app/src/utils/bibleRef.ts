/**
 * Parse referensi ayat yang diketik bebas: "Yoh 3:16", "1 Kor 13:4-7",
 * "john 3.16", "Mazmur 23" → { book, bab, from?, to? }.
 */
import { BIBLE_BOOKS } from '@/data/bible-books';
import { ABBR_EN } from '@/utils/bibleNames';
import type { BibleBook } from '@/types/bible';

export type BibleRef = { book: BibleBook; bab: number; from: number | null; to: number | null };

const norm = (s: string) => s.toLowerCase().replace(/[\s.\-]/g, '');

export function findBookLoose(q: string): BibleBook | undefined {
  const n = norm(q);
  if (!n) return undefined;
  const keys = (b: BibleBook) => [b.nama, b.singkatan, b.namaEn, ABBR_EN[b.id - 1] ?? ''].map(norm);
  return (
    BIBLE_BOOKS.find((b) => keys(b).includes(n)) ??
    (n.length >= 2 ? BIBLE_BOOKS.find((b) => keys(b).some((k) => k.startsWith(n))) : undefined)
  );
}

export function parseBibleRef(input: string): BibleRef | null {
  const m = input
    .trim()
    .match(/^(\d?\s*[^\d\s][^\d]*?)\s*(\d+)(?:\s*[:.]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
  if (!m) return null;
  const book = findBookLoose(m[1]!);
  if (!book) return null;
  const bab = Number(m[2]);
  if (bab < 1 || bab > book.totalBab) return null;
  const from = m[3] ? Number(m[3]) : null;
  let to = m[4] ? Number(m[4]) : null;
  if (from !== null && to !== null && to < from) to = null;
  return { book, bab, from, to };
}

export function formatRef(r: BibleRef, name: string): string {
  if (r.from === null) return `${name} ${r.bab}`;
  return `${name} ${r.bab}:${r.from}${r.to && r.to !== r.from ? `-${r.to}` : ''}`;
}
