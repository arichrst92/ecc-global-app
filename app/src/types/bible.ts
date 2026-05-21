/**
 * Tipe data untuk fitur Alkitab.
 *
 * Bundle content TB LAI di asset (lihat src/data/bible-books.ts + bible-
 * sample-content.ts). Saat ini ship dengan metadata 66 kitab lengkap +
 * curated sample chapters (Mazmur 23, Yohanes 3, dll). Chapter yang belum
 * ada content-nya akan tampil sebagai placeholder dengan notice.
 *
 * Backend endpoint untuk full content akan dirancang nanti — lihat
 * docs/backend-request-bible-content.md.
 */

export type Testament = 'OT' | 'NT';

export type BibleBook = {
  /** Indeks 1-66 (Kejadian = 1, Wahyu = 66) */
  id: number;
  /** Nama Indonesia: "Kejadian", "Mazmur", "Yohanes" */
  nama: string;
  /** Singkatan lokal: "Kej", "Mzm", "Yoh" */
  singkatan: string;
  /** Nama Inggris untuk i18n EN: "Genesis", "Psalms", "John" */
  namaEn: string;
  /** Total bab dalam kitab ini */
  totalBab: number;
  /** OT (Perjanjian Lama) atau NT (Perjanjian Baru) */
  testament: Testament;
};

export type BibleVerse = {
  /** Nomor ayat (1-based) */
  nomor: number;
  /** Teks ayat */
  teks: string;
};

export type BibleChapter = {
  /** Referensi gabungan: "MZM 23" - dipakai sebagai key cache + bookmark */
  ref: string;
  /** ID kitab (1-66) */
  bookId: number;
  /** Nomor bab (1-based) */
  bab: number;
  /** List ayat */
  ayat: BibleVerse[];
};

export type BibleBookmark = {
  /** "MZM 23:1" */
  ref: string;
  bookId: number;
  bab: number;
  /** null = bookmark seluruh bab */
  ayat: number | null;
  /** ISO date saat di-bookmark */
  createdAt: string;
  /** Teks ayat untuk preview (kalau bookmark per-ayat) */
  preview?: string;
};

/** Verse of the day — di-rotate dari curated list berdasar tanggal */
export type VerseOfDay = {
  ref: string;
  bookId: number;
  bab: number;
  ayat: number;
  teks: string;
};

export type BibleFontSize = 'sm' | 'md' | 'lg' | 'xl';
