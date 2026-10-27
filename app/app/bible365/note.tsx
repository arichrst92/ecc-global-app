/** Bible 365 — catatan renungan satu hari (pribadi). Param: ?day=N */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Lock, Trash2 } from 'lucide-react-native';

import { deleteBible365Note, getBible365Day, saveBible365Note } from '@/api/bible365';
import { BIBLE_BOOK_BY_ID } from '@/data/bible-books';
import { useBookNames } from '@/utils/bibleNames';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

export default function Bible365NoteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const names = useBookNames();
  const showToast = useToast((s) => s.show);
  const p = useLocalSearchParams<{ day?: string }>();
  const day = Math.min(365, Math.max(1, Number(p.day) || 1));
  const q = useQuery({ queryKey: ['bible365', 'day', day], queryFn: () => getBible365Day(day) });
  const [isi, setIsi] = useState('');
  const [ayat, setAyat] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (q.data && !loaded) {
      setIsi(q.data.note?.isi ?? '');
      setAyat(q.data.note?.ayat ?? '');
      setLoaded(true);
    }
  }, [q.data, loaded]);

  const done = () => {
    void qc.invalidateQueries({ queryKey: ['bible365'] });
    goBack(router, '/bible365');
  };
  const err = (e: unknown) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error');
  const save = useMutation({
    mutationFn: () => saveBible365Note(day, isi.trim(), ayat.trim() || null),
    onSuccess: () => {
      showToast(t('b365.note_saved'), 'success');
      done();
    },
    onError: err,
  });
  const del = useMutation({ mutationFn: () => deleteBible365Note(day), onSuccess: done, onError: err });

  const chapters = (q.data?.chapters ?? []).map((c) => {
    const b = BIBLE_BOOK_BY_ID.get(c.bookId);
    return b ? `${names.name(b)} ${c.bab}` : '';
  });

  return (
    <KeyboardAvoidingView className="flex-1 bg-neutral-50" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router, '/bible365')} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">{t('b365.note_title', { day })}</Text>
            <Text className="text-xs text-neutral-500" numberOfLines={1}>
              {chapters.filter(Boolean).join(' · ')}
            </Text>
          </View>
          {q.data?.note ? (
            <Pressable
              onPress={() =>
                Alert.alert(t('b365.note_delete_title'), '', [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('common.delete'), style: 'destructive', onPress: () => del.mutate() },
                ])
              }
              className="w-10 h-10 items-center justify-center"
            >
              <Trash2 size={18} color={nc('#DC2626')} />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>

      {q.isPending ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View className="bg-card rounded-2xl border border-neutral-100 p-4">
            <Text className="text-xs text-neutral-500 mb-2">{t('b365.note_prompt')}</Text>
            <TextInput
              value={isi}
              onChangeText={setIsi}
              multiline
              maxLength={5000}
              placeholder={t('b365.note_placeholder')}
              placeholderTextColor={nc('#A3A3A3')}
              className="text-sm text-neutral-900 leading-relaxed"
              style={{ minHeight: 180, textAlignVertical: 'top' }}
            />
          </View>
          <View className="bg-card rounded-2xl border border-neutral-100 p-4 mt-3">
            <Text className="text-xs text-neutral-500 mb-2">{t('b365.note_verse')}</Text>
            <TextInput
              value={ayat}
              onChangeText={setAyat}
              maxLength={60}
              placeholder="Kej 50:20"
              placeholderTextColor={nc('#A3A3A3')}
              className="text-sm text-neutral-900"
            />
          </View>
          <View className="flex-row items-center gap-1.5 mt-3 px-1">
            <Lock size={12} color={nc('#737373')} />
            <Text className="text-xs text-neutral-500">{t('b365.note_private')}</Text>
          </View>
          <Pressable
            onPress={() => save.mutate()}
            disabled={!isi.trim() || save.isPending}
            {...gx(`mt-5 py-3.5 rounded-2xl items-center ${isi.trim() ? 'bg-brand-500' : 'bg-neutral-200'}`)}
          >
            {save.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className={`text-sm font-bold ${isi.trim() ? 'text-white' : 'text-neutral-400'}`}>{t('b365.note_save')}</Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
