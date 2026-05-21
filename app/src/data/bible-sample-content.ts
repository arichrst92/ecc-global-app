/**
 * Curated sample content TB LAI untuk fitur Alkitab MVP.
 *
 * Sumber: TB LAI (Terjemahan Baru Lembaga Alkitab Indonesia). Konten ini
 * sengaja dibatasi ke pasal-pasal populer yang sering jadi bahan renungan
 * atau khotbah, supaya app bisa ship dengan content yang berarti tanpa
 * harus include full Alkitab (~5MB) atau dependency ke endpoint BE yang
 * belum ada.
 *
 * Setelah BE menyediakan endpoint /alkitab/:bookId/:bab, hooks akan
 * fallback ke sample content ini kalau request gagal/offline.
 *
 * Lihat docs/backend-request-bible-content.md untuk roadmap full content.
 */
import type { BibleChapter } from '@/types/bible';

import { kejadian1 } from './bible-chapters/kejadian-1';
import { mazmur1 } from './bible-chapters/mazmur-1';
import { mazmur23 } from './bible-chapters/mazmur-23';
import { mazmur91 } from './bible-chapters/mazmur-91';
import { mazmur121 } from './bible-chapters/mazmur-121';
import { amsal3 } from './bible-chapters/amsal-3';
import { yesaya40 } from './bible-chapters/yesaya-40';
import { matius5 } from './bible-chapters/matius-5';
import { matius6 } from './bible-chapters/matius-6';
import { yohanes1 } from './bible-chapters/yohanes-1';
import { yohanes3 } from './bible-chapters/yohanes-3';
import { yohanes14 } from './bible-chapters/yohanes-14';
import { roma8 } from './bible-chapters/roma-8';
import { roma12 } from './bible-chapters/roma-12';
import { korintus1_13 } from './bible-chapters/1korintus-13';
import { filipi4 } from './bible-chapters/filipi-4';
import { ibrani11 } from './bible-chapters/ibrani-11';

/** Map: ref ("MZM 23") -> BibleChapter */
export const SAMPLE_CHAPTERS: Map<string, BibleChapter> = new Map([
  ['KEJ 1', kejadian1],
  ['MZM 1', mazmur1],
  ['MZM 23', mazmur23],
  ['MZM 91', mazmur91],
  ['MZM 121', mazmur121],
  ['AMS 3', amsal3],
  ['YES 40', yesaya40],
  ['MAT 5', matius5],
  ['MAT 6', matius6],
  ['YOH 1', yohanes1],
  ['YOH 3', yohanes3],
  ['YOH 14', yohanes14],
  ['RM 8', roma8],
  ['RM 12', roma12],
  ['1KOR 13', korintus1_13],
  ['FLP 4', filipi4],
  ['IBR 11', ibrani11],
]);

/**
 * Build ref string dari book ID + bab.
 * Convention: pakai singkatan UPPERCASE biar konsisten.
 */
export function buildRef(bookId: number, bab: number, singkatan: string): string {
  return `${singkatan.toUpperCase()} ${bab}`;
}

export function getSampleChapter(ref: string): BibleChapter | undefined {
  return SAMPLE_CHAPTERS.get(ref.toUpperCase());
}

export function hasSampleChapter(ref: string): boolean {
  return SAMPLE_CHAPTERS.has(ref.toUpperCase());
}

/** List ref yang available di sample, sorted by book id + bab */
export function listSampleRefs(): string[] {
  return Array.from(SAMPLE_CHAPTERS.keys());
}
