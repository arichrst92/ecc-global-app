/**
 * Bible content loader.
 *
 * Memuat 2 versi Alkitab yang di-bundle di mobile asset:
 * - BIMK (Bahasa Indonesia Masa Kini) — © LAI 1985
 * - KJV (King James Version 1769) — Public Domain
 *
 * Schema JSON per versi: lihat README.md di folder ini.
 *
 * Lazy-load per versi: masing-masing versi JSON (~5MB) hanya di-`import()`
 * saat pertama kali dibutuhkan (bukan di-static-import keduanya sekaligus),
 * supaya user yang tidak pernah buka Bible atau cuma baca 1 versi tidak
 * menanggung ~10MB payload di memory. Hasil load di-cache di module-level
 * Map supaya subsequent calls tidak re-load / re-parse.
 */
import type {
  BibleBook,
  BibleChapter,
  BibleVerse,
  BibleVersionCode,
  BibleVersionMeta,
} from '@/types/bible';

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

/** Cache versi yang sudah di-load — key versionCode. */
const cache = new Map<BibleVersionCode, RawBible>();
/** In-flight load promises — cegah duplicate concurrent import() untuk versi yang sama. */
const pending = new Map<BibleVersionCode, Promise<RawBible | null>>();

async function loadVersion(
  versionCode: BibleVersionCode,
): Promise<RawBible | null> {
  const cached = cache.get(versionCode);
  if (cached) return cached;

  const inFlight = pending.get(versionCode);
  if (inFlight) return inFlight;

  const promise = (async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mod: any = null;
    if (versionCode === 'BIMK') {
      mod = await import('./bimk.json');
    } else if (versionCode === 'KJV') {
      mod = await import('./kjv.json');
    }
    if (!mod) return null;
    const data = (mod.default ?? mod) as RawBible;
    cache.set(versionCode, data);
    return data;
  })();

  pending.set(versionCode, promise);
  try {
    return await promise;
  } finally {
    pending.delete(versionCode);
  }
}

/**
 * Preload a version in the background (fire-and-forget). Panggil dari Bible
 * home screen untuk pre-fetch versi default supaya UX tidak lag saat user
 * tap chapter pertama kali.
 */
export function preloadVersion(versionCode: BibleVersionCode): void {
  void loadVersion(versionCode);
}

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
 * Get a chapter from the specified version. Async — versi JSON di-lazy-load
 * on-demand (lihat loadVersion di atas), lalu di-cache untuk call berikutnya.
 * Returns null kalau bookId / bab di luar range.
 */
export async function getChapter(
  versionCode: BibleVersionCode,
  bookId: number,
  bab: number,
): Promise<BibleChapter | null> {
  const raw = await loadVersion(versionCode);
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
export async function hasChapter(
  versionCode: BibleVersionCode,
  bookId: number,
  bab: number,
): Promise<boolean> {
  return (await getChapter(versionCode, bookId, bab)) !== null;
}

/** Get a single verse (untuk verse-of-day lookup). */
export async function getVerse(
  versionCode: BibleVersionCode,
  bookId: number,
  bab: number,
  nomor: number,
): Promise<BibleVerse | null> {
  const chapter = await getChapter(versionCode, bookId, bab);
  if (!chapter) return null;
  return chapter.ayat.find((v) => v.nomor === nomor) ?? null;
}

/** Map standardized 3-letter code → numeric id 1-66 (untuk debug / future use). */
export async function getBookByCode(
  versionCode: BibleVersionCode,
  code: string,
): Promise<BibleBook | null> {
  const raw = await loadVersion(versionCode);
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
