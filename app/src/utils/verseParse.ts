/**
 * Urai tulisan ayat bebas dari Portal (mis. "Mazmur 23:1-3", "1 Kor 13:4–7",
 * "Yohanes 3:16 (BIMK)", "John 3:16 KJV") → kitab / pasal / ayat + versi.
 *
 * Versi "sesuai konten": kode versi yang tertulis (BIMK/KJV) dipakai; tanpa
 * kode → nama kitab Inggris = KJV, selain itu BIMK (TB belum tersedia di app).
 * Tidak terbaca → null (kartu menampilkan tulisan aslinya saja).
 */
import { BIBLE_BOOKS } from '@/data/bible-books';
import { BIBLE_VERSIONS } from '@/data/bible';
import type { BibleVersionCode } from '@/types/bible';
import type { VerseLink } from '@/components/bible/verseRef';

const norm = (s: string) => s.toLowerCase().replace(/[.\s]/g, '').replace(/-/g, '');

type Hit = { id: number; en: boolean };
const INDEX = new Map<string, Hit>();
for (const b of BIBLE_BOOKS) {
  INDEX.set(norm(b.nama), { id: b.id, en: false });
  INDEX.set(norm(b.singkatan), { id: b.id, en: false });
  if (b.namaEn) INDEX.set(norm(b.namaEn), { id: b.id, en: true });
}
// Sebutan umum yang berbeda dari daftar kitab.
for (const [alias, id, en] of [
  ['mzm', 19, false],
  ['maz', 19, false],
  ['psalm', 19, true],
  ['kidungagung', 22, false],
  ['songofsongs', 22, true],
  ['wahyu', 66, false],
  ['revelations', 66, true],
] as const)
  INDEX.set(alias, { id, en });

const CODES = BIBLE_VERSIONS.map((v) => v.code);

export function parseVerseRef(raw: string | null | undefined): VerseLink | null {
  if (!raw) return null;
  let s = raw.trim();
  let versi: BibleVersionCode | null = null;
  for (const c of CODES) {
    const re = new RegExp(`[\\s(\\[,·-]*\\b${c}\\b[)\\]]*`, 'i');
    if (re.test(s)) {
      versi = c;
      s = s.replace(re, ' ').trim();
    }
  }
  const m = /^(.+?)\s*(\d+)\s*[:.]\s*(\d+)(?:\s*[-–—]\s*(\d+))?/.exec(s.replace(/\s+/g, ' '));
  if (!m) return null;
  const hit = INDEX.get(norm(m[1]!));
  if (!hit) return null;
  const bab = Number(m[2]);
  const mulai = Number(m[3]);
  const selesai = m[4] ? Number(m[4]) : null;
  const book = BIBLE_BOOKS.find((b) => b.id === hit.id);
  if (!book || bab < 1 || bab > book.totalBab || mulai < 1) return null;
  return { versi: versi ?? (hit.en ? 'KJV' : 'BIMK'), kitab: hit.id, bab, mulai, selesai: selesai && selesai > mulai ? selesai : null };
}
