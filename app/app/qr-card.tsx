import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, X } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/auth.store';

const BLUR_AFTER_SEC = 30;

export default function QrCardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [secondsLeft, setSecondsLeft] = useState(BLUR_AFTER_SEC);
  const [revealed, setRevealed] = useState(true);

  // Auto-blur countdown
  useEffect(() => {
    if (!revealed) return;
    if (secondsLeft <= 0) {
      setRevealed(false);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, revealed]);

  function revealAgain() {
    setSecondsLeft(BLUR_AFTER_SEC);
    setRevealed(true);
  }

  if (!user) return null;

  return (
    <View className="flex-1 bg-brand-600">
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-5 pt-2 pb-2 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <X size={24} color="#fff" />
          </Pressable>
          <Text className="flex-1 text-white text-lg font-bold">{t('qr.title')}</Text>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white/80 text-sm text-center mb-6">{t('qr.instruction')}</Text>

          {/* QR Card */}
          <View className="bg-white rounded-3xl p-6 mb-5" style={{ elevation: 8 }}>
            <View
              style={{
                opacity: revealed ? 1 : 0.3,
              }}
            >
              <QRCode
                value={user.kode}
                size={240}
                color="#0A0A0A"
                backgroundColor="#FFFFFF"
              />
            </View>
            {!revealed ? (
              <Pressable
                onPress={revealAgain}
                className="mt-3 py-3 bg-brand-500 rounded-xl flex-row items-center justify-center gap-2"
              >
                <Eye size={16} color="#fff" />
                <Text className="text-white font-semibold text-sm">{t('qr.reveal_again')}</Text>
              </Pressable>
            ) : null}
          </View>

          <Text className="text-white/80 text-sm">{t('qr.your_code')}</Text>
          <Text className="text-white text-3xl font-bold tracking-[0.3em] mt-1">{user.kode}</Text>

          {revealed ? (
            <View className="mt-6 bg-black/30 rounded-full px-4 py-2 flex-row items-center gap-2">
              <EyeOff size={14} color="#fff" />
              <Text className="text-white text-sm">{t('qr.blur_warning')}</Text>
              <Text className="text-white font-bold">{secondsLeft}s</Text>
            </View>
          ) : null}
        </View>

        {/* User card footer */}
        <View className="px-5 pb-6">
          <View className="bg-white/10 rounded-xl p-3 flex-row items-center gap-3">
            <Avatar
              name={user.namaLengkap}
              fotoUrl={user.fotoUrl}
              size={36}
              className="bg-white/20"
            />
            <View className="flex-1">
              <Text className="text-white font-semibold" numberOfLines={1}>
                {user.namaLengkap}
              </Text>
              <Text className="text-white/70 text-xs">{user.noHp}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
