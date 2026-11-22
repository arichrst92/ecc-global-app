/**
 * Zona waktu cabang untuk mengonversi jam jadwal ibadah/event ke zona HP.
 * Urutan: cabang yang diminta → cabang yang sedang dilihat → default.
 */
import { useBranches } from '@/hooks/useBranches';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { DEFAULT_VENUE_TZ, cabangCity } from '@/utils/time';

export function useVenueTz(cabangId?: string | null, explicitTz?: string | null): string {
  const branches = useBranches();
  const { branch } = useViewingBranch();
  if (explicitTz) return explicitTz;
  const fromList = cabangId ? branches.data?.find((b) => b.id === cabangId)?.timezone : null;
  return fromList || branch?.timezone || DEFAULT_VENUE_TZ;
}

/**
 * Kota cabang untuk label zona waktu ("Waktu Bali"), urutan sama dengan
 * `useVenueTz`. `explicitNama` = nama cabang dari data (mis. event.cabang.nama).
 */
export function useVenueCity(cabangId?: string | null, explicitNama?: string | null): string | null {
  const branches = useBranches();
  const { branch } = useViewingBranch();
  if (explicitNama) return cabangCity(explicitNama);
  const fromList = cabangId ? branches.data?.find((b) => b.id === cabangId)?.nama : null;
  return cabangCity(fromList || branch?.nama);
}

/** Map id cabang → kota (untuk daftar campuran beberapa cabang). */
export function useCabangCityMap(): (cabangId?: string | null, nama?: string | null) => string | null {
  const branches = useBranches();
  return (cabangId, nama) =>
    cabangCity(nama || (cabangId ? branches.data?.find((b) => b.id === cabangId)?.nama : null));
}
