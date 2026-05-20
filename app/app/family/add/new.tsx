import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Info, UserPlus } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { RolePicker } from '@/components/family/RolePicker';
import { useToast } from '@/components/ui/Toast';
import { useRegisterNewFamily } from '@/hooks/useFamily';
import { ApiError } from '@/types/api';
import type { FamilyRole } from '@/types/family';

export default function FamilyAddNewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [namaError, setNamaError] = useState<string | null>(null);
  const [gender, setGender] = useState<'L' | 'P' | null>(null);
  const [role, setRole] = useState<FamilyRole | null>(null);
  const showToast = useToast((s) => s.show);
  const registerMutation = useRegisterNewFamily();

  function handleSubmit() {
    setNamaError(null);
    if (!nama.trim()) {
      setNamaError(t('family.nama_required'));
      return;
    }
    if (!role) return;
    registerMutation.mutate(
      {
        namaLengkap: nama.trim(),
        role,
        jenisKelamin: gender,
        noHp: null, // dependent — no phone
      },
      {
        onSuccess: (data) => {
          showToast(
            t('family.register_new_success', { name: data.jemaat.namaLengkap }),
            'success',
          );
          router.replace('/family');
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            Alert.alert(t('error.generic'), err.message);
          } else {
            Alert.alert(t('error.network'));
          }
        },
      },
    );
  }

  const submitDisabled = !nama.trim() || !role;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="px-4 py-2 flex-row items-center border-b border-neutral-100">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('family.add_via_new')}
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4 flex-row gap-3">
            <View className="w-10 h-10 rounded-xl bg-emerald-100 items-center justify-center">
              <UserPlus size={18} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-emerald-900">
                {t('family.add_new_title')}
              </Text>
              <Text className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                {t('family.add_new_intro')}
              </Text>
            </View>
          </View>

          <TextField
            label={t('family.nama_lengkap')}
            placeholder={t('family.nama_placeholder')}
            value={nama}
            onChangeText={(v) => {
              setNama(v);
              setNamaError(null);
            }}
            error={namaError ?? undefined}
            editable={!registerMutation.isPending}
          />

          <View className="mt-4">
            <Text className="text-xs font-medium text-neutral-600 mb-2">
              {t('family.gender_label')}
            </Text>
            <View className="flex-row gap-2">
              {(['L', 'P'] as const).map((g) => {
                const active = gender === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    className={`flex-1 py-3 rounded-xl border ${
                      active ? 'bg-brand-500 border-brand-500' : 'bg-white border-neutral-200'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold text-center ${
                        active ? 'text-white' : 'text-neutral-700'
                      }`}
                    >
                      {g === 'L' ? t('family.gender_male') : t('family.gender_female')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="mt-5">
            <RolePicker
              value={role}
              onChange={setRole}
              disabled={registerMutation.isPending}
            />
          </View>

          <View className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex-row gap-2">
            <Info size={16} color="#92400e" />
            <Text className="text-xs text-amber-800 flex-1">
              {t('family.dependent_notice')}
            </Text>
          </View>
        </ScrollView>

        <View className="px-6 pt-3 pb-3 bg-white border-t border-neutral-100">
          <Button
            label={t('family.register_new_btn')}
            onPress={handleSubmit}
            loading={registerMutation.isPending}
            disabled={submitDisabled}
            fullWidth
            size="lg"
            leftIcon={<UserPlus size={16} color="#fff" />}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
