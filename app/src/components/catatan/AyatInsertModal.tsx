/**
 * Sisipkan ayat ke catatan: ketik referensi ("Yoh 3:16-18"), teks diambil
 * dari Alkitab offline versi yang dipilih. Bisa sisip kutipan atau referensi saja.
 */
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { TextInput } from '@/components/ui/ThemedTextInput';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { useTranslation } from 'react-i18next';
import { BookOpen, X } from 'lucide-react-native';

import { getChapter, BIBLE_VERSION_BY_CODE } from '@/data/bible';
import { useBibleStore } from '@/stores/bible.store';
import { bookName } from '@/utils/bibleNames';
import { formatRef, parseBibleRef } from '@/utils/bibleRef';
import type { AyatInsert } from '@/stores/catatanBridge.store';
import { nc } from '@/theme/ThemeRoot';

export function AyatInsertModal({
  visible,
  onClose,
  onInsert,
  onOpenBible,
}: {
  visible: boolean;
  onClose: () => void;
  /** quote kosong = referensi saja */
  onInsert: (a: AyatInsert) => void;
  onOpenBible: () => void;
}) {
  const { t } = useTranslation();
  const code = useBibleStore((s) => s.selectedVersionCode);
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState<{ ref: string; text: string } | null>(null);
  const parsed = parseBibleRef(q);

  useEffect(() => {
    let cancelled = false;
    if (!parsed) {
      setPreview(null);
      return;
    }
    const ref = formatRef(parsed, bookName(parsed.book, code));
    if (parsed.from === null) {
      setPreview({ ref, text: '' });
      return;
    }
    getChapter(code, parsed.book.id, parsed.bab).then((ch) => {
      if (cancelled) return;
      const from = parsed.from!;
      const to = parsed.to ?? from;
      const text = (ch?.ayat ?? [])
        .filter((v) => (v.nomorEnd ?? v.nomor) >= from && v.nomor <= to)
        .map((v) => v.teks)
        .join(' ');
      setPreview({ ref, text });
    }).catch(() => {
      // Teks Alkitab gagal dimuat → tetap bisa sisip referensi saja.
      if (!cancelled) setPreview({ ref, text: '' });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, code]);

  function close() {
    setQ('');
    setPreview(null);
    onClose();
  }
  function insert(withQuote: boolean) {
    if (!preview) return;
    const ver = BIBLE_VERSION_BY_CODE.get(code)?.shortName ?? code;
    onInsert({ ref: preview.ref, quote: withQuote && preview.text ? `> "${preview.text}" — ${preview.ref} (${ver})` : '' });
    setQ('');
    setPreview(null);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardSafeView className="flex-1 bg-black/50 justify-center px-5">
        <View className="bg-card rounded-2xl p-5 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-neutral-900">{t('catatan.ayat_title')}</Text>
            <Pressable onPress={close} hitSlop={10} accessibilityLabel={t('common.close')}>
              <X size={18} color={nc('#737373')} />
            </Pressable>
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            placeholder={t('catatan.ayat_placeholder')}
            placeholderTextColor={nc('#A3A3A3')}
            className="bg-neutral-50 rounded-xl px-3 py-3 text-sm text-neutral-900 border border-neutral-200"
          />
          {q.trim() && !parsed ? <Text className="text-xs text-amber-700">{t('catatan.ayat_invalid')}</Text> : null}
          {preview ? (
            <View className="bg-brand-50 rounded-xl p-3">
              <Text className="text-xs font-bold text-brand-700">{preview.ref}</Text>
              {preview.text ? (
                <Text className="text-sm text-neutral-800 mt-1 leading-relaxed" numberOfLines={6}>
                  {preview.text}
                </Text>
              ) : null}
            </View>
          ) : null}
          <View className="flex-row gap-2">
            <Pressable
              disabled={!preview}
              onPress={() => insert(false)}
              className={`flex-1 py-3 rounded-xl border border-neutral-200 items-center ${preview ? '' : 'opacity-40'}`}
            >
              <Text className="text-sm font-semibold text-neutral-700">{t('catatan.ayat_ref_only')}</Text>
            </Pressable>
            <Pressable
              disabled={!preview?.text}
              onPress={() => insert(true)}
              className={`flex-1 py-3 rounded-xl bg-brand-500 items-center ${preview?.text ? '' : 'opacity-40'}`}
            >
              <Text className="text-sm font-semibold text-white">{t('catatan.ayat_insert_quote')}</Text>
            </Pressable>
          </View>
          <Pressable onPress={onOpenBible} className="flex-row items-center justify-center gap-1.5 py-1">
            <BookOpen size={14} color="#EA580C" />
            <Text className="text-xs font-semibold text-brand-700">{t('catatan.open_bible')}</Text>
          </Pressable>
        </View>
      </KeyboardSafeView>
    </Modal>
  );
}
