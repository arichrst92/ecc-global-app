/**
 * Ubah info homecell — pemimpin homecell / PIC area.
 * Nama, deskripsi, alamat pertemuan, link Google Maps, kategori, rentang usia.
 * PATCH /admin/me/homecell/:id
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';
import { Field, Input } from '@/components/ui/FormField';

import { useHomecellDetail, useUpdateHomecellInfo } from '@/hooks/useHomecell';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

type Kategori = 'SINGLE' | 'COUPLE' | null;

export default function EditHomecellScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast((s) => s.show);
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useHomecellDetail(id);
  const mut = useUpdateHomecellInfo();

  const [loaded, setLoaded] = useState(false);
  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [alamat, setAlamat] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [kategori, setKategori] = useState<Kategori>(null);
  const [usiaMin, setUsiaMin] = useState('');
  const [usiaMax, setUsiaMax] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const h = q.data;
    if (!h || loaded) return;
    setNama(h.nama ?? '');
    setDeskripsi(h.deskripsi ?? '');
    setAlamat(h.alamat ?? '');
    setMapsUrl(h.mapsUrl ?? '');
    setKategori(h.kategori ?? null);
    setUsiaMin(h.usiaMin != null ? String(h.usiaMin) : '');
    setUsiaMax(h.usiaMax != null ? String(h.usiaMax) : '');
    setLoaded(true);
  }, [q.data, loaded]);

  const num = (v: string) => (v.trim() === '' ? null : Number(v));

  function save() {
    const a = num(usiaMin);
    const b = num(usiaMax);
    if (nama.trim().length < 2) return setError(t('hcj.edit_err_nama'));
    if ((a != null && a > 120) || (b != null && b > 120)) return setError(t('hcj.segmen_err_range'));
    if (a != null && b != null && a > b) return setError(t('hcj.segmen_err_order'));
    setError(null);
    mut.mutate(
      {
        homecellId: id!,
        body: {
          nama: nama.trim(),
          deskripsi: deskripsi.trim() || null,
          alamat: alamat.trim() || null,
          mapsUrl: mapsUrl.trim() || null,
          kategori,
          usiaMin: a,
          usiaMax: b,
        },
      },
      {
        onSuccess: () => {
          showToast(t('hcj.edit_saved'), 'success');
          goBack(router, `/homecell/${id}`);
        },
        onError: (e) => setError(e instanceof ApiError ? e.message : t('error.network')),
      },
    );
  }

  const kategoriOpts: { v: Kategori; label: string }[] = [
    { v: null, label: t('hcj.kategori_umum') },
    { v: 'SINGLE', label: t('hcj.kategori_single') },
    { v: 'COUPLE', label: t('hcj.kategori_couple') },
  ];

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router, `/homecell/${id}`)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">{t('hcj.edit_title')}</Text>
        </View>
      </SafeAreaView>

      {q.isPending ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
      ) : (
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            <Field label={t('hcj.edit_nama')}>
              <Input value={nama} onChangeText={setNama} maxLength={150} placeholder="Homecell Kelapa Gading" />
            </Field>
            <Field label={t('hcj.edit_deskripsi')}>
              <Input value={deskripsi} onChangeText={setDeskripsi} maxLength={1000} multiline />
            </Field>
            <Field label={t('hcj.edit_alamat')}>
              <Input value={alamat} onChangeText={setAlamat} maxLength={1000} multiline placeholder={t('hcj.edit_alamat_ph')} />
            </Field>
            <Field label={t('hcj.edit_maps')} hint={t('hcj.edit_maps_hint')}>
              <Input
                value={mapsUrl}
                onChangeText={setMapsUrl}
                maxLength={2000}
                autoCapitalize="none"
                placeholder="https://maps.app.goo.gl/… / -6.2088, 106.8456"
              />
            </Field>

            <Field label={t('hcj.segmen_kategori')}>
              <View className="flex-row gap-2">
                {kategoriOpts.map((o) => {
                  const on = kategori === o.v;
                  return (
                    <Pressable
                      key={o.label}
                      onPress={() => setKategori(o.v)}
                      className={`flex-1 py-2.5 rounded-xl border items-center ${on ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'}`}
                    >
                      <Text className={`text-sm font-semibold ${on ? 'text-white' : 'text-neutral-700'}`}>{o.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <Field label={t('hcj.segmen_usia')} hint={t('hcj.segmen_usia_hint')}>
              <View className="flex-row items-center">
                <View className="flex-1">
                  <Input
                    value={usiaMin}
                    onChangeText={(v) => setUsiaMin(v.replace(/\D/g, '').slice(0, 3))}
                    keyboardType="number-pad"
                    placeholder={t('hcj.segmen_from')}
                    center
                  />
                </View>
                <Text className="mx-3 text-neutral-500">–</Text>
                <View className="flex-1">
                  <Input
                    value={usiaMax}
                    onChangeText={(v) => setUsiaMax(v.replace(/\D/g, '').slice(0, 3))}
                    keyboardType="number-pad"
                    placeholder={t('hcj.segmen_to')}
                    center
                  />
                </View>
                <Text className="ml-3 text-sm text-neutral-500">{t('hcj.years')}</Text>
              </View>
            </Field>

            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-1">
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
