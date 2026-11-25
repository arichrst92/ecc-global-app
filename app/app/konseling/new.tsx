/**
 * Ajukan konseling (2.5.1): pokok masalah, harapan, usulan jadwal (+ catatan),
 * preferensi konselor, lalu popup persetujuan membagikan kontak ke konselor.
 */
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Mail, Phone, ShieldCheck } from 'lucide-react-native';

import { Modal } from '@/components/ui/Modal';
import { TextInput } from '@/components/ui/ThemedTextInput';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { PillOption } from '@/components/doa/DoaBits';
import { DateTimeField } from '@/components/konseling/KonselingBits';
import { createKonseling, type GenderPref } from '@/api/konseling';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';
import { cekTeks, pertamaGagal } from '@/utils/inputRules';

export default function KonselingNewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const user = useAuthStore((s) => s.user);

  const [pokok, setPokok] = useState('');
  const [harapan, setHarapan] = useState('');
  const [jadwal, setJadwal] = useState<string | null>(null);
  const [catatan, setCatatan] = useState('');
  const [pref, setPref] = useState<GenderPref>('ANY');
  const [consentOpen, setConsentOpen] = useState(false);

  const mut = useMutation({
    mutationFn: () =>
      createKonseling({
        pokokMasalah: pokok.trim(),
        harapan: harapan.trim(),
        jadwalUsulan: jadwal,
        catatanJadwal: catatan.trim() || null,
        preferensiGender: pref,
        setujuBagikanKontak: true,
      }),
    onSuccess: (r) => {
      setConsentOpen(false);
      qc.invalidateQueries({ queryKey: ['konseling'] });
      showToast(t('konseling.sent'), 'success');
      router.replace(`/konseling/${r.id}` as never);
    },
    onError: (e) => {
      setConsentOpen(false);
      showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error');
    },
  });

  const submit = () => {
    const salah = pertamaGagal(
      cekTeks(pokok, { wajib: true, min: 10, minHurufAngka: 8, label: t('konseling.pokok_label') }),
      cekTeks(harapan, { wajib: true, min: 5, minHurufAngka: 4, label: t('konseling.harapan_label') }),
    );
    if (salah) return showToast(salah, 'error');
    if (jadwal && new Date(jadwal).getTime() < Date.now()) return showToast(t('konseling.past_date'), 'error');
    setConsentOpen(true);
  };

  const valid = pokok.trim().length >= 10 && harapan.trim().length >= 5;
  const hasContact = !!user?.noHp || !!user?.email;

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center gap-2">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="text-base font-bold text-neutral-900 flex-1">{t('konseling.new_title')}</Text>
        </View>
      </SafeAreaView>
      <KeyboardSafeView className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 14 }} keyboardShouldPersistTaps="handled">
          <Text className="text-xs text-neutral-500">{t('konseling.new_intro')}</Text>

          <Text className="text-sm font-semibold text-neutral-800">{t('konseling.pokok_label')}</Text>
          <TextInput
            value={pokok}
            onChangeText={setPokok}
            multiline
            maxLength={5000}
            placeholder={t('konseling.pokok_ph')}
            placeholderTextColor={nc('#A3A3A3')}
            className="bg-card rounded-2xl px-4 py-3 text-sm text-neutral-900 border border-neutral-200"
            style={{ minHeight: 140, textAlignVertical: 'top' }}
          />

          <Text className="text-sm font-semibold text-neutral-800">{t('konseling.harapan_label')}</Text>
          <TextInput
            value={harapan}
            onChangeText={setHarapan}
            multiline
            maxLength={3000}
            placeholder={t('konseling.harapan_ph')}
            placeholderTextColor={nc('#A3A3A3')}
            className="bg-card rounded-2xl px-4 py-3 text-sm text-neutral-900 border border-neutral-200"
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />

          <View className="gap-1">
            <Text className="text-sm font-semibold text-neutral-800">{t('konseling.jadwal_label')}</Text>
            <Text className="text-xs text-neutral-500">{t('konseling.jadwal_hint')}</Text>
          </View>
          <DateTimeField value={jadwal} onChange={setJadwal} />
          <TextInput
            value={catatan}
            onChangeText={setCatatan}
            maxLength={500}
            placeholder={t('konseling.catatan_ph')}
            placeholderTextColor={nc('#A3A3A3')}
            className="bg-card rounded-xl px-4 py-3 text-sm text-neutral-900 border border-neutral-200"
          />

          <Text className="text-sm font-semibold text-neutral-800">{t('konseling.pref_label')}</Text>
          <View className="flex-row flex-wrap gap-2">
            <PillOption label={t('konseling.pref_ANY')} on={pref === 'ANY'} onPress={() => setPref('ANY')} />
            <PillOption label={t('konseling.pref_SAME')} on={pref === 'SAME'} onPress={() => setPref('SAME')} />
          </View>

          <Button label={t('konseling.next')} disabled={!valid} onPress={submit} fullWidth size="lg" />
        </ScrollView>
      </KeyboardSafeView>

      <Modal visible={consentOpen} transparent animationType="fade" onRequestClose={() => setConsentOpen(false)}>
        <View className="flex-1 items-center justify-center px-6">
          <Pressable onPress={() => !mut.isPending && setConsentOpen(false)} className="absolute inset-0 bg-black/50" />
          <View className="bg-card rounded-2xl p-5 w-full max-w-sm">
            <View className="w-12 h-12 rounded-xl bg-emerald-50 items-center justify-center mb-3">
              <ShieldCheck size={24} color="#059669" />
            </View>
            <Text className="text-base font-bold text-neutral-900">{t('konseling.consent_title')}</Text>
            <Text className="text-sm text-neutral-600 mt-1.5">{t('konseling.consent_body')}</Text>
            <View className="mt-3 bg-neutral-50 rounded-xl px-3 py-2.5 gap-1.5">
              {user?.noHp ? (
                <View className="flex-row items-center gap-2">
                  <Phone size={14} color={nc('#525252')} />
                  <Text className="text-sm text-neutral-800">{user.noHp}</Text>
                </View>
              ) : null}
              {user?.email ? (
                <View className="flex-row items-center gap-2">
                  <Mail size={14} color={nc('#525252')} />
                  <Text className="text-sm text-neutral-800">{user.email}</Text>
                </View>
              ) : null}
              {!hasContact ? <Text className="text-xs text-red-600">{t('konseling.no_contact')}</Text> : null}
            </View>
            <Text className="text-[11px] text-neutral-500 mt-2">{t('konseling.consent_note')}</Text>
            <View className="flex-row gap-2 mt-4">
              <View className="flex-1">
                <Button label={t('common.cancel')} variant="secondary" disabled={mut.isPending} onPress={() => setConsentOpen(false)} fullWidth singleLine />
              </View>
              <View className="flex-1">
                <Button label={t('konseling.consent_agree')} loading={mut.isPending} disabled={!hasContact} onPress={() => mut.mutate()} fullWidth singleLine />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
