/**
 * Edit Group screen — PIC-only. Update field subset via PATCH /admin/group/:id.
 * Toggle isPublic: BE auto-generate joinCode kalau true→false, clear kalau false→true.
 *
 * Per BE notice group-endpoints 2026-07-28.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Info } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Picker } from '@/components/ui/Picker';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useGroupDetail, useUpdateGroup } from '@/hooks/useGroup';
import { useAuthStore } from '@/stores/auth.store';
import { GROUP_JENIS_LABELS } from '@/types/group';
import type { GroupJenis } from '@/types/group';
import { ApiError } from '@/types/api';

const HARI_OPTIONS = [
  { value: '', label: '—' },
  { value: 'MINGGU', label: 'Minggu' },
  { value: 'SENIN', label: 'Senin' },
  { value: 'SELASA', label: 'Selasa' },
  { value: 'RABU', label: 'Rabu' },
  { value: 'KAMIS', label: 'Kamis' },
  { value: 'JUMAT', label: 'Jumat' },
  { value: 'SABTU', label: 'Sabtu' },
];

const JENIS_OPTIONS: GroupJenis[] = [
  'FAMILY',
  'MINISTRY',
  'COMMUNITY',
  'HOMECELL_STYLE',
  'LAINNYA',
];

export default function EditGroupScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'id' | 'en';
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const query = useGroupDetail(id);
  const group = query.data;
  const isPIC = !!(group && user && group.picJemaatId === user.jemaatId);

  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [jenis, setJenis] = useState<GroupJenis>('LAINNYA');
  const [alamat, setAlamat] = useState('');
  const [hari, setHari] = useState('');
  const [jam, setJam] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Pre-fill dari group data
  useEffect(() => {
    if (group && !hydrated) {
      setNama(group.nama);
      setDeskripsi(group.deskripsi ?? '');
      setJenis(group.jenis);
      setAlamat(group.alamat ?? '');
      setHari(group.hari ?? '');
      setJam(group.jam ?? '');
      setIsPublic(group.isPublic);
      setHydrated(true);
    }
  }, [group, hydrated]);

  // Guard non-PIC
  useEffect(() => {
    if (query.isPending || !hydrated) return;
    if (!isPIC) {
      showToast(t('group.edit_forbidden'), 'error');
      router.back();
    }
  }, [isPIC, hydrated, query.isPending, router, showToast, t]);

  const updateMutation = useUpdateGroup(id);

  const jenisOptions = useMemo(
    () =>
      JENIS_OPTIONS.map((j) => ({
        value: j,
        label: `${GROUP_JENIS_LABELS[j].emoji} ${
          lang === 'id' ? GROUP_JENIS_LABELS[j].id : GROUP_JENIS_LABELS[j].en
        }`,
      })),
    [lang],
  );

  function submit() {
    if (!nama.trim()) {
      Alert.alert(t('common.error'), t('group.error_nama_required'));
      return;
    }
    updateMutation.mutate(
      {
        nama: nama.trim(),
        deskripsi: deskripsi.trim() || undefined,
        jenis,
        alamat: alamat.trim() || undefined,
        hari: hari || undefined,
        jam: jam.trim() || undefined,
        isPublic,
      },
      {
        onSuccess: (updated) => {
          showToast(t('group.edit_success'), 'success');
          // Kalau baru turn ke private, redirect ke QR (parent akan re-fetch)
          if (!updated.isPublic && !group?.isPublic === false) {
            router.replace(`/group/${id}/qr` as never);
          } else {
            router.back();
          }
        },
        onError: (err) => {
          Alert.alert(
            t('common.error'),
            err instanceof ApiError ? err.message : t('error.network'),
          );
        },
      },
    );
  }

  if (query.isPending || !hydrated) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#F97316" />
      </View>
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
              {t('group.edit_title')}
            </Text>
            <Text className="text-xs text-neutral-500" numberOfLines={1}>
              {group?.nama}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="bg-white rounded-2xl p-4 gap-3 border border-neutral-100">
            <TextField
              label={t('group.field_nama') + ' *'}
              value={nama}
              onChangeText={setNama}
              editable={!updateMutation.isPending}
            />
            <TextField
              label={t('group.field_deskripsi')}
              value={deskripsi}
              onChangeText={setDeskripsi}
              multiline
              editable={!updateMutation.isPending}
            />
            <Picker
              label={t('group.field_jenis')}
              value={jenis}
              options={jenisOptions}
              onChange={(v) => setJenis(v as GroupJenis)}
              modalTitle={t('group.field_jenis_modal')}
            />
          </View>

          <View className="bg-white rounded-2xl p-4 mt-3 gap-3 border border-neutral-100">
            <Text className="text-xs font-bold text-neutral-500 uppercase">
              {t('group.section_schedule')}
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Picker
                  label={t('group.field_hari')}
                  value={hari}
                  options={HARI_OPTIONS}
                  onChange={setHari}
                  modalTitle={t('group.field_hari')}
                />
              </View>
              <View className="flex-1">
                <TextField
                  label={t('group.field_jam')}
                  placeholder="19:00"
                  value={jam}
                  onChangeText={setJam}
                  editable={!updateMutation.isPending}
                />
              </View>
            </View>
            <TextField
              label={t('group.field_alamat')}
              value={alamat}
              onChangeText={setAlamat}
              multiline
              editable={!updateMutation.isPending}
            />
          </View>

          <View className="bg-white rounded-2xl p-4 mt-3 border border-neutral-100">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold text-neutral-900">
                  {t('group.field_isPublic')}
                </Text>
                <Text className="text-xs text-neutral-500 mt-1">
                  {isPublic
                    ? t('group.field_isPublic_public_hint')
                    : t('group.field_isPublic_private_hint')}
                </Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                thumbColor={isPublic ? '#EA580C' : '#f4f3f4'}
                trackColor={{ true: '#FFEDD5', false: '#e5e5e5' }}
              />
            </View>
            {isPublic !== group?.isPublic ? (
              <View className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl flex-row gap-2">
                <Info size={14} color="#92400e" style={{ marginTop: 1 }} />
                <Text className="text-xs text-amber-800 flex-1">
                  {isPublic
                    ? t('group.visibility_change_to_public_hint')
                    : t('group.visibility_change_to_private_hint')}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View className="px-4 py-3 bg-white border-t border-neutral-100">
          <Button
            label={t('group.save_changes')}
            onPress={submit}
            loading={updateMutation.isPending}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
