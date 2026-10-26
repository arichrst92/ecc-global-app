/**
 * Tab "Reservasi" — tiket ibadah & event saya (isi = halaman Reservasi Saya).
 * Tamu (belum login) melihat jadwal ibadah publik.
 * Daftar jadwal ibadah tetap ada di tab tersembunyi /(tabs)/ibadah
 * (dibuka dari Quick Access Beranda / tombol kosong di sini / deeplink).
 */
import { GuestIbadahView } from '@/components/guest/GuestIbadahView';
import { useAuthStore } from '@/stores/auth.store';
import { MyReservasiView } from '../my-reservasi';

export default function ReservasiTab() {
  const isGuest = useAuthStore((s) => s.isGuest);
  if (isGuest) return <GuestIbadahView />;
  return <MyReservasiView inTab />;
}
