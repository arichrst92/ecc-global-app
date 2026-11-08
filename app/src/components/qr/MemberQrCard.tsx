/**
 * Kartu QR jemaat — satu tampilan untuk Kartu QR (Beranda/Profil) dan QR CKids.
 * Avatar + nama (+ keterangan) di atas, kartu putih berisi QR, kode jemaat besar
 * di bawah. Teks putih → dipakai di atas latar oranye.
 */
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

import { Avatar } from '@/components/ui/Avatar';
import { gx } from '@/theme/gradient';

export function MemberQrCard({
  namaLengkap,
  fotoUrl,
  kode,
  subtitle,
  revealed = true,
  onReveal,
}: {
  namaLengkap: string;
  fotoUrl?: string | null;
  kode: string | null | undefined;
  /** Baris kecil di bawah nama (mis. "Anggota keluarga", "120 poin"). */
  subtitle?: string | null;
  /** false → QR diburamkan (Kartu QR auto-blur). */
  revealed?: boolean;
  onReveal?: () => void;
}) {
  const { t } = useTranslation();
  const hasKode = !!kode && kode.trim().length > 0;
  return (
    <View className="items-center">
      <View className="items-center mb-3">
        <Avatar name={namaLengkap} fotoUrl={fotoUrl} size={48} className="bg-white/20 mb-2" />
        <Text className="text-white text-lg font-bold text-center" numberOfLines={1}>
          {namaLengkap}
        </Text>
        {subtitle ? <Text className="text-white/70 text-xs">{subtitle}</Text> : null}
      </View>

      <View className="bg-card rounded-3xl p-5" style={{ elevation: 8 }}>
        {hasKode ? (
          <View style={{ opacity: revealed ? 1 : 0.25 }}>
            <QRCode value={kode!} size={220} color="#0A0A0A" backgroundColor="#FFFFFF" quietZone={10} />
          </View>
        ) : (
          <View className="items-center justify-center bg-neutral-100 rounded-2xl" style={{ width: 220, height: 220 }}>
            <Text className="text-neutral-500 text-sm text-center px-4">{t('qr.no_kode')}</Text>
          </View>
        )}
        {!revealed && hasKode && onReveal ? (
          <Pressable
            onPress={onReveal}
            {...gx('mt-3 py-3 bg-brand-500 rounded-xl flex-row items-center justify-center gap-2')}
          >
            <Eye size={16} color="#fff" />
            <Text className="text-white font-semibold text-sm">{t('qr.reveal_again')}</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="items-center mt-4">
        <Text className="text-white/80 text-xs">{t('qr.your_code')}</Text>
        <Text className="text-white text-2xl font-bold tracking-[0.3em] mt-1">{hasKode ? kode : '—'}</Text>
      </View>
    </View>
  );
}
