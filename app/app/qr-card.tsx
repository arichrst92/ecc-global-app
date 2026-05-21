import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Eye, EyeOff, X } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/auth.store';
import { useMyFamily } from '@/hooks/useFamily';
import { getMyProfile } from '@/api/me';

const BLUR_AFTER_SEC = 30;
const { width: SCREEN_W } = Dimensions.get('window');

type QrCard = {
  id: string;
  kode: string;
  namaLengkap: string;
  noHp: string | null;
  fotoUrl?: string | null;
  isSelf: boolean;
};

/**
 * QR Card screen — swipeable carousel showing self + family members.
 *
 * Each card has nama di atas, QR code besar di tengah, kode jemaat besar
 * di bawah. Auto-blur setelah BLUR_AFTER_SEC detik.
 *
 * Kode jemaat fetched fresh dari /admin/me (kalau auth store user.kode
 * empty atau stale).
 */
export default function QrCardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const familyQuery = useMyFamily();
  // Fetch fresh me untuk pastikan kode jemaat ada (login store mungkin stale)
  const meQuery = useQuery({
    queryKey: ['me', 'qr-card'],
    queryFn: getMyProfile,
    enabled: !!user,
    staleTime: 60_000,
  });

  const [secondsLeft, setSecondsLeft] = useState(BLUR_AFTER_SEC);
  const [revealed, setRevealed] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<FlatList<QrCard>>(null);

  // Auto-blur countdown — reset saat ganti card
  useEffect(() => {
    if (!revealed) return;
    if (secondsLeft <= 0) {
      setRevealed(false);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, revealed]);

  // Reset blur saat swipe
  useEffect(() => {
    setSecondsLeft(BLUR_AFTER_SEC);
    setRevealed(true);
  }, [activeIdx]);

  function revealAgain() {
    setSecondsLeft(BLUR_AFTER_SEC);
    setRevealed(true);
  }

  // Combine self + family ke single carousel data
  const cards = useMemo<QrCard[]>(() => {
    if (!user) return [];
    // Prefer fresh me.kode kalau available, fallback ke store user.kode
    const myKode = meQuery.data?.kode ?? user.kode ?? '';
    const myCard: QrCard = {
      id: user.jemaatId,
      kode: myKode,
      namaLengkap: meQuery.data?.namaLengkap ?? user.namaLengkap,
      noHp: meQuery.data?.noHp ?? user.noHp,
      fotoUrl: meQuery.data?.fotoUrl ?? user.fotoUrl,
      isSelf: true,
    };
    const familyCards: QrCard[] = (familyQuery.data ?? []).map((r) => ({
      id: r.jemaat.id,
      kode: r.jemaat.kode,
      namaLengkap: r.jemaat.namaLengkap,
      noHp: r.jemaat.noHp,
      fotoUrl: r.jemaat.fotoUrl,
      isSelf: false,
    }));
    return [myCard, ...familyCards];
  }, [user, meQuery.data, familyQuery.data]);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== activeIdx) setActiveIdx(idx);
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
          <View className="flex-1">
            <Text className="text-white text-lg font-bold">{t('qr.title')}</Text>
            {cards.length > 1 ? (
              <Text className="text-white/70 text-xs">
                {activeIdx + 1} / {cards.length} · {t('qr.swipe_hint')}
              </Text>
            ) : null}
          </View>
        </View>

        <Text className="text-white/80 text-sm text-center px-6 mb-3">
          {t('qr.instruction')}
        </Text>

        <FlatList
          ref={listRef}
          data={cards}
          keyExtractor={(c) => c.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <QrCardItem
              card={item}
              revealed={revealed}
              onReveal={revealAgain}
              t={t}
            />
          )}
        />

        {/* Page indicator dots */}
        {cards.length > 1 ? (
          <View className="flex-row items-center justify-center gap-1.5 mb-2">
            {cards.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === activeIdx ? 24 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === activeIdx ? '#fff' : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </View>
        ) : null}

        {revealed ? (
          <View className="items-center mb-4">
            <View className="bg-black/30 rounded-full px-4 py-2 flex-row items-center gap-2">
              <EyeOff size={14} color="#fff" />
              <Text className="text-white text-sm">{t('qr.blur_warning')}</Text>
              <Text className="text-white font-bold">{secondsLeft}s</Text>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

function QrCardItem({
  card,
  revealed,
  onReveal,
  t,
}: {
  card: QrCard;
  revealed: boolean;
  onReveal: () => void;
  t: (k: string) => string;
}) {
  const hasKode = !!card.kode && card.kode.trim().length > 0;
  return (
    <View style={{ width: SCREEN_W }} className="items-center justify-center px-6">
      {/* Nama di atas QR */}
      <View className="items-center mb-3">
        <Avatar
          name={card.namaLengkap}
          fotoUrl={card.fotoUrl}
          size={48}
          className="bg-white/20 mb-2"
        />
        <Text className="text-white text-lg font-bold text-center" numberOfLines={1}>
          {card.namaLengkap}
        </Text>
        {!card.isSelf ? (
          <Text className="text-white/70 text-xs">{t('qr.family_member')}</Text>
        ) : null}
      </View>

      {/* QR Card */}
      <View className="bg-white rounded-3xl p-5" style={{ elevation: 8 }}>
        {hasKode ? (
          <View style={{ opacity: revealed ? 1 : 0.25 }}>
            <QRCode
              value={card.kode}
              size={220}
              color="#0A0A0A"
              backgroundColor="#FFFFFF"
            />
          </View>
        ) : (
          <View
            className="items-center justify-center bg-neutral-100 rounded-2xl"
            style={{ width: 220, height: 220 }}
          >
            <Text className="text-neutral-500 text-sm text-center px-4">
              {t('qr.no_kode')}
            </Text>
          </View>
        )}
        {!revealed && hasKode ? (
          <Pressable
            onPress={onReveal}
            className="mt-3 py-3 bg-brand-500 rounded-xl flex-row items-center justify-center gap-2"
          >
            <Eye size={16} color="#fff" />
            <Text className="text-white font-semibold text-sm">
              {t('qr.reveal_again')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Kode jemaat di bawah */}
      <View className="items-center mt-4">
        <Text className="text-white/80 text-xs">{t('qr.your_code')}</Text>
        <Text className="text-white text-2xl font-bold tracking-[0.3em] mt-1">
          {hasKode ? card.kode : '—'}
        </Text>
      </View>
    </View>
  );
}
