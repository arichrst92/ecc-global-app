/**
 * Tautan ayat (versi + kitab + bab + ayat/rentang) — dipakai resolusi & kartu share.
 */
import { BIBLE_BOOK_BY_ID } from '@/data/bible-books';
import { BIBLE_VERSION_BY_CODE, getChapter } from '@/data/bible';
import { bookName } from '@/utils/bibleNames';
import { ELS_APP_LINKS } from '@/utils/shareApp';
import type { BibleVersionCode } from '@/types/bible';

export type VerseLink = { versi: string; kitab: number; bab: number; mulai: number; selesai?: number | null };

const asCode = (v: string): BibleVersionCode => (BIBLE_VERSION_BY_CODE.has(v as BibleVersionCode) ? (v as BibleVersionCode) : 'BIMK');

/** "Mazmur 23:1-3" (nama kitab mengikuti bahasa versi). */
export function verseRefText(a: VerseLink): string {
  const book = BIBLE_BOOK_BY_ID.get(a.kitab);
  const name = book ? bookName(book, asCode(a.versi)) : `#${a.kitab}`;
  const range = a.selesai && a.selesai > a.mulai ? `${a.mulai}-${a.selesai}` : `${a.mulai}`;
  return `${name} ${a.bab}:${range}`;
}

/** "Mazmur 23:1-3 · BIMK" */
export function verseRefWithVersion(a: VerseLink): string {
  return `${verseRefText(a)} · ${BIBLE_VERSION_BY_CODE.get(asCode(a.versi))?.shortName ?? a.versi}`;
}

/** Teks ayat (gabungan bila rentang); null bila versi/ayat tidak tersedia. */
export async function verseText(a: VerseLink): Promise<string | null> {
  const ch = await getChapter(asCode(a.versi), a.kitab, a.bab).catch(() => null);
  if (!ch) return null;
  const end = a.selesai && a.selesai > a.mulai ? a.selesai : a.mulai;
  const parts = ch.ayat.filter((v) => (v.nomorEnd ?? v.nomor) >= a.mulai && v.nomor <= end).map((v) => v.teks);
  return parts.length ? parts.join(' ') : null;
}

/** Tautan untuk dibuka (Els App web → pembaca Alkitab di bab tsb). */
export function verseWebLink(a: VerseLink): string {
  return `${ELS_APP_LINKS.web}/bible/${a.kitab}/${a.bab}`;
}
