/**
 * Pilih ayat untuk ditautkan: 1) pilih versi Alkitab → 2) cari kitab (atau ketik
 * langsung "Yoh 3:16" / "Mazmur 23:1-3") → 3) bab → 4) ketuk ayat awal, ketuk
 * lagi ayat akhir bila rentang → Pakai ayat ini.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, Search, X } from 'lucide-react-native';

import { Modal } from '@/components/ui/Modal';
import { TextInput } from '@/components/ui/ThemedTextInput';
import { Button } from '@/components/ui/Button';
import { BIBLE_BOOKS, BIBLE_BOOK_BY_ID } from '@/data/bible-books';
import { BIBLE_VERSIONS, getChapter } from '@/data/bible';
import { bookName } from '@/utils/bibleNames';
import { useBibleStore } from '@/stores/bible.store';
import type { BibleChapter, BibleVersionCode } from '@/types/bible';
import { nc } from '@/theme/ThemeRoot';
import { verseRefText, type VerseLink } from './verseRef';

type Step = 'version' | 'book' | 'chapter' | 'verse';

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

/** Cari kitab dari teks ("yoh", "1 yoh", "mazmur", "psalms"). */
function matchBooks(q: string) {
  const n = norm(q);
  if (!n) return BIBLE_BOOKS;
  return BIBLE_BOOKS.filter(
    (b) => norm(b.nama).startsWith(n) || norm(b.singkatan).startsWith(n) || norm(b.namaEn).startsWith(n),
  );
}

