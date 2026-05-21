/**
 * Tipe data untuk fitur Alkitab.
 *
 * Bundle 2 versi di mobile asset (Opsi B per BE doc):
 * - BIMK (Bahasa Indonesia Masa Kini) — © LAI 1985, sourced via yukuku/
 *   alkitab.app catalog. Default Indonesian.
 * - KJV (King James Version 1769) — public domain, sourced via aruljohn/
 *   Bible-kjv GitHub.
 *
 * Loader: src/data/bible/index.ts → getChapter(version, bookId, bab).
 * Each version ~5MB JSON, total bundle ~10MB.
 */

export type Testament = 'OT' | 'NT';

/** Versi Alkitab yang di-bundle di app. */
export type BibleVersionCode = 'BIMK' | 'KJV';

export type BibleVersionMeta = {
  code: BibleVersionCode;
  /** Nama pendek untuk UI: "BIMK", "KJV" */
  shortName: string;
  /** Nama lengkap: "Bahasa Indonesia Masa Kini" */
  fullName: string;
  /** Bahasa kode: "id" atau "en" */
  language: 'id' | 'en';
  /** Copyright/source notice */
  copyright: string;
};

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
  /** Versi Alkitab saat bookmark dibuat. Optional untuk backward-compat
   * dengan bookmark lama dari era sample-only. */
  versionCode?: BibleVersionCode;
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
