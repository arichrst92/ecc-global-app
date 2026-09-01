import { useLocalSearchParams } from 'expo-router';

import { BebasWebRedirect } from '@/components/event/BebasWebRedirect';

/**
 * Event Donate Screen — always redirect ke web untuk NOMINAL_BEBAS event
 * (Apple Guideline 3.2.2(iv) charitable donation must be external).
 *
 * Full BEBAS donation flow (create donation, upload bukti, multi-donation)
 * dihapus di v1.9.3 karena semua tipe event yang butuh donasi sekarang
 * routed ke web. Screen ini defensive-only untuk deeplink `ecc://event/:id/donate`.
 *
 * Untuk NOMINAL_TETAP payment (upload bukti ticket fixed price), pakai
 * `payment.tsx` (in-app, Apple 3.1.5b physical goods allowed).
 */
export default function EventDonateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <BebasWebRedirect eventId={id} />;
}
