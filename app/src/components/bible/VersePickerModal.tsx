/**
 * Tautkan ayat (resolusi tahunan) — cukup KETIK referensinya seperti di Catatan:
 * "Yoh 3:16", "1 Kor 13:4-7", "Mazmur 23:1". Versi = versi Alkitab yang dipakai
 * pengguna (sama dengan sisip ayat di Catatan). Teks ayat ditampilkan sebagai
 * pratinjau, lalu "Pakai …". Tidak ada lagi langkah pilih versi / kitab / bab / ayat.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BookOpen, Search, X } from 'lucide-react-native';

import { Modal } from '@/components/ui/Modal';
import { TextInput } from '@/components/ui/ThemedTextInput';
import { Button } from '@/components/ui/Button';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { BIBLE_VERSION_BY_CODE, getChapter } from '@/data/bible';
import { useBibleStore } from '@/stores/bible.store';
import { parseBibleRef } from '@/utils/bibleRef';
import { nc } from '@/theme/ThemeRoot';
import { verseRefText, type VerseLink } from './verseRef';

export function VersePickerModal({
  visible,
  initial,
  onClose,
  onPick,
  inline,
}: {
  /** Tampil sebagai lapisan (bukan Modal) — wajib bila dibuka dari dalam Modal lain. */
  inline?: boolean;
  visible: boolean;
  initial?: VerseLink | null;
  onClose: () => void;
  onPick: (v: VerseLink) => void;
}) {
  const { t } = useTranslation();
  const versi = useBibleStore((s) => s.selectedVersionCode);
  // Dibuka di atas Modal (inline) → SafeAreaView tidak selalu memberi ruang di
  // Android edge-to-edge; pakai inset langsung supaya tombol tidak tertutup
  // bilah navigasi (gesture / tombol ||| ○ <). Keyboard terbuka → cukup jarak kecil.
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const bottomPad = kb > 0 ? 12 : Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0) + 12;
  const [q, setQ] = useState('');
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dibuka lagi untuk mengganti ayat → isi kolom dengan ayat sebelumnya.
  useEffect(() => {
    if (!visible) return;
    setQ(initial ? verseRefText(initial) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const parsed = useMemo(() => parseBibleRef(q), [q]);
  const link: VerseLink | null =
    parsed && parsed.from
      ? { versi, kitab: parsed.book.id, bab: parsed.bab, mulai: parsed.from, selesai: parsed.to && parsed.to > parsed.from ? parsed.to : null }
      : null;

  useEffect(() => {
    setText(null);
    if (!link) return;
    let alive = true;
    setLoading(true);
    getChapter(versi, link.kitab, link.bab)
      .then((ch) => {
        if (!alive) return;
        const to = link.selesai ?? link.mulai;
        const isi = (ch?.ayat ?? [])
          .filter((v) => (v.nomorEnd ?? v.nomor) >= link.mulai && v.nomor <= to)
          .map((v) => v.teks)
          .join(' ');
        setText(isi);
      })
      .catch(() => alive && setText(''))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versi, link?.kitab, link?.bab, link?.mulai, link?.selesai]);

  // Ayat tidak ada di pasal itu (mis. Yoh 3:99) → tidak bisa dipakai.
  const ok = !!link && !loading && !!text;
  const verLabel = BIBLE_VERSION_BY_CODE.get(versi)?.shortName ?? versi;

  const content = (
    <View style={{ flex: 1 }} className="bg-card">
      <View style={{ paddingTop: insets.top }} className="bg-card border-b border-neutral-100">
        <View className="flex-row items-center px-4 py-3 gap-2">
          <BookOpen size={18} color="#EA580C" />
          <Text className="flex-1 text-base font-bold text-neutral-900" numberOfLines={1}>
            {t('verse_picker.step_book')}
          </Text>
          <View className="px-2 py-0.5 rounded-full bg-brand-50">
            <Text className="text-[11px] font-bold text-brand-700">{verLabel}</Text>
          </View>
          <Pressable onPress={onClose} className="w-9 h-9 items-center justify-center" accessibilityLabel={t('common.close')}>
            <X size={20} color={nc('#525252')} />
          </Pressable>
        </View>
      </View>

      <KeyboardSafeView className="flex-1">
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View className="flex-row items-center gap-2 bg-neutral-50 rounded-xl px-3 border border-neutral-200">
            <Search size={16} color={nc('#A3A3A3')} />
            <TextInput
              value={q}
              onChangeText={setQ}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => ok && link && onPick(link)}
              placeholder={t('catatan.ayat_placeholder')}
              placeholderTextColor={nc('#A3A3A3')}
              className="flex-1 py-3 text-sm text-neutral-900"
              // Web: tanpa garis fokus bawaan browser (kotak pencarian sudah berbingkai).
              style={Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : undefined}
            />
            {q ? (
              <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel={t('common.close')}>
                <X size={16} color={nc('#A3A3A3')} />
              </Pressable>
            ) : null}
          </View>

          {q.trim() && !parsed ? (
            <Text className="text-xs text-amber-700">{t('catatan.ayat_invalid')}</Text>
          ) : parsed && !parsed.from ? (
            <Text className="text-xs text-amber-700">{t('verse_picker.need_verse')}</Text>
          ) : null}

          {link ? (
            <View className="bg-brand-50 rounded-xl p-3 gap-1">
              <Text className="text-xs font-bold text-brand-700">
                {verseRefText(link)} · {verLabel}
              </Text>
              {loading ? (
                <ActivityIndicator color="#F97316" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
              ) : text ? (
                <Text className="text-sm text-neutral-800 leading-relaxed">{text}</Text>
              ) : (
                <Text className="text-xs text-neutral-500">{t('verse_picker.not_available')}</Text>
              )}
            </View>
          ) : (
            <Text className="text-xs text-neutral-500 leading-5">{t('verse_picker.search_hint')}</Text>
          )}
        </ScrollView>
        <View style={{ paddingBottom: bottomPad }} className="px-4 pt-3 border-t border-neutral-100 bg-card">
          <Button
            label={link ? t('verse_picker.use', { ref: verseRefText(link) }) : t('verse_picker.pick_first')}
            disabled={!ok}
            onPress={() => ok && link && onPick(link)}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardSafeView>
    </View>
  );

  if (inline) {
    if (!visible) return null;
    return <View style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 100 }]}>{content}</View>;
  }
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}
