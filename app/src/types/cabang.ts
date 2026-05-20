// Cabang types — per BE response di docs/backend-request-cabang-list.md (2026-05-21)

export type Cabang = {
  id: string;
  nama: string; // "ECC Jakarta"
  kode: string; // 3-letter, mis. "JKT"
  alamat: string; // free text, mis. "Jl. Sudirman No.1, Jakarta Pusat"
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
};

/**
 * BE tidak return field `kota` terpisah — workaround: strip "ECC " prefix dari nama.
 * Berlaku untuk seed cabang saat ini (konvensi naming "ECC <Kota>").
 */
export function cabangKota(c: Cabang): string {
  return c.nama.replace(/^ECC\s+/i, '').trim();
}
