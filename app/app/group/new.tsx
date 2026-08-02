/**
 * Create Group screen — single-page form (bukan wizard multi-step).
 * Any authenticated jemaat bisa create (untuk community grouping).
 *
 * Kalau `isPublic=false`, backend auto-generate joinCode 8-char — mobile
 * receive kode di response + redirect ke QR screen buat share.
 *
 * Per BE notice group-endpoints 2026-07-28.
 */
import { useMemo, useState } from 'react';
import {
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
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Info } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Picker } from '@/components/ui/Picker';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useCreateGroup } from '@/hooks/useGroup';
import { useBranches } from '@/hooks/useBranches';
import { useAuthStore } from '@/stores/auth.store';
import { GROUP_JENIS_LABELS } from '@/types/group';
import type { GroupJenis } from '@/types/group';
import { ApiError } from '@/types/api';

const JENIS_OPTIONS: GroupJenis[] = [
  'FAMILY',
  'MINISTRY',
  'COMMUNITY',
  'HOMECELL_STYLE',
  'LAINNYA',
];

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

type FieldErrors = Partial<{
  nama: string;
  cabangId: string;
  jenis: string;
}>;

export default function CreateGroupScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'id' | 'en';
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const user = useAuthStore((s) => s.user);

  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [jenis, setJenis] = useState<GroupJenis>('LAINNYA');
  const [cabangId, setCabangId] = useState<string>('');
  const [alamat, setAlamat] = useState('');
  const [hari, setHari] = useState<string>('');
  const [jam, setJam] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});

  const branchesQuery = useBranches();
  const cabangOptions = useMemo(
    () =>
      (branchesQuery.data ?? []).map((b) => ({
        value: b.id,
        label: b.nama,
      })),
    [branchesQuery.data],
  );

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

  const createMutation = useCreateGroup();

  function submit() {
    const nextErrors: FieldErrors = {};
    if (!nama.trim()) nextErrors.nama = t('group.error_nama_required');
    if (!cabangId) nextErrors.cabangId = t('group.error_cabang_required');
    if (!jenis) nextErrors.jenis = t('group.error_jenis_required');
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    createMutation.mutate(
      {
        nama: nama.trim(),
        deskripsi: deskripsi.trim() || undefined,
        jenis,
        cabangId,
        alamat: alamat.trim() || undefined,
        hari: hari || undefined,
        jam: jam.trim() || undefined,
        isPublic,
        // picJemaatId undefined → BE auto-set = requester
      },
      {
        onSuccess: (group) => {
          showToast(t('group.create_success', { nama: group.nama }), 'success');
          // Kalau private, BE auto-generate joinCode → redirect ke QR screen
          if (!group.isPublic && group.joinCode) {
            router.replace(`/group/${group.id}/qr` as never);
          } else {
            router.replace(`/group/${group.id}` as never);
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

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">
              {t('group.create_title')}
            </Text>
            <Text className="text-xs text-neutral-500">{t('group.create_subtitle')}</Text>
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
          {/* Section: Basic */}
          <View className="bg-white rounded-2xl p-4 gap-3 border border-neutral-100">
            <TextField
              label={t('group.field_nama') + ' *'}
              placeholder={t('group.field_nama_placeholder')}
              value={nama}
              onChangeText={(v) => {
                setNama(v);
                setErrors((e) => ({ ...e, nama: undefined }));
              }}
              error={errors.nama}
              editable={!createMutation.isPending}
            />
            <TextField
              label={t('group.field_deskripsi')}
              placeholder={t('group.field_deskripsi_placeholder')}
              value={deskripsi}
              onChangeText={setDeskripsi}
              multiline
              editable={!createMutation.isPending}
            />
            <Picker
              label={t('group.field_jenis') + ' *'}
              placeholder={t('group.field_jenis_placeholder')}
              value={jenis}
              options={jenisOptions}
              onChange={(v) => {
                setJenis(v as GroupJenis);
                setErrors((e) => ({ ...e, jenis: undefined }));
              }}
              error={errors.jenis}
              modalTitle={t('group.field_jenis_modal')}
            />
            <Picker
              label={t('group.field_cabang') + ' *'}
              placeholder={
                branchesQuery.isPending
                  ? t('signup.branch_loading')
                  : t('group.field_cabang_placeholder')
              }
              value={cabangId}
              options={cabangOptions}
              onChange={(v) => {
                setCabangId(v);
                setErrors((e) => ({ ...e, cabangId: undefined }));
              }}
              error={errors.cabangId}
              modalTitle={t('signup.branch_modal_title')}
            />
          </View>

          {/* Section: Schedule + location */}
          <View className="bg-white rounded-2xl p-4 mt-3 gap-3 border border-neutral-100">
            <Text className="text-xs font-bold text-neutral-500 uppercase">
              {t('group.section_schedule')}
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Picker
                  label={t('group.field_hari')}
                  placeholder="—"
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
                  editable={!createMutation.isPending}
                />
              </View>
            </View>
            <TextField
              label={t('group.field_alamat')}
              placeholder={t('group.field_alamat_placeholder')}
              value={alamat}
              onChangeText={setAlamat}
              multiline
              editable={!createMutation.isPending}
            />
          </View>

          {/* Section: Visibility */}
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
            {!isPublic ? (
              <View className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl flex-row gap-2">
                <Info size={14} color="#92400e" style={{ marginTop: 1 }} />
                <Text className="text-xs text-amber-800 flex-1">
                  {t('group.private_create_hint')}
                </Text>
              </View>
            ) : null}
          </View>

          {/* PIC hint */}
          <View className="mt-4 p-3 bg-brand-50 border border-brand-100 rounded-xl">
            <Text className="text-xs text-brand-700 leading-relaxed">
              💡 {t('group.pic_default_hint', { nama: user?.namaLengkap ?? '' })}
            </Text>
          </View>
        </ScrollView>

        <View className="px-4 py-3 bg-white border-t border-neutral-100">
          <Button
            label={t('group.create_action')}
            onPress={submit}
            loading={createMutation.isPending}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
