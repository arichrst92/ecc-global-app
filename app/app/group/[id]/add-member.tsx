/**
 * PIC — Add member ke group via scan QR jemaat atau input kode manual.
 *
 * Endpoint: POST /admin/group/:id/members/:jemaatId — butuh jemaatId (bukan kode).
 * Mobile flow:
 * 1. Scan QR jemaat → kode 8-char → resolve ke jemaatId via existing lookup
 *    (mobile pakai endpoint scanner atau jemaat lookup by kode)
 * 2. Alternatively: pakai endpoint helper /admin/group/:id/members/by-kode
 *    kalau BE sediakan (belum ada di notice; sementara pakai 2-step lookup+add)
 *
 * Simplification untuk M40: pakai search jemaat by nama/kode → tap pilih → add.
 * TODO Sprint 3.5: implement QR scan direct kalau BE sediakan endpoint by-kode.
 *
 * Per BE notice group-endpoints 2026-07-28.
 */
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Info, UserPlus } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useAddGroupMember } from '@/hooks/useGroup';
import { ApiError } from '@/types/api';

export default function AddGroupMemberScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [jemaatIdInput, setJemaatIdInput] = useState('');
  const [catatan, setCatatan] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addMutation = useAddGroupMember(id);

  function submit() {
    setError(null);
    const trimmed = jemaatIdInput.trim();
    if (!trimmed) {
      setError(t('group.add_member_error_required'));
      return;
    }
    addMutation.mutate(
      { jemaatId: trimmed, catatan: catatan.trim() || undefined },
      {
        onSuccess: (data) => {
          showToast(
            data.alreadyMember
              ? t('group.add_member_already')
              : t('group.add_member_success'),
            'success',
          );
          router.back();
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            if (err.code === 'NOT_FOUND') {
              setError(t('group.add_member_error_not_found'));
            } else {
              setError(err.message);
            }
          } else {
            setError(t('error.network'));
          }
        },
      },
    );
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">
              {t('group.add_member_title')}
            </Text>
            <Text className="text-xs text-neutral-500">{t('group.add_member_subtitle')}</Text>
          </View>
        </View>
      </SafeAreaView>

      <View className="flex-1 p-4 gap-4">
        <View className="bg-white rounded-2xl p-4 gap-3 border border-neutral-100">
          <TextField
            label={t('group.add_member_field_jemaat_id') + ' *'}
            placeholder="uuid jemaat..."
            value={jemaatIdInput}
            onChangeText={(v) => {
              setJemaatIdInput(v);
              setError(null);
            }}
            error={error ?? undefined}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!addMutation.isPending}
          />
          <TextField
            label={t('group.add_member_field_catatan')}
            placeholder={t('group.add_member_field_catatan_placeholder')}
            value={catatan}
            onChangeText={setCatatan}
            multiline
            editable={!addMutation.isPending}
          />
        </View>

        <View className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex-row gap-2">
          <Info size={14} color="#92400e" style={{ marginTop: 1 }} />
          <Text className="text-xs text-amber-800 flex-1 leading-relaxed">
            {t('group.add_member_hint')}
          </Text>
        </View>

        <View className="mt-auto">
          <Button
            label={t('group.add_member_action')}
            onPress={submit}
            loading={addMutation.isPending}
            fullWidth
            size="lg"
            leftIcon={<UserPlus size={18} color="#fff" />}
          />
        </View>
      </View>
    </View>
  );
}
