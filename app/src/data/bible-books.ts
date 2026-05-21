/**
 * Metadata 66 kitab Alkitab TB LAI (Terjemahan Baru Lembaga Alkitab
 * Indonesia). Total chapter per kitab sesuai standar TB LAI.
 *
 * Singkatan pakai konvensi TB LAI populer (Kej, Kel, Im, ... Why).
 */
import type { BibleBook } from '@/types/bible';

export const BIBLE_BOOKS: BibleBook[] = [
  // ===== Perjanjian Lama (39 kitab) =====
  // Pentateukh (Taurat) — 5 kitab
  { id: 1, nama: 'Kejadian', singkatan: 'Kej', namaEn: 'Genesis', totalBab: 50, testament: 'OT' },
  { id: 2, nama: 'Keluaran', singkatan: 'Kel', namaEn: 'Exodus', totalBab: 40, testament: 'OT' },
  { id: 3, nama: 'Imamat', singkatan: 'Im', namaEn: 'Leviticus', totalBab: 27, testament: 'OT' },
  { id: 4, nama: 'Bilangan', singkatan: 'Bil', namaEn: 'Numbers', totalBab: 36, testament: 'OT' },
  { id: 5, nama: 'Ulangan', singkatan: 'Ul', namaEn: 'Deuteronomy', totalBab: 34, testament: 'OT' },
  // Sejarah — 12 kitab
  { id: 6, nama: 'Yosua', singkatan: 'Yos', namaEn: 'Joshua', totalBab: 24, testament: 'OT' },
  { id: 7, nama: 'Hakim-Hakim', singkatan: 'Hak', namaEn: 'Judges', totalBab: 21, testament: 'OT' },
  { id: 8, nama: 'Rut', singkatan: 'Rut', namaEn: 'Ruth', totalBab: 4, testament: 'OT' },
  { id: 9, nama: '1 Samuel', singkatan: '1Sam', namaEn: '1 Samuel', totalBab: 31, testament: 'OT' },
  { id: 10, nama: '2 Samuel', singkatan: '2Sam', namaEn: '2 Samuel', totalBab: 24, testament: 'OT' },
  { id: 11, nama: '1 Raja-Raja', singkatan: '1Raj', namaEn: '1 Kings', totalBab: 22, testament: 'OT' },
  { id: 12, nama: '2 Raja-Raja', singkatan: '2Raj', namaEn: '2 Kings', totalBab: 25, testament: 'OT' },
  { id: 13, nama: '1 Tawarikh', singkatan: '1Taw', namaEn: '1 Chronicles', totalBab: 29, testament: 'OT' },
  { id: 14, nama: '2 Tawarikh', singkatan: '2Taw', namaEn: '2 Chronicles', totalBab: 36, testament: 'OT' },
  { id: 15, nama: 'Ezra', singkatan: 'Ezr', namaEn: 'Ezra', totalBab: 10, testament: 'OT' },
  { id: 16, nama: 'Nehemia', singkatan: 'Neh', namaEn: 'Nehemiah', totalBab: 13, testament: 'OT' },
  { id: 17, nama: 'Ester', singkatan: 'Est', namaEn: 'Esther', totalBab: 10, testament: 'OT' },
  // Puisi & Hikmat — 5 kitab
  { id: 18, nama: 'Ayub', singkatan: 'Ayb', namaEn: 'Job', totalBab: 42, testament: 'OT' },
  { id: 19, nama: 'Mazmur', singkatan: 'Mzm', namaEn: 'Psalms', totalBab: 150, testament: 'OT' },
  { id: 20, nama: 'Amsal', singkatan: 'Ams', namaEn: 'Proverbs', totalBab: 31, testament: 'OT' },
  { id: 21, nama: 'Pengkhotbah', singkatan: 'Pkh', namaEn: 'Ecclesiastes', totalBab: 12, testament: 'OT' },
  { id: 22, nama: 'Kidung Agung', singkatan: 'Kid', namaEn: 'Song of Songs', totalBab: 8, testament: 'OT' },
  // Nabi Besar — 5 kitab
  { id: 23, nama: 'Yesaya', singkatan: 'Yes', namaEn: 'Isaiah', totalBab: 66, testament: 'OT' },
  { id: 24, nama: 'Yeremia', singkatan: 'Yer', namaEn: 'Jeremiah', totalBab: 52, testament: 'OT' },
  { id: 25, nama: 'Ratapan', singkatan: 'Rat', namaEn: 'Lamentations', totalBab: 5, testament: 'OT' },
  { id: 26, nama: 'Yehezkiel', singkatan: 'Yeh', namaEn: 'Ezekiel', totalBab: 48, testament: 'OT' },
  { id: 27, nama: 'Daniel', singkatan: 'Dan', namaEn: 'Daniel', totalBab: 12, testament: 'OT' },
  // Nabi Kecil — 12 kitab
  { id: 28, nama: 'Hosea', singkatan: 'Hos', namaEn: 'Hosea', totalBab: 14, testament: 'OT' },
  { id: 29, nama: 'Yoel', singkatan: 'Yl', namaEn: 'Joel', totalBab: 3, testament: 'OT' },
  { id: 30, nama: 'Amos', singkatan: 'Am', namaEn: 'Amos', totalBab: 9, testament: 'OT' },
  { id: 31, nama: 'Obaja', singkatan: 'Ob', namaEn: 'Obadiah', totalBab: 1, testament: 'OT' },
  { id: 32, nama: 'Yunus', singkatan: 'Yun', namaEn: 'Jonah', totalBab: 4, testament: 'OT' },
  { id: 33, nama: 'Mikha', singkatan: 'Mi', namaEn: 'Micah', totalBab: 7, testament: 'OT' },
  { id: 34, nama: 'Nahum', singkatan: 'Nah', namaEn: 'Nahum', totalBab: 3, testament: 'OT' },
  { id: 35, nama: 'Habakuk', singkatan: 'Hab', namaEn: 'Habakkuk', totalBab: 3, testament: 'OT' },
  { id: 36, nama: 'Zefanya', singkatan: 'Zef', namaEn: 'Zephaniah', totalBab: 3, testament: 'OT' },
  { id: 37, nama: 'Hagai', singkatan: 'Hag', namaEn: 'Haggai', totalBab: 2, testament: 'OT' },
  { id: 38, nama: 'Zakharia', singkatan: 'Za', namaEn: 'Zechariah', totalBab: 14, testament: 'OT' },
  { id: 39, nama: 'Maleakhi', singkatan: 'Mal', namaEn: 'Malachi', totalBab: 4, testament: 'OT' },

  // ===== Perjanjian Baru (27 kitab) =====
  // Injil + Kisah — 5 kitab
  { id: 40, nama: 'Matius', singkatan: 'Mat', namaEn: 'Matthew', totalBab: 28, testament: 'NT' },
  { id: 41, nama: 'Markus', singkatan: 'Mrk', namaEn: 'Mark', totalBab: 16, testament: 'NT' },
  { id: 42, nama: 'Lukas', singkatan: 'Luk', namaEn: 'Luke', totalBab: 24, testament: 'NT' },
  { id: 43, nama: 'Yohanes', singkatan: 'Yoh', namaEn: 'John', totalBab: 21, testament: 'NT' },
  { id: 44, nama: 'Kisah Para Rasul', singkatan: 'Kis', namaEn: 'Acts', totalBab: 28, testament: 'NT' },
  // Surat Paulus — 13 kitab
  { id: 45, nama: 'Roma', singkatan: 'Rm', namaEn: 'Romans', totalBab: 16, testament: 'NT' },
  { id: 46, nama: '1 Korintus', singkatan: '1Kor', namaEn: '1 Corinthians', totalBab: 16, testament: 'NT' },
  { id: 47, nama: '2 Korintus', singkatan: '2Kor', namaEn: '2 Corinthians', totalBab: 13, testament: 'NT' },
  { id: 48, nama: 'Galatia', singkatan: 'Gal', namaEn: 'Galatians', totalBab: 6, testament: 'NT' },
  { id: 49, nama: 'Efesus', singkatan: 'Ef', namaEn: 'Ephesians', totalBab: 6, testament: 'NT' },
  { id: 50, nama: 'Filipi', singkatan: 'Flp', namaEn: 'Philippians', totalBab: 4, testament: 'NT' },
  { id: 51, nama: 'Kolose', singkatan: 'Kol', namaEn: 'Colossians', totalBab: 4, testament: 'NT' },
  { id: 52, nama: '1 Tesalonika', singkatan: '1Tes', namaEn: '1 Thessalonians', totalBab: 5, testament: 'NT' },
  { id: 53, nama: '2 Tesalonika', singkatan: '2Tes', namaEn: '2 Thessalonians', totalBab: 3, testament: 'NT' },
  { id: 54, nama: '1 Timotius', singkatan: '1Tim', namaEn: '1 Timothy', totalBab: 6, testament: 'NT' },
  { id: 55, nama: '2 Timotius', singkatan: '2Tim', namaEn: '2 Timothy', totalBab: 4, testament: 'NT' },
  { id: 56, nama: 'Titus', singkatan: 'Tit', namaEn: 'Titus', totalBab: 3, testament: 'NT' },
  { id: 57, nama: 'Filemon', singkatan: 'Flm', namaEn: 'Philemon', totalBab: 1, testament: 'NT' },
  // Surat Umum — 8 kitab
  { id: 58, nama: 'Ibrani', singkatan: 'Ibr', namaEn: 'Hebrews', totalBab: 13, testament: 'NT' },
  { id: 59, nama: 'Yakobus', singkatan: 'Yak', namaEn: 'James', totalBab: 5, testament: 'NT' },
  { id: 60, nama: '1 Petrus', singkatan: '1Ptr', namaEn: '1 Peter', totalBab: 5, testament: 'NT' },
  { id: 61, nama: '2 Petrus', singkatan: '2Ptr', namaEn: '2 Peter', totalBab: 3, testament: 'NT' },
  { id: 62, nama: '1 Yohanes', singkatan: '1Yoh', namaEn: '1 John', totalBab: 5, testament: 'NT' },
  { id: 63, nama: '2 Yohanes', singkatan: '2Yoh', namaEn: '2 John', totalBab: 1, testament: 'NT' },
  { id: 64, nama: '3 Yohanes', singkatan: '3Yoh', namaEn: '3 John', totalBab: 1, testament: 'NT' },
  { id: 65, nama: 'Yudas', singkatan: 'Yud', namaEn: 'Jude', totalBab: 1, testament: 'NT' },
  // Apokaliptik — 1 kitab
  { id: 66, nama: 'Wahyu', singkatan: 'Why', namaEn: 'Revelation', totalBab: 22, testament: 'NT' },
];

/** Map cepat by id */
export const BIBLE_BOOK_BY_ID = new Map(BIBLE_BOOKS.map((b) => [b.id, b]));

/** Cari kitab by nama (case-insensitive, support singkatan & nama EN) */
export function findBook(query: string): BibleBook | undefined {
  const q = query.trim().toLowerCase();
  return BIBLE_BOOKS.find(
    (b) =>
      b.nama.toLowerCase() === q ||
      b.singkatan.toLowerCase() === q ||
      b.namaEn.toLowerCase() === q,
  );
}

export const OT_BOOKS = BIBLE_BOOKS.filter((b) => b.testament === 'OT');
export const NT_BOOKS = BIBLE_BOOKS.filter((b) => b.testament === 'NT');
