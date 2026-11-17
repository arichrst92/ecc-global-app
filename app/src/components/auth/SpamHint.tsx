/**
 * Kotak pengingat "cek folder Spam" — dipakai di semua layar yang mengirim
 * sesuatu ke email (OTP email, magic link, verifikasi email, klaim data lama).
 */
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MailWarning } from 'lucide-react-native';

export function SpamHint({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <View className={`flex-row gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 ${className}`}>
      <MailWarning size={18} color="#B45309" style={{ marginTop: 1 }} />
      <Text className="flex-1 text-sm leading-5 text-amber-900">{t('auth.spam_hint')}</Text>
    </View>
  );
}
