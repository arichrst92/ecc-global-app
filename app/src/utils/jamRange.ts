/** "19:00" + "21:00" → "19:00–21:00"; hanya mulai → "19:00"; kosong → "". */
export function jamRange(mulai?: string | null, selesai?: string | null): string {
  if (!mulai) return '';
  return selesai ? `${mulai}–${selesai}` : mulai;
}
