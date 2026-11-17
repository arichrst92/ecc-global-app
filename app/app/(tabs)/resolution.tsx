/**
 * Tab Resolusi (menu bawah). Isi sama dengan /resolusi, tanpa tombol kembali.
 * Mode tamu → ajakan daftar (resolusi tersimpan di akun).
 */
import { useTranslation } from 'react-i18next';

import { ResolusiScreen } from '@/features/resolusi/ResolusiScreen';
import { GuestTabPrompt } from '@/components/guest/GuestTabPrompt';
import { useAuthStore } from '@/stores/auth.store';

export default function ResolusiTab() {
  const { t } = useTranslation();
  const isGuest = useAuthStore((s) => s.isGuest);
  if (isGuest) return <GuestTabPrompt title={t('resolusi.guest_title')} body={t('resolusi.guest_body')} />;
  return <ResolusiScreen asTab />;
}
