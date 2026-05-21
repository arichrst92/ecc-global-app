/**
 * Bible content loader.
 *
 * Memuat 2 versi Alkitab yang di-bundle di mobile asset:
 * - BIMK (Bahasa Indonesia Masa Kini) — © LAI 1985
 * - KJV (King James Version 1769) — Public Domain
 *
 * Schema JSON per versi: lihat README.md di folder ini.
 *
 * Note: Metro bundler will static-resolve both JSON imports — total bundle
 * size ~10MB. Acceptable for offline-first Bible reader. If size becomes
 * concern, switch to dynamic import (lazy load per version).
 */
import type {
  BibleBook,
  BibleChapter,
  BibleVerse,
  BibleVersionCode,
  BibleVersionMeta,
} from '@/types/bible';

import bimkData from './bimk.json';
import kjvData from './kjv.json';

type RawBible = {
  version: string;
  versionFullName: string;
  language: string;
  copyright: string;
  license: string;
  source?: string;
  books: Array<{
    id: string;
    numericId: number;
    nama: string;
    namaSingkat: string;
    testament: 'OT' | 'NT';
    order: number;
    chapterCount: number;
    chapters: Array<{
      bab: number;
      verses: Array<{ nomor: number; teks: string }>;
    }>;
  }>;
};

const VERSIONS: Record<BibleVersionCode, RawBible> = {
  BIMK: bimkData as RawBible,
  KJV: kjvData as RawBible,
};

/** Metadata semua versi (untuk UI picker). */
export const BIBLE_VERSIONS: BibleVersionMeta[] = [
  {
    code: 'BIMK',
    shortName: 'BIMK',
    fullName: 'Bahasa Indonesia Masa Kini',
    language: 'id',
    copyright: '© Lembaga Alkitab Indonesia 1985',
  },
  {
    code: 'KJV',
    shortName: 'KJV',
    fullName: 'King James Version',
    language: 'en',
    copyright: 'Public Domain (1769)',
  },
];

export const BIBLE_VERSION_BY_CODE = new Map(
  BIBLE_VERSIONS.map((v) => [v.code, v]),
);

/**
 * Get a chapter from the specified version.
 * Returns null kalau bookId / bab di luar range.
 */
export function getChapter(
  versionCode: BibleVersionCode,
  bookId: number,
  bab: number,
): BibleChapter | null {
  const raw = VERSIONS[versionCode];
  if (!raw) return null;

  const book = raw.books.find((b) => b.numericId === bookId);
  if (!book) return null;

  const chapter = book.chapters.find((c) => c.bab === bab);
  if (!chapter) return null;

  const ayat: BibleVerse[] = chapter.verses.map((v) => ({
    nomor: v.nomor,
    teks: v.teks,
  }));

  const ref = `${book.id} ${bab}`;
  return {
    ref,
    bookId,
    bab,
    ayat,
  };
}

/** Convenience untuk verify content available di versi tertentu. */
export function hasChapter(
  versionCode: BibleVersionCode,
  bookId: number,
  bab: number,
): boolean {
  return getChapter(versionCode, bookId, bab) !== null;
}

/** Get a single verse (untuk verse-of-day lookup). */
export function getVerse(
  versionCode: BibleVersionCode,
  bookId: number,
  bab: number,
  nomor: number,
): BibleVerse | null {
  const chapter = getChapter(versionCode, bookId, bab);
  if (!chapter) return null;
  return chapter.ayat.find((v) => v.nomor === nomor) ?? null;
}

/** Map standardized 3-letter code → numeric id 1-66 (untuk debug / future use). */
export function getBookByCode(
  versionCode: BibleVersionCode,
  code: string,
): BibleBook | null {
  const raw = VERSIONS[versionCode];
  if (!raw) return null;
  const book = raw.books.find((b) => b.id === code);
  if (!book) return null;
  return {
    id: book.numericId,
    nama: book.nama,
    singkatan: book.namaSingkat,
    namaEn: book.nama, // Per-version doesn't have separate EN name
    totalBab: book.chapterCount,
    testament: book.testament,
  };
}
