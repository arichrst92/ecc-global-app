/**
 * Create new business — minimal form (nama, tipe, industri, online).
 * After create, redirect ke /profile/businesses/[id] untuk lengkapi
 * details + upload logo/hero/PDF.
 */
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useCreateBusiness } from '@/hooks/useLocalBusiness';
import { ApiError } from '@/types/api';
import { INDUSTRI_SUGGESTIONS } from '@/types/localBusiness';
import type { TipeBisnis } from '@/types/localBusiness';

export default function NewBusinessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const createMutation = useCreateBusiness();

  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [industri, setIndustri] = useState('');
  const [tipeBisnis, setTipeBisnis] = useState<TipeBisnis>('B2C');
  const [isOnline, setIsOnline] = useState(false);
  const [lokasi, setLokasi] = useState('');

  function handleSubmit() {
    const namaTrim = nama.trim();
    if (namaTrim.length < 2) {
      Alert.alert(t('my_business.nama_required'));
      return;
    }
    createMutation.mutate(
      {
        nama: namaTrim,
        deskripsi: deskripsi.trim() || undefined,
        industri: industri.trim() || undefined,
        tipeBisnis,
        isOnline,
        lokasi: lokasi.trim() || undefined,
      },
      {
        onSuccess: (biz) => {
          showToast(t('my_business.created_success'), 'success');
          router.replace(`/profile/businesses/${biz.id}` as never);
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : t('error.network');
          Alert.alert(msg);
        },
      },
    );
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="text-base font-bold text-neutral-900 flex-1">
            {t('my_business.new_title')}
          </Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-xs text-neutral-500 mb-4 leading-relaxed">
            {t('my_business.new_helper')}
          </Text>

          <Field label={t('my_business.nama_label') + ' *'}>
            <TextInput
              value={nama}
              onChangeText={setNama}
              placeholder={t('my_business.nama_placeholder')}
              maxLength={255}
              className="bg-white rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
            />
          </Field>

          <Field label={t('my_business.deskripsi_label')}>
            <TextInput
              value={deskripsi}
              onChangeText={setDeskripsi}
              placeholder={t('my_business.deskripsi_placeholder')}
              multiline
              numberOfLines={3}
              maxLength={2000}
              textAlignVertical="top"
              className="bg-white rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900 min-h-[80px]"
            />
          </Field>

          <Field label={t('my_business.tipe_label') + ' *'}>
            <View className="flex-row gap-2">
              {(['B2C', 'B2B', 'B2B2C'] as const).map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => setTipeBisnis(opt)}
                  className={`flex-1 py-3 rounded-xl border items-center ${
                    tipeBisnis === opt
                      ? 'bg-brand-50 border-brand-500'
                      : 'bg-white border-neutral-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-bold ${
                      tipeBisnis === opt ? 'text-brand-700' : 'text-neutral-700'
                    }`}
                  >
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label={t('my_business.industri_label')}>
            <TextInput
              value={industri}
              onChangeText={setIndustri}
              placeholder={t('my_business.industri_placeholder')}
              maxLength={100}
              className="bg-white rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900 mb-2"
            />
            {/* Suggestions */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {INDUSTRI_SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setIndustri(s)}
                    className={`px-3 py-1.5 rounded-full ${
                      industri === s ? 'bg-brand-500' : 'bg-neutral-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        industri === s ? 'text-white' : 'text-neutral-600'
                      }`}
                    >
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </Field>

          <Field label={t('my_business.is_online_label')}>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setIsOnline(false)}
                className={`flex-1 py-3 rounded-xl border flex-row items-center justify-center gap-1.5 ${
                  !isOnline
                    ? 'bg-brand-50 border-brand-500'
                    : 'bg-white border-neutral-200'
                }`}
              >
                <WifiOff size={14} color={!isOnline ? '#EA580C' : '#737373'} />
                <Text
                  className={`text-sm font-semibold ${
                    !isOnline ? 'text-brand-700' : 'text-neutral-700'
                  }`}
                >
                  {t('my_business.offline_label')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setIsOnline(true)}
                className={`flex-1 py-3 rounded-xl border flex-row items-center justify-center gap-1.5 ${
                  isOnline
                    ? 'bg-brand-50 border-brand-500'
                    : 'bg-white border-neutral-200'
                }`}
              >
                <Wifi size={14} color={isOnline ? '#EA580C' : '#737373'} />
                <Text
                  className={`text-sm font-semibold ${
                    isOnline ? 'text-brand-700' : 'text-neutral-700'
                  }`}
                >
                  {t('my_business.online_label')}
                </Text>
              </Pressable>
            </View>
          </Field>

          <Field label={t('my_business.lokasi_label')}>
            <TextInput
              value={lokasi}
              onChangeText={setLokasi}
              placeholder={t('my_business.lokasi_placeholder')}
              maxLength={500}
              className="bg-white rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
            />
          </Field>

          <Text className="text-xs text-neutral-500 leading-relaxed mt-2">
            {t('my_business.create_followup_notice')}
          </Text>
        </ScrollView>

        <SafeAreaView edges={['bottom']} className="bg-white border-t border-neutral-100">
          <View className="px-5 pt-3 pb-3">
            <Button
              label={t('my_business.create_btn')}
              onPress={handleSubmit}
              loading={createMutation.isPending}
              fullWidth
              size="lg"
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
        {label}
      </Text>
      {children}
    </View>
  );
}
