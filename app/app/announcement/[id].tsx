/**
 * Detail Announcement (dari daftar notifikasi / deeplink /announcement/:id).
 * Halaman penuh bisa digulir; konten lebar maks 560 px di tengah (HP lipat /
 * tablet tidak melebar); banner tinggi maks 30% layar.
 */
import { FormCards } from '@/components/forms/FormCards';
import { Linking, Pressable, ScrollView, Text, View, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import { getAnnouncement } from '@/api/announcement';
import { AnnouncementHead } from '@/components/announcement/AnnouncementPopupHost';
import { AnnouncementMarkdown } from '@/components/announcement/AnnouncementMarkdown';
import { ElsEmptyIcon } from '@/components/ui/ElsEmptyIcon';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { formatDateWithDay, toIsoDate } from '@/utils/date';

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const q = useQuery({ queryKey: ['announcement', id], queryFn: () => getAnnouncement(id!), enabled: !!id });
  const a = q.data;

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router, '/notifications')} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">{t('announcement.title')}</Text>
        </View>
      </SafeAreaView>
      {q.isPending ? (
        <View className="py-16 items-center">
          <ActivityIndicator color="#F97316" />
        </View>
      ) : !a ? (
        <View className="py-16 items-center px-8">
          <ElsEmptyIcon size={64} className="mb-3" />
          <Text className="text-sm text-neutral-500 text-center">{t('announcement.not_found')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, alignItems: 'center' }}>
          <View className="w-full bg-card rounded-3xl overflow-hidden border border-neutral-100" style={{ maxWidth: 560 }}>
            <AnnouncementHead a={a} bannerMaxH={height * 0.3} />
            <View className="px-4 pt-3 pb-4">
              {a.sentAt ? <Text className="text-[11px] text-neutral-500 mb-2">{formatDateWithDay(toIsoDate(new Date(a.sentAt)), i18n.language)}</Text> : null}
              <AnnouncementMarkdown source={a.isi} />
            </View>
            {a.links.length ? (
              <View className="px-4 pb-4 gap-2">
                {a.links.map((l) => (
                  <Pressable
                    key={l.url + l.label}
                    onPress={() => Linking.openURL(l.url).catch(() => {})}
                    {...gx('bg-brand-500 rounded-xl py-3 flex-row items-center justify-center gap-1.5')}
                  >
                    <Text className="text-white font-bold text-sm">{l.label}</Text>
                    <ExternalLink size={14} color="#fff" />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          {id ? <FormCards sourceType="ANNOUNCEMENT" sourceId={id} className="w-full mt-4" /> : null}
        </ScrollView>
      )}
    </View>
  );
}
