/**
 * Ayat untuk kartu share "Doa terjawab". Dipilih tetap per permohonan doa
 * (berdasarkan id) supaya kartu yang dibagikan ulang tetap sama.
 * Hanya ayat dengan penomoran sama di versi Indonesia & Inggris (tanpa judul
 * Mazmur yang menggeser nomor ayat).
 */
export const ANSWERED_VERSES: Array<{ bookId: number; bab: number; ayat: number }> = [
  { bookId: 19, bab: 118, ayat: 1 }, // Mazmur 118:1
  { bookId: 19, bab: 116, ayat: 1 }, // Mazmur 116:1
  { bookId: 19, bab: 107, ayat: 1 }, // Mazmur 107:1
  { bookId: 62, bab: 5, ayat: 14 }, // 1 Yohanes 5:14
  { bookId: 24, bab: 33, ayat: 3 }, // Yeremia 33:3
  { bookId: 50, bab: 4, ayat: 6 }, // Filipi 4:6
  { bookId: 40, bab: 7, ayat: 7 }, // Matius 7:7
];

export function answeredVerseFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ANSWERED_VERSES[h % ANSWERED_VERSES.length]!;
}
