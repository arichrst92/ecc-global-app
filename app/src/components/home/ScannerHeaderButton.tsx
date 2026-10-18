/**
 * Ikon Scanner di header Home (kiri ikon QR) — hanya untuk petugas scanner
 * ibadah/event. Sebelumnya tile di Quick Access.
 */
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScanLine } from 'lucide-react-native';

import { useScannerEvents, useScannerIbadah } from '@/hooks/useScanner';

export function ScannerHeaderButton() {
  const { t } = useTranslation();
  const router = useRouter();
  const ev = useScannerEvents();
  const ib = useScannerIbadah();
  const authorized = (ev.data?.length ?? 0) > 0 || (ib.data?.length ?? 0) > 0;
  if (!authorized) return null;
  return (
    <Pressable
      onPress={() => router.push('/scanner')}
      className="bg-white/15 rounded-full p-2"
      accessibilityLabel={t('quickaccess.scanner')}
    >
      <ScanLine size={20} color="#fff" />
    </Pressable>
  );
}