/** "Yoh 3:16-17" → { book, bab, mulai, selesai } bila kitab dikenali. */
function parseRef(q: string) {
  const m = /^(.+?)\s*(\d+)(?:\s*[:.]\s*(\d+)(?:\s*-\s*(\d+))?)?\s*$/.exec(q.trim());
  if (!m) return null;
  const books = matchBooks(m[1]!);
  const book = books.find((b) => norm(b.nama) === norm(m[1]!) || norm(b.singkatan) === norm(m[1]!)) ?? books[0];
  if (!book) return null;
  const bab = Number(m[2]);
  if (bab < 1 || bab > book.totalBab) return null;
  return { book, bab, mulai: m[3] ? Number(m[3]) : null, selesai: m[4] ? Number(m[4]) : null };
}

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
  const defaultVersion = useBibleStore((s) => s.selectedVersionCode);
  const [step, setStep] = useState<Step>('version');
  const [versi, setVersi] = useState<BibleVersionCode>(defaultVersion);
  const [q, setQ] = useState('');
  const [kitab, setKitab] = useState<number | null>(null);
  const [bab, setBab] = useState<number | null>(null);
  const [mulai, setMulai] = useState<number | null>(null);
  const [selesai, setSelesai] = useState<number | null>(null);
  const [chapter, setChapter] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(false);

  // Buka: mulai dari pilih versi (atau tautan yang sudah ada).
  useEffect(() => {
    if (!visible) return;
    setQ('');
    if (initial) {
      setVersi((initial.versi as BibleVersionCode) ?? defaultVersion);
      setKitab(initial.kitab);
      setBab(initial.bab);
      setMulai(initial.mulai);
      setSelesai(initial.selesai ?? null);
      setStep('verse');
    } else {
      setVersi(defaultVersion);
      setKitab(null);
      setBab(null);
      setMulai(null);
      setSelesai(null);
      setStep('version');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (step !== 'verse' || !kitab || !bab) return;
    let alive = true;
    setLoading(true);
    getChapter(versi, kitab, bab)
      .then((c) => alive && setChapter(c))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [step, versi, kitab, bab]);

  const book = kitab ? BIBLE_BOOK_BY_ID.get(kitab) : null;
  const books = useMemo(() => matchBooks(q.replace(/\s*\d.*$/, '')), [q]);
  const parsed = useMemo(() => (/\d/.test(q) ? parseRef(q) : null), [q]);

  function goParsed() {
    if (!parsed) return;
    setKitab(parsed.book.id);
    setBab(parsed.bab);
    setMulai(parsed.mulai);
    setSelesai(parsed.selesai && parsed.mulai && parsed.selesai > parsed.mulai ? parsed.selesai : null);
    setStep('verse');
  }

  function tapVerse(n: number) {
    if (mulai == null || selesai != null || n < mulai) {
      setMulai(n);
      setSelesai(null);
    } else if (n === mulai) {
      setMulai(null);
    } else {
      setSelesai(n);
    }
  }

  const back = () => {
    if (step === 'verse') setStep('chapter');
    else if (step === 'chapter') setStep('book');
    else if (step === 'book') setStep('version');
    else onClose();
  };

  const title =
    step === 'version'
      ? t('verse_picker.step_version')
      : step === 'book'
        ? t('verse_picker.step_book')
        : step === 'chapter'
          ? book ? bookName(book, versi) : ''
          : book && bab ? `${bookName(book, versi)} ${bab}` : '';

  const content = (
      <View style={{ flex: 1 }} className="bg-card">
        <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
          <View className="flex-row items-center px-2 py-2">
            <Pressable onPress={back} className="w-10 h-10 items-center justify-center">
              <ArrowLeft size={20} color={nc('#171717')} />
            </Pressable>
            <Text className="flex-1 text-base font-bold text-neutral-900" numberOfLines={1}>
              {title}
            </Text>
            <View className="px-2 py-0.5 rounded-full bg-brand-50 mr-1">
              <Text className="text-[11px] font-bold text-brand-700">{versi}</Text>
            </View>
            <Pressable onPress={onClose} className="w-10 h-10 items-center justify-center" accessibilityLabel={t('common.close')}>
              <X size={20} color={nc('#525252')} />
            </Pressable>
          </View>
        </SafeAreaView>

        {step === 'version' ? (
          <View className="p-4 gap-3">
            <Text className="text-sm text-neutral-500">{t('verse_picker.version_hint')}</Text>
            {BIBLE_VERSIONS.map((v) => (
              <Pressable
                key={v.code}
                onPress={() => {
                  setVersi(v.code);
                  setStep('book');
                }}
                className={`flex-row items-center gap-3 rounded-2xl border p-4 ${versi === v.code ? 'border-brand-300 bg-brand-50' : 'border-neutral-200'}`}
              >
                <BookOpen size={18} color="#EA580C" />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-neutral-900">{v.shortName}</Text>
                  <Text className="text-xs text-neutral-500">{v.fullName}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : step === 'book' ? (
          <View style={{ flex: 1 }}>
            <View className="px-4 pt-3">
              <View className="flex-row items-center border-2 border-neutral-200 rounded-xl px-3">
                <Search size={16} color={nc('#A3A3A3')} />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder={t('verse_picker.search_ph')}
                  placeholderTextColor={nc('#A3A3A3')}
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="go"
                  onSubmitEditing={goParsed}
                  className="flex-1 px-2 py-3 text-base text-neutral-900"
                />
              </View>
              {parsed ? (
                <Pressable onPress={goParsed} className="mt-2 rounded-xl bg-brand-50 border border-brand-200 px-4 py-3">
                  <Text className="text-sm font-semibold text-brand-800">
                    {t('verse_picker.open_ref', {
                      ref: `${bookName(parsed.book, versi)} ${parsed.bab}${parsed.mulai ? `:${parsed.mulai}${parsed.selesai ? `-${parsed.selesai}` : ''}` : ''}`,
                    })}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <FlatList
              style={{ flex: 1 }}
              data={books}
              keyExtractor={(b) => String(b.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
              ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth }} className="bg-neutral-200" />}
              renderItem={({ item: b }) => (
                <Pressable
                  onPress={() => {
                    setKitab(b.id);
                    setStep('chapter');
                  }}
                  className="py-3 flex-row items-center justify-between"
                >
                  <Text className="text-sm text-neutral-900">{bookName(b, versi)}</Text>
                  <Text className="text-xs text-neutral-400">{b.totalBab}</Text>
                </Pressable>
              )}
            />
          </View>
        ) : step === 'chapter' && book ? (
          <ScrollView contentContainerStyle={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Array.from({ length: book.totalBab }, (_, i) => i + 1).map((n) => (
              <Pressable
                key={n}
                onPress={() => {
                  setBab(n);
                  setMulai(null);
                  setSelesai(null);
                  setStep('verse');
                }}
                className="w-14 h-12 rounded-xl border border-neutral-200 items-center justify-center"
              >
                <Text className="text-sm font-semibold text-neutral-800">{n}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <Text className="text-xs text-neutral-500 px-4 pt-3">{t('verse_picker.verse_hint')}</Text>
            {loading ? (
              <ActivityIndicator color="#F97316" style={{ marginTop: 30 }} />
            ) : !chapter ? (
              <Text className="text-sm text-neutral-500 text-center mt-8 px-6">{t('verse_picker.not_available')}</Text>
            ) : (
              <FlatList
                style={{ flex: 1 }}
                data={chapter.ayat}
                keyExtractor={(v) => String(v.nomor)}
                contentContainerStyle={{ padding: 16, gap: 6 }}
                renderItem={({ item: v }) => {
                  const end = selesai ?? mulai;
                  const on = mulai != null && end != null && v.nomor >= mulai && v.nomor <= end;
                  return (
                    <Pressable
                      onPress={() => tapVerse(v.nomor)}
                      className={`flex-row gap-2 rounded-xl px-3 py-2 ${on ? 'bg-brand-50 border border-brand-200' : ''}`}
                    >
                      <Text className={`text-xs font-bold w-7 ${on ? 'text-brand-700' : 'text-neutral-400'}`}>
                        {v.nomorEnd ? `${v.nomor}-${v.nomorEnd}` : v.nomor}
                      </Text>
                      <Text className="flex-1 text-sm text-neutral-800 leading-5">{v.teks}</Text>
                    </Pressable>
                  );
                }}
              />
            )}
            <SafeAreaView edges={['bottom']} className="px-4 pt-2 pb-3 border-t border-neutral-100 bg-card">
              <Button
                label={
                  mulai && kitab && bab
                    ? t('verse_picker.use', { ref: verseRefText({ versi, kitab, bab, mulai, selesai }) })
                    : t('verse_picker.pick_first')
                }
                disabled={!mulai}
                onPress={() => {
                  if (!mulai || !kitab || !bab) return;
                  onPick({ versi, kitab, bab, mulai, selesai: selesai && selesai > mulai ? selesai : null });
                }}
                fullWidth
                size="lg"
              />
            </SafeAreaView>
          </View>
        )}
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
