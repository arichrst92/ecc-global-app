/**
 * Ubah info Homecell Area — PIC area. Nama & deskripsi.
 * PATCH /admin/me/homecell-area/:id   (param: ?id=)
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';

import { useManagedAreas, useUpdateHomecellArea } from '@/hooks/useHomecell';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { Field, Input } from '@/components/ui/FormField';

export default function EditAreaScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast((s) => s.show);
  const { id } = useLocalSearchParams<{ id: string }>();
  const areasQ = useManagedAreas();
  const area = areasQ.data?.find((a) => a.id === id);
  const mut = useUpdateHomecellArea();

  const [loaded, setLoaded] = useState(false);
  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!area || loaded) return;
    setNama(area.nama);
    setDeskripsi(area.deskripsi ?? '');
    setLoaded(true);
  }, [area, loaded]);

  function save() {
    if (nama.trim().length < 2) return setError(t('hcj.edit_err_nama'));
    setError(null);
    mut.mutate(
      { areaId: id!, body: { nama: nama.trim(), deskripsi: deskripsi.trim() || null } },
      {
        onSuccess: () => {
          showToast(t('hcj.edit_saved'), 'success');
          goBack(router, '/area');
        },
        onError: (e) => setError(e instanceof ApiError ? e.message : t('error.network')),
      },
    );
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router, '/area')} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">{t('hcj.edit_area_title')}</Text>
        </View>
      </SafeAreaView>

      {areasQ.isPending ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
      ) : !area ? (
        <Text className="text-sm text-neutral-500 text-center mt-10 px-8">{t('hcj.edit_area_forbidden')}</Text>
      ) : (
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            <Field label={t('hcj.edit_area_nama')}>
              <Input value={nama} onChangeText={setNama} maxLength={100} />
            </Field>
            <Field label={t('hcj.edit_deskripsi')}>
              <Input value={deskripsi} onChangeText={setDeskripsi} maxLength={1000} multiline />
            </Field>
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <Text className="text-xs text-red-700">{error}</Text>
              </View>
            ) : null}
          </ScrollView>
          <View className="px-5 pt-3 bg-card border-t border-neutral-100" style={{ paddingBottom: insets.bottom + 12 }}>
            <Pressable onPress={save} disabled={mut.isPending} {...gx('py-3.5 rounded-2xl items-center bg-brand-500')}>
              {mut.isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-bold text-white">{t('common.save')}</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
