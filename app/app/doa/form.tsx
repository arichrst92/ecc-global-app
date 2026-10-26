/** Buat / ubah prayer request (?id= untuk ubah). */
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  PRAYER_KATEGORI,
  PRAYER_TARGET,
  createPrayer,
  getMyPrayer,
  updatePrayer,
  type PrayerKategori,
  type PrayerTarget,
} from '@/api/prayer';
import { PillOption } from '@/components/doa/DoaBits';
import { useMyFamily } from '@/hooks/useFamily';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

export default function DoaFormScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [kategori, setKategori] = useState<PrayerKategori>('HEALTH');
  const [untuk, setUntuk] = useState<PrayerTarget>('DIRI_SENDIRI');
  const [untukNama, setUntukNama] = useState('');
  const [untukJemaatId, setUntukJemaatId] = useState<string | null>(null);
  const [isi, setIsi] = useState('');
  const [isAnonim, setIsAnonim] = useState(false);
  const [loaded, setLoaded] = useState(!editing);

  const existingQ = useQuery({ queryKey: ['prayer', 'detail', id], queryFn: () => getMyPrayer(id!), enabled: editing });
  useEffect(() => {
    const p = existingQ.data;
    if (!p || loaded) return;
    setKategori(p.kategori);
    setUntuk(p.untuk);
    setUntukJemaatId(p.untukJemaatId);
    setUntukNama(p.untukJemaatId ? '' : (p.untukNama ?? ''));
    setIsi(p.isi);
    setIsAnonim(p.isAnonim);
    setLoaded(true);
  }, [existingQ.data, loaded]);

  const familyQ = useMyFamily();
  const family = familyQ.data ?? [];

  const body = () => ({
    kategori,
    untuk,
    untukNama: untuk === 'DIRI_SENDIRI' ? null : untukJemaatId ? null : untukNama.trim() || null,
    untukJemaatId: untuk === 'KELUARGA' ? untukJemaatId : null,
    isi: isi.trim(),
    isAnonim,
  });

  const mut = useMutation({
    mutationFn: () => (editing ? updatePrayer(id!, body()) : createPrayer(body())),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['prayer'] });
      showToast(editing ? t('doa.saved') : t('doa.sent'), 'success');
      if (editing) goBack(router);
      else router.replace(`/doa/${p.id}` as never);
    },
    onError: (e) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error'),
  });

  const valid = isi.trim().length >= 5 && (untuk !== 'ORANG_LAIN' || untukNama.trim().length > 0);

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center gap-2">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="text-base font-bold text-neutral-900 flex-1">
            {editing ? t('doa.edit_title') : t('doa.new_title')}
          </Text>
        </View>
      </SafeAreaView>
      {!loaded ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
      ) : (
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 14 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text className="text-sm font-semibold text-neutral-800">{t('doa.kategori_label')}</Text>
            <View className="flex-row flex-wrap gap-2">
              {PRAYER_KATEGORI.map((k) => (
                <PillOption key={k} label={t(`doa.kategori_${k}`)} on={kategori === k} onPress={() => setKategori(k)} />
              ))}
            </View>

            <Text className="text-sm font-semibold text-neutral-800">{t('doa.untuk_label')}</Text>
            <View className="flex-row flex-wrap gap-2">
              {PRAYER_TARGET.map((k) => (
                <PillOption
                  key={k}
                  label={t(`doa.untuk_${k}`)}
                  on={untuk === k}
                  onPress={() => {
                    setUntuk(k);
                    if (k !== 'KELUARGA') setUntukJemaatId(null);
                  }}
                />
              ))}
            </View>

            {untuk === 'KELUARGA' && family.length > 0 ? (
              <View className="gap-2">
                <Text className="text-xs text-neutral-500">{t('doa.pick_family')}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {family.map((f) => (
                    <PillOption
                      key={f.jemaat.id}
                      label={f.jemaat.namaLengkap}
                      on={untukJemaatId === f.jemaat.id}
                      onPress={() => {
                        setUntukJemaatId(untukJemaatId === f.jemaat.id ? null : f.jemaat.id);
                        setUntukNama('');
                      }}
                    />
                  ))}
                </View>
                <Text className="text-xs text-neutral-500">{t('doa.or_type_name')}</Text>
              </View>
            ) : null}

            {untuk !== 'DIRI_SENDIRI' ? (
              <TextInput
                value={untukNama}
                onChangeText={(v) => {
                  setUntukNama(v);
                  if (v) setUntukJemaatId(null);
                }}
                maxLength={150}
                placeholder={untuk === 'ORANG_LAIN' ? t('doa.untuk_nama_ph') : t('doa.untuk_nama_opt')}
                placeholderTextColor={nc('#A3A3A3')}
                className="bg-card rounded-xl px-4 py-3 text-sm text-neutral-900 border border-neutral-200"
              />
            ) : null}

            <Text className="text-sm font-semibold text-neutral-800">{t('doa.isi_label')}</Text>
            <TextInput
              value={isi}
              onChangeText={setIsi}
              multiline
              maxLength={3000}
              placeholder={t('doa.isi_ph')}
              placeholderTextColor={nc('#A3A3A3')}
              className="bg-card rounded-2xl px-4 py-3 text-sm text-neutral-900 border border-neutral-200"
              style={{ minHeight: 150, textAlignVertical: 'top' }}
            />
            <Text className="text-[11px] text-neutral-400 -mt-2 text-right">{isi.length}/3000</Text>

            <View className="bg-card rounded-2xl border border-neutral-200 px-4 py-3 gap-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-neutral-800">{t('doa.anonim_label')}</Text>
                <Switch
                  value={isAnonim}
                  onValueChange={setIsAnonim}
                  trackColor={{ true: '#F97316', false: nc('#D4D4D4') }}
                  thumbColor="#fff"
                />
              </View>
              <Text className="text-xs text-neutral-500">{t('doa.anonim_hint')}</Text>
            </View>

            <Button
              label={editing ? t('doa.save') : t('doa.send')}
              loading={mut.isPending}
              disabled={!valid}
              onPress={() => mut.mutate()}
              fullWidth
              size="lg"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
