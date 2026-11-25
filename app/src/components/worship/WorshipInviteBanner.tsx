/**
 * Ajakan mendengarkan ECC Worship sambil membaca Alkitab / mencatat.
 * Tampil hanya bila ECC Worship punya lagu dan belum ada lagu yang diputar.
 * Ketuk → menu ECC Worship (pemutar mini tetap jalan saat kembali ke halaman ini).
 */
import { gx } from '@/theme/gradient';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Music } from 'lucide-react-native';

import { useWorshipSummary } from '@/hooks/useWorship';
import { useWorshipPlayer } from '@/stores/worship-player.store';

export function WorshipInviteBanner({ className }: { className?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const summary = useWorshipSummary();
  const hasTrack = useWorshipPlayer((s) => s.queue.length > 0);
  if (!summary.data?.hasSongs || hasTrack) return null;
  return (
    <Pressable
      onPress={() => router.push('/worship' as never)}
      className={`flex-row items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 active:opacity-80 ${className ?? ''}`}
    >
      <View {...gx('w-10 h-10 rounded-xl bg-violet-600 items-center justify-center')}>
        <Music size={18} color="#fff" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-violet-900">{t('worship.invite_title')}</Text>
        <Text className="text-xs text-violet-700 mt-0.5">{t('worship.invite_cta')}</Text>
      </View>
      <ChevronRight size={18} color="#6D28D9" />
    </Pressable>
  );
}
