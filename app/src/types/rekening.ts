// Rekening per cabang (untuk Persembahan)
// Per mobile-api-guide section 8.1

export type Rekening = {
  id: string;
  /** Tujuan rekening — mis. "Persembahan Umum", "Pembangunan", "Diakonia", "Misi" */
  purpose: string;
  bankNama: string;
  bankNomor: string;
  bankAtasNama: string;
  /** URL relatif QRIS image — null kalau cabang belum upload QRIS untuk rekening ini */
  qrisImageUrl?: string | null;
  catatan?: string | null;
  isActive: boolean;
};
