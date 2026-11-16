/**
 * Popup Announcement — muncul saat app dibuka bila ada pengumuman In App yang
 * belum ditutup. Sekali per pengumuman (tombol Tutup / tombol link → dismiss).
 *
 * Tata letak (aman di HP lipat / tablet):
 *  - lebar maks 420 px, tinggi maks 85% layar, di tengah
 *  - banner 16:9 dengan tinggi maks 30% layar (crop, tidak meregang)
 *  - isi bisa digulir; tombol menempel di bawah
 */
import { useEffect, useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Megaphone } from 'lucide-react-native';
import { dismissAnnouncement, getAnnouncementPopup, type Announcement } from '@/api/announcement';
import { getConsentStatus } from '@/api/consent';
import { useAuthStore } from '@/stores/auth.store';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { env } from '@/config/env';
import { gx } from '@/theme/gradient';
import { AnnouncementMarkdown } from './AnnouncementMarkdown';

export const announcementImg = (u: string | null) => (!u ? null : /^https?:/i.test(u) ? u : `${env.apiBaseUrl}${u}`);

/** Kepala pengumuman: banner (bila ada) atau pita oranye ringkas + judul. */
export function AnnouncementHead({ a, bannerMaxH }: { a: Pick<Announcement, 'judul' | 'bannerUrl'>; bannerMaxH: number }) {
  const { t } = useTranslation();
  const img = announcementImg(a.bannerUrl);
  if (img) {
    return (
      <View>
        <Image source={{ uri: img }} style={{ width: '100%', aspectRatio: 16 / 9, maxHeight: bannerMaxH }} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View className="px-4 pt-3.5">
          <View className="flex-row items-center gap-1.5">
            <Megaphone size={12} color="#C2410C" />
            <Text className="text-[11px] font-bold text-brand-700 uppercase tracking-wider">{t('announcement.label')}</Text>
          </View>
          <Text className="text-lg font-bold text-neutral-900 leading-6 mt-0.5">{a.judul}</Text>
        </View>
      </View>
    );
  }
  return (
    <View {...gx('bg-brand-500 px-4 py-4 flex-row items-center gap-3')}>
      <Megaphone size={20} color="#fff" />
      <View className="flex-1">
        <Text className="text-[11px] font-bold text-white/90 uppercase tracking-wider">{t('announcement.label')}</Text>
        <Text className="text-lg font-bold text-white leading-6">{a.judul}</Text>
      </View>
    </View>
  );
}

export function AnnouncementPopupHost() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { width, height } = useWindowDimensions();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isGuest = useAuthStore((s) => s.isGuest);
  const jemaatId = useAuthStore((s) => s.user?.jemaatId);
  const needsOnboarding = useAuthStore((s) => s.user?.needsOnboarding === true);
  const base = isAuthenticated && !isGuest && !!jemaatId && !needsOnboarding;

  // Jangan tumpuk dengan layar persetujuan S&K (ConsentGate).
  const consent = useQuery({ queryKey: ['consent-status', jemaatId], queryFn: getConsentStatus, enabled: base, staleTime: 30 * 60_000, retry: 1 });
  const enabled = base && consent.isSuccess && !consent.data?.required;

  const q = useQuery({
    queryKey: ['announcement-popup', jemaatId],
    queryFn: getAnnouncementPopup,
    enabled,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  useRefetchOnFocus(() => q.refetch(), enabled);

  const [hidden, setHidden] = useState<Set<string>>(new Set());
  useEffect(() => setHidden(new Set()), [jemaatId]);
  const list = (q.data ?? []).filter((a) => !hidden.has(a.id));
  const cur = list[0];
  const total = (q.data ?? []).length;
  const index = total - list.length + 1;

  const dismiss = useMutation({
    mutationFn: (id: string) => dismissAnnouncement(id),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  const close = (a: Announcement) => {
    setHidden((h) => new Set(h).add(a.id));
    dismiss.mutate(a.id);
  };

  if (!enabled || !cur) return null;
  const cardMaxH = height * 0.85;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => close(cur)} statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-black/50 px-4 py-6">
        <View
          className="bg-card rounded-3xl overflow-hidden"
          style={{ width: Math.min(width - 32, 420), maxHeight: cardMaxH }}
        >
          <AnnouncementHead a={cur} bannerMaxH={height * 0.3} />
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }} showsVerticalScrollIndicator>
            <AnnouncementMarkdown source={cur.isi} compact />
          </ScrollView>
          <View className="px-4 pt-3 pb-4 gap-2 border-t border-neutral-100">
            {cur.links.map((l) => (
              <Pressable
                key={l.url + l.label}
                onPress={() => {
                  close(cur);
                  Linking.openURL(l.url).catch(() => {});
                }}
                {...gx('bg-brand-500 rounded-xl py-3 flex-row items-center justify-center gap-1.5')}
              >
                <Text className="text-white font-bold text-sm">{l.label}</Text>
                <ExternalLink size={14} color="#fff" />
              </Pressable>
            ))}
            <Pressable onPress={() => close(cur)} className="rounded-xl py-3 items-center border border-neutral-200">
              <Text className="text-neutral-800 font-semibold text-sm">{t('announcement.close')}</Text>
            </Pressable>
            {total > 1 ? <Text className="text-center text-[11px] text-neutral-500">{t('announcement.counter', { i: index, n: total })}</Text> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
