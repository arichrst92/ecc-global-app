/**
 * Input manual untuk layar scan QR jemaat — bukan hanya kode.
 *
 * Ketik KODE jemaat, NAMA, atau NO HP → daftar hasil yang relevan (kode
 * persis & cabang aktif di atas) → pilih → `onSubmit(kode)` sama seperti
 * hasil scan QR. Kalau yang diketik kode 8 karakter lengkap, bisa langsung
 * dipakai tanpa menunggu hasil.
 *
 * Props sama dengan ManualInputModal (drop-in). ManualInputModal tetap
 * dipakai untuk kode non-jemaat (kode join group, kode jemput anak).
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Search, X } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { searchJemaat, type JemaatSearchResult } from '@/api/jemaat';
import { useDebounce } from '@/hooks/useDebounce';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { nc } from '@/theme/ThemeRoot';

const KODE_RE = /^[A-Z0-9]{8}$/;

export function JemaatSearchModal({
  visible,
  onClose,
  onSubmit,
  loading,
  title,
  inline,
  purpose,
}: {
  visible: boolean;
  onClose: () => void;
  /** Dipanggil dengan KODE jemaat terpilih (sama seperti hasil scan). */
  onSubmit: (kode: string) => void;
  loading?: boolean;
  title?: string;
  /** Render overlay (bukan Modal) — wajib kalau dipakai di dalam Modal lain. */
  inline?: boolean;
  /** 'checkin' = absensi ibadah/event/homecell oleh petugas. */
  purpose?: 'checkin';
}) {
  const { t } = useTranslation();
  const { viewingCabangId } = useViewingBranch();
  // Ruang bawah = tinggi keyboard → hasil yang tertutup keyboard tetap bisa digulir & diketuk.
  const kbH = useKeyboardHeight();
  const [text, setText] = useState('');
  const q = useDebounce(text.trim(), 300);
  const upper = text.trim().toUpperCase();
  const looksLikeKode = KODE_RE.test(upper);

  const results = useQuery({
    queryKey: ['jemaat-search', q, viewingCabangId, purpose ?? null],
    queryFn: () => searchJemaat(q, viewingCabangId, purpose),
    enabled: visible && q.length >= 2,
    staleTime: 30_000,
  });

  function pick(j: JemaatSearchResult) {
    if (!j.kode || loading) return;
    onSubmit(j.kode);
    setText('');
  }

  function close() {
    setText('');
    onClose();
  }

  const data = results.data ?? [];
  // Kode persis yang belum muncul di hasil → tawarkan "Pakai kode …"
  const showUseKode = looksLikeKode && !data.some((j) => j.kode === upper);

  // Layar penuh dengan kolom cari di ATAS (bukan lembar di bawah): keyboard
  // tidak menutupi input, dan daftar hasil punya tinggi pasti (flex-1) sehingga
  // bisa digulir & diketuk di Android maupun iOS.
  const content = (
    <View style={{ flex: 1 }} className="bg-card">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="flex-row items-center px-4 py-2">
          <Search size={18} color={nc('#525252')} />
          <Text className="flex-1 text-base font-bold text-neutral-900 ml-2" numberOfLines={1}>
            {title ?? t('scanner.search_title')}
          </Text>
          <Pressable onPress={close} className="w-10 h-10 items-center justify-center" accessibilityLabel={t('common.close')}>
            <X size={20} color={nc('#525252')} />
          </Pressable>
        </View>
      </SafeAreaView>

      <View className="px-4 pt-3">
        <Text className="text-xs text-neutral-500 mb-3 leading-relaxed">{t('scanner.search_hint')}</Text>
        <View className="flex-row items-center border-2 border-neutral-200 rounded-xl px-3">
          <Search size={16} color={nc('#A3A3A3')} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('scanner.search_placeholder')}
            placeholderTextColor={nc('#A3A3A3')}
            autoCorrect={false}
            autoFocus
            editable={!loading}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (looksLikeKode) {
                onSubmit(upper);
                setText('');
              }
            }}
            className="flex-1 px-2 py-3 text-base text-neutral-900"
          />
          {results.isFetching || loading ? (
            <ActivityIndicator size="small" color="#F97316" />
          ) : text ? (
            <Pressable onPress={() => setText('')} hitSlop={8}>
              <X size={16} color={nc('#A3A3A3')} />
            </Pressable>
          ) : null}
        </View>

        {showUseKode ? (
          <Pressable
            onPress={() => {
              onSubmit(upper);
              setText('');
            }}
            disabled={loading}
            className="mt-3 flex-row items-center justify-between bg-brand-50 border border-brand-200 rounded-xl px-4 py-3"
          >
            <Text className="text-sm font-semibold text-brand-800">
              {t('scanner.search_use_kode', { kode: upper })}
            </Text>
            <ChevronRight size={16} color={nc('#C2410C')} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ flex: 1 }} className="mt-2">
        {q.length < 2 ? (
          <Text className="text-xs text-neutral-400 text-center mt-6 px-4">{t('scanner.search_min')}</Text>
        ) : results.isError ? (
          <Text className="text-xs text-red-600 text-center mt-6 px-4">{t('scanner.search_error')}</Text>
        ) : !results.isFetching && data.length === 0 && !showUseKode ? (
          <Text className="text-sm text-neutral-500 text-center mt-6 px-4">{t('scanner.search_empty')}</Text>
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={data}
            keyExtractor={(j) => j.id}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: kbH + 24 }}
            ItemSeparatorComponent={() => <View className="h-px bg-neutral-100" />}
            renderItem={({ item: j }) => (
              <Pressable
                onPress={() => pick(j)}
                disabled={!j.kode || loading}
                className="flex-row items-center gap-3 py-3 active:bg-neutral-50"
              >
                <Avatar name={j.namaLengkap} fotoUrl={j.fotoUrl} size={40} />
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
                    {j.namaLengkap}
                  </Text>
                  <Text className="text-xs text-neutral-500" numberOfLines={1}>
                    {[j.isTamu ? t('tamu.label') : null, j.kode, j.noHpMasked, j.cabang?.nama].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <ChevronRight size={16} color={nc('#A3A3A3')} />
              </Pressable>
            )}
          />
        )}
      </View>
    </View>
  );

  if (inline) {
    if (!visible) return null;
    return <View style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 100 }]}>{content}</View>;
  }
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      {content}
    </Modal>
  );
}
