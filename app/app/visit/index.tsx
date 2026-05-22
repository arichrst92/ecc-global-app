/**
 * Visit (Movement) list screen — chronological feed visit saya.
 * Per BE handoff doc 2026-05-22.
 *
 * - Group by tanggal (id locale)
 * - Badge "Saya Scan" / "Di-Scan" pakai iAmInitiator
 * - FAB / header CTA → /visit/scan untuk create baru
 * - Tap row → /visit/[id] detail
 * - Filter chip role: all / initiator / target
 */
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Handshake, MapPin, Plus, QrCode, Sparkles } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { useMyVisits } from '@/hooks/useVisit';
import { formatDateWithDay, parseLocalDate } from '@/utils/date';
import type { VisitListItem } from '@/types/visit';

type RoleFilter = 'all' | 'initiator' | 'target';

type Section = { title: string; data: VisitListItem[] };

export default function VisitListScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const query = useMyVisits({ role: roleFilter });

  const allItems = useMemo<VisitListItem[]>(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((p) => p.data);
  }, [query.data]);

  // Group by tanggal — header date, items chronological DESC within (BE already sorts)
  const sections = useMemo<Section[]>(() => {
    const map = new Map<string, VisitListItem[]>();
    for (const item of allItems) {
      const d = parseLocalDate(item.tanggalVisit);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    // Sort group keys DESC (newest first)
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => ({ title: key, data: items }));
  }, [allItems]);

  // Flatten for FlatList — interleave headers + items
  type Row =
    | { type: 'header'; title: string; key: string }
    | { type: 'item'; data: VisitListItem; key: string };
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const sec of sections) {
      out.push({ type: 'header', title: sec.title, key: `h-${sec.title}` });
      for (const item of sec.data) {
        out.push({ type: 'item', data: item, key: `v-${item.id}` });
      }
    }
    return out;
  }, [sections]);

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('visit.title')}
          </Text>
          <Pressable
            onPress={() => router.push('/visit/scan' as never)}
            className="bg-brand-500 rounded-full px-3 py-2 flex-row items-center gap-1.5"
          >
            <Plus size={14} color="#fff" />
            <Text className="text-xs font-bold text-white">
              {t('visit.new_visit_btn')}
            </Text>
          </Pressable>
        </View>
        {/* Filter chips */}
        <View className="flex-row px-4 pb-2 gap-2">
          <FilterChip
            label={t('visit.filter_all')}
            active={roleFilter === 'all'}
            onPress={() => setRoleFilter('all')}
          />
          <FilterChip
            label={t('visit.filter_initiator')}
            active={roleFilter === 'initiator'}
            onPress={() => setRoleFilter('initiator')}
          />
          <FilterChip
            label={t('visit.filter_target')}
            active={roleFilter === 'target'}
            onPress={() => setRoleFilter('target')}
          />
        </View>
      </SafeAreaView>

      {query.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F97316" />
        </View>
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : allItems.length === 0 ? (
        <EmptyState onNew={() => router.push('/visit/scan' as never)} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => query.refetch()}
              tintColor="#F97316"
            />
          }
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              query.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator color="#F97316" />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-3 mb-2">
                  {formatDateWithDay(item.title, lang)}
                </Text>
              );
            }
            return (
              <VisitRow
                visit={item.data}
                onPress={() => router.push(`/visit/${item.data.id}` as never)}
              />
            );
          }}
        />
      )}
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-1.5 rounded-full ${active ? 'bg-brand-500' : 'bg-neutral-100'}`}
    >
      <Text
        className={`text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function VisitRow({
  visit,
  onPress,
}: {
  visit: VisitListItem;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const time = new Date(visit.tanggalVisit).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 border border-neutral-100 mb-2"
    >
      <View className="flex-row items-center gap-3 mb-2">
        <Avatar
          name={visit.lawan.namaLengkap}
          fotoUrl={visit.lawan.fotoUrl ?? undefined}
          size={44}
        />
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
            {visit.lawan.namaLengkap}
          </Text>
          <Text className="text-[11px] text-neutral-500 mt-0.5">
            {visit.lawan.cabang.nama} · {time}
          </Text>
        </View>
        <View
          className={`px-2 py-0.5 rounded-full ${
            visit.iAmInitiator ? 'bg-brand-50' : 'bg-cyan-50'
          }`}
        >
          <Text
            className={`text-[10px] font-bold ${
              visit.iAmInitiator ? 'text-brand-700' : 'text-cyan-700'
            }`}
          >
            {visit.iAmInitiator
              ? t('visit.role_badge_initiator')
              : t('visit.role_badge_target')}
          </Text>
        </View>
      </View>
      <View className="bg-neutral-50 rounded-xl px-3 py-2.5">
        <Text className="text-sm font-semibold text-neutral-900" numberOfLines={2}>
          {visit.judul}
        </Text>
        {visit.lokasi ? (
          <View className="flex-row items-center gap-1 mt-1">
            <MapPin size={11} color="#737373" />
            <Text className="text-[11px] text-neutral-500 flex-1" numberOfLines={1}>
              {visit.lokasi}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="w-20 h-20 rounded-2xl bg-brand-50 items-center justify-center mb-3">
        <Handshake size={36} color="#EA580C" />
      </View>
      <Text className="text-lg font-bold text-neutral-900 text-center">
        {t('visit.empty_title')}
      </Text>
      <Text className="text-sm text-neutral-500 text-center mt-1 mb-4 leading-relaxed">
        {t('visit.empty_msg')}
      </Text>
      <Pressable
        onPress={onNew}
        className="bg-brand-500 rounded-full px-5 py-3 flex-row items-center gap-2"
      >
        <QrCode size={16} color="#fff" />
        <Text className="text-sm font-bold text-white">
          {t('visit.start_new_btn')}
        </Text>
      </Pressable>
      <View className="flex-row items-center gap-1 mt-6 px-4">
        <Sparkles size={12} color="#A3A3A3" />
        <Text className="text-[11px] text-neutral-400 text-center flex-1">
          {t('visit.empty_hint')}
        </Text>
      </View>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-sm text-red-600 text-center mb-3">
        {t('error.generic')}
      </Text>
      <Pressable onPress={onRetry} className="bg-brand-500 rounded-full px-4 py-2">
        <Text className="text-sm font-bold text-white">{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}
