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
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Search, X } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { searchJemaat, type JemaatSearchResult } from '@/api/jemaat';
import { useDebounce } from '@/hooks/useDebounce';
import { useViewingBranch } from '@/hooks/useViewingBranch';

const KODE_RE = /^[A-Z0-9]{8}$/;

export function JemaatSearchModal({
  visible,
  onClose,
  onSubmit,
  loading,
  title,
  inline,
}: {
  visible: boolean;
  onClose: () => void;
  /** Dipanggil dengan KODE jemaat terpilih (sama seperti hasil scan). */
  onSubmit: (kode: string) => void;
  loading?: boolean;
  title?: string;
  /** Render overlay (bukan Modal) — wajib kalau dipakai di dalam Modal lain. */
  inline?: boolean;
}) {
  const { t } = useTranslation();
  const { viewingCabangId } = useViewingBranch();
  const [text, setText] = useState('');
  const q = useDebounce(text.trim(), 300);
  const upper = text.trim().toUpperCase();
  const looksLikeKode = KODE_RE.test(upper);

  const results = useQuery({
    queryKey: ['jemaat-search', q, viewingCabangId],
    queryFn: () => searchJemaat(q, viewingCabangId),
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

  const content = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-black/60 justify-end"
    >
      <Pressable onPress={close} className="flex-1" />
      <View className="bg-white rounded-t-3xl p-5" style={{ maxHeight: '85%' }}>
        <View className="items-center mb-2">
          <View className="w-10 h-1 bg-neutral-300 rounded-full" />
        </View>
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <Search size={18} color="#525252" />
            <Text className="text-lg font-bold text-neutral-900">{title ?? t('scanner.search_title')}</Text>
          </View>
          <Pressable onPress={close} className="w-8 h-8 items-center justify-center">
            <X size={18} color="#737373" />
          </Pressable>
        </View>
        <Text className="text-xs text-neutral-500 mb-3 leading-relaxed">{t('scanner.search_hint')}</Text>

        <View className="flex-row items-center border-2 border-neutral-200 rounded-xl px-3">
          <Search size={16} color="#A3A3A3" />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('scanner.search_placeholder')}
            placeholderTextColor="#A3A3A3"
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
          {results.isFetching || loading ? <ActivityIndicator size="small" color="#F97316" /> : null}
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
            <ChevronRight size={16} color="#C2410C" />
          </Pressable>
        ) : null}

        <View style={{ minHeight: 120 }} className="mt-3">
          {q.length < 2 ? (
            <Text className="text-xs text-neutral-400 text-center mt-6">{t('scanner.search_min')}</Text>
          ) : results.isError ? (
            <Text className="text-xs text-red-600 text-center mt-6">{t('scanner.search_error')}</Text>
          ) : !results.isFetching && data.length === 0 && !showUseKode ? (
            <Text className="text-sm text-neutral-500 text-center mt-6">{t('scanner.search_empty')}</Text>
          ) : (
            <FlatList
              data={data}
              keyExtractor={(j) => j.id}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View className="h-px bg-neutral-100" />}
              renderItem={({ item: j }) => (
                <Pressable
                  onPress={() => pick(j)}
                  disabled={!j.kode || loading}
                  className="flex-row items-center gap-3 py-3"
                >
                  <Avatar name={j.namaLengkap} fotoUrl={j.fotoUrl} size={40} />
                  <View className="flex-1 min-w-0">
                    <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
                      {j.namaLengkap}
                    </Text>
                    <Text className="text-xs text-neutral-500" numberOfLines={1}>
                      {[j.kode, j.noHpMasked, j.cabang?.nama].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#A3A3A3" />
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  if (inline) {
    if (!visible) return null;
    return <View style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 100 }]}>{content}</View>;
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      {content}
    </Modal>
  );
}
