/**
 * Nama & singkatan kitab mengikuti BAHASA versi Alkitab yang dipilih:
 * KJV (en) → "Matthew", "Matt"; BIMK (id) → "Matius", "Mat".
 */
import { useTranslation } from 'react-i18next';

import { BIBLE_VERSION_BY_CODE } from '@/data/bible';
import { useBibleStore } from '@/stores/bible.store';
import type { BibleBook, BibleVersionCode } from '@/types/bible';

/** Singkatan Inggris standar (urut id 1–66). */
const ABBR_EN = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr',
  'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel',
  'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal', 'Matt', 'Mark', 'Luke', 'John',
  'Acts', 'Rom', '1Cor', '2Cor', 'Gal', 'Eph', 'Phil', 'Col', '1Thess', '2Thess', '1Tim', '2Tim', 'Titus',
  'Phlm', 'Heb', 'Jas', '1Pet', '2Pet', '1John', '2John', '3John', 'Jude', 'Rev',
];

export const isEnglishVersion = (code: BibleVersionCode) => BIBLE_VERSION_BY_CODE.get(code)?.language === 'en';

export function bookName(book: Pick<BibleBook, 'nama' | 'namaEn'>, code: BibleVersionCode): string {
  return isEnglishVersion(code) ? book.namaEn || book.nama : book.nama;
}

export function bookAbbr(book: Pick<BibleBook, 'id' | 'singkatan'>, code: BibleVersionCode): string {
  return isEnglishVersion(code) ? ABBR_EN[book.id - 1] ?? book.singkatan : book.singkatan;
}

/**
 * Hook: nama/singkatan kitab + label konten Alkitab (Perjanjian Lama/Baru,
 * jumlah pasal, dst.) dalam bahasa versi yang sedang dipilih.
 */
export function useBookNames() {
  const code = useBibleStore((s) => s.selectedVersionCode);
  const { t } = useTranslation();
  const lng = isEnglishVersion(code) ? 'en' : 'id';
  return {
    code,
    lng,
    /** Terjemahan label konten mengikuti bahasa versi Alkitab (bukan bahasa app). */
    tc: (key: string, opts?: Record<string, unknown>) => t(key, { ...opts, lng }),
    name: (b: Pick<BibleBook, 'nama' | 'namaEn'>) => bookName(b, code),
    abbr: (b: Pick<BibleBook, 'id' | 'singkatan'>) => bookAbbr(b, code),
  };
}
