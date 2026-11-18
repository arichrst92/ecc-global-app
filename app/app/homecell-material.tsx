/**
 * Materi homecell (2026-11) — dari Portal → Homecell Material.
 * Hanya untuk Pastor zona, Zone Leader, PIC homecell, dan Asisten (server yang
 * menentukan). "Minggu ini" di atas, "Sebelumnya" di bawah — tetap bisa diunduh.
 */
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, Eye, Library } from 'lucide-react-native';

import type { HomecellMaterialItem } from '@/api/homecellMaterial';
import { useMyHomecellMaterials, useOpenHomecellMaterial } from '@/hooks/useHomecellMaterial';
import { PullRefreshControl } from '@/components/ui/PullRefreshControl';
import { ElsEmptyIcon } from '@/components/ui/ElsEmptyIcon';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/types/api';

const sizeLabel = (b: number) =>
  b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

function fileTag(m: { fileMime: string; fileName: string | null }): { t: string; bg: string; fg: string } {
  const ext = (m.fileName?.split('.').pop() ?? '').toLowerCase();
  if (m.fileMime === 'application/pdf' || ext === 'pdf') return { t: 'PDF', bg: '#FEF2F2', fg: '#B91C1C' };
  if (ext.startsWith('ppt') || /presentation|powerpoint/.test(m.fileMime)) return { t: 'PPT', bg: '#FFF7ED', fg: '#C2410C' };
  if (ext.startsWith('doc') || m.fileMime.includes('word')) return { t: 'DOC', bg: '#EFF6FF', fg: '#1D4ED8' };
  if (ext.startsWith('xls') || /sheet|excel/.test(m.fileMime)) return { t: 'XLS', bg: '#ECFDF5', fg: '#047857' };
  if (m.fileMime.startsWith('image/')) return { t: 'IMG', bg: '#F5F3FF', fg: '#6D28D9' };
  return { t: 'FILE', bg: '#F5F5F5', fg: '#525252' };
}

export default function HomecellMaterialScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const q = useMyHomecellMaterials();
  const open = useOpenHomecellMaterial();
  const showToast = useToast((s) => s.show);
  const d = q.data;
  const loc = i18n.language === 'en' ? 'en-US' : 'id-ID';
  const tgl = (ymd: string) => new Date(`${ymd}T00:00:00`).toLocaleDateString(loc, { day: 'numeric', month: 'short' });
  const range = (m: HomecellMaterialItem) => (m.berlakuSampai ? `${tgl(m.berlakuMulai)} – ${tgl(m.berlakuSampai)}` : tgl(m.berlakuMulai));

  function onOpen(m: HomecellMaterialItem) {
    open.mutate(m.id, {
      onError: (e) => showToast(e instanceof ApiError ? e.message : t('hcmat.open_failed'), 'error'),
    });
  }

  const Row = ({ m, first }: { m: HomecellMaterialItem; first: boolean }) => {
    const tag = fileTag(m);
    const busy = open.isPending && open.variables === m.id;
    return (
      <Pressable
        onPress={() => onOpen(m)}
        disabled={busy}
        className={`flex-row items-center gap-3 px-4 py-3 active:bg-neutral-50 ${first ? '' : 'border-t border-neutral-100'}`}
        accessibilityRole="button"
        accessibilityLabel={`${m.judul}, ${t('hcmat.download')}`}
      >
        <View style={{ backgroundColor: tag.bg }} className="w-10 h-11 rounded-lg items-center justify-center">
          <Text style={{ color: tag.fg }} className="text-[11px] font-bold">
            {tag.t}
          </Text>
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-semibold text-neutral-900" numberOfLines={2}>
            {m.judul}
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
            {range(m)} · {sizeLabel(m.fileSize)}
            {m.opened ? ` · ${t('hcmat.opened')}` : ''}
          </Text>
          {m.keterangan ? (
            <Text className="text-xs text-neutral-600 mt-0.5" numberOfLines={2}>
              {m.keterangan}
            </Text>
          ) : null}
        </View>
        {!m.opened ? (
          <View className="bg-brand-50 px-2 py-0.5 rounded-full">
            <Text className="text-[10px] font-bold text-brand-700">{t('hcmat.new')}</Text>
          </View>
        ) : null}
        {busy ? (
          <ActivityIndicator size="small" color="#EA580C" />
        ) : m.opened ? (
          <Eye size={18} color={nc('#737373')} />
        ) : (
          <Download size={18} color="#EA580C" />
        )}
      </Pressable>
    );
  };

  const Section = ({ title, items }: { title: string; items: HomecellMaterialItem[] }) =>
    items.length ? (
      <View className="mt-4">
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{title}</Text>
        <View className="bg-card rounded-2xl border border-neutral-100 overflow-hidden">
          {items.map((m, i) => (
            <Row key={m.id} m={m} first={i === 0} />
          ))}
        </View>
      </View>
    ) : null;

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center" accessibilityLabel={t('common.back')}>
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="text-base font-bold text-neutral-900 flex-1">{t('hcmat.title')}</Text>
        </View>
      </SafeAreaView>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: insets.bottom + 32 }}
        refreshControl={<PullRefreshControl onRefresh={() => q.refetch()} tintColor="#F97316" />}
      >
        {q.isPending ? (
          <ActivityIndicator className="mt-12" color="#F97316" />
        ) : q.isError ? (
          <Text className="text-sm text-neutral-500 text-center mt-12">{t('error.generic')}</Text>
        ) : !d?.isLeader ? (
          <View className="items-center mt-16 px-6">
            <Library size={36} color={nc('#A3A3A3')} />
            <Text className="text-sm text-neutral-600 text-center mt-3">{t('hcmat.leaders_only')}</Text>
          </View>
        ) : !d.current.length && !d.previous.length ? (
          <View className="items-center mt-16 px-6">
            <ElsEmptyIcon size={64} />
            <Text className="text-base font-bold text-neutral-800 mt-4">{t('hcmat.empty_title')}</Text>
            <Text className="text-sm text-neutral-500 text-center mt-1">{t('hcmat.empty_body')}</Text>
          </View>
        ) : (
          <>
            <Section title={t('hcmat.this_week')} items={d.current} />
            <Section title={t('hcmat.previous')} items={d.previous} />
            <Text className="text-[11px] text-neutral-400 mt-4 leading-4">{t('hcmat.hint')}</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
