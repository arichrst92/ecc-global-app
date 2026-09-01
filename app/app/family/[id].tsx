import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, MapPin, Pencil, Phone, Trash2 } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { TipeRelasiPicker } from '@/components/family/TipeRelasiPicker';
import { useToast } from '@/components/ui/Toast';
import {
  useMyFamily,
  useUnlinkFamily,
  useUpdateFamilyRelation,
} from '@/hooks/useFamily';
import { formatPhoneDisplay } from '@/utils/phone';
import { ApiError } from '@/types/api';
import type { TipeRelasi } from '@/types/tipeRelasi';

export default function FamilyDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showToast = useToast((s) => s.show);

  const familyQuery = useMyFamily();
  const relation = familyQuery.data?.find((f) => f.jemaat.id === id);

  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [editingTipe, setEditingTipe] = useState<TipeRelasi | null>(null);

  const updateMutation = useUpdateFamilyRelation();
  const unlinkMutation = useUnlinkFamily();

  if (familyQuery.isPending) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  if (!relation) {
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
          </View>
        </SafeAreaView>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-neutral-500 text-center">
            {t('family.detail_not_found')}
          </Text>
        </View>
      </View>
    );
  }

  const { jemaat } = relation;
  // Current display: prefer tipeRelasi (granular) dari server, fallback ke null
  // saat row lama tanpa tipeRelasi (user harus pick granular untuk update)
  const serverTipe: TipeRelasi | null = relation.tipeRelasi
    ? { id: relation.tipeRelasi.id, nama: relation.tipeRelasi.nama }
    : null;
  const currentTipe = editingTipe ?? serverTipe;
  const hasTipeChange =
    editingTipe !== null && editingTipe.id !== serverTipe?.id;

  function handleSaveRole() {
    if (!editingTipe) return;
    updateMutation.mutate(
      { jemaatId: jemaat.id, payload: { tipeRelasiId: editingTipe.id } },
      {
        onSuccess: () => {
          showToast(t('family.role_updated'), 'success');
          setEditingTipe(null);
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : t('error.network');
          showToast(msg, 'error');
        },
      },
    );
  }

  function handleUnlink() {
    unlinkMutation.mutate(jemaat.id, {
      onSuccess: () => {
        setUnlinkOpen(false);
        showToast(t('family.unlinked'), 'success');
        router.replace('/family');
      },
      onError: (err) => {
        setUnlinkOpen(false);
        const msg = err instanceof ApiError ? err.message : t('error.network');
        showToast(msg, 'error');
      },
    });
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <View className="bg-brand-500 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="px-4 py-2 flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center"
            >
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
            <Text className="flex-1 text-base font-bold text-white">
              {t('family.detail_title')}
            </Text>
          </View>
          <View className="items-center pb-6 pt-2">
            <Avatar
              name={jemaat.namaLengkap}
              fotoUrl={jemaat.fotoUrl ?? undefined}
              size={80}
              className="bg-white/20"
            />
            <Text className="text-white text-xl font-bold mt-3">{jemaat.namaLengkap}</Text>
            <Text className="text-white/80 text-xs mt-0.5 font-mono tracking-widest">
              {jemaat.kode}
            </Text>
            <View className="flex-row items-center gap-1.5 mt-2">
              {jemaat.isDependent ? (
                <View className="bg-white/20 px-2 py-1 rounded-full">
                  <Text className="text-[10px] font-bold text-white">
                    {t('family.dependent_badge')}
                  </Text>
                </View>
              ) : null}
              <View
                className={`px-2 py-1 rounded-full ${
                  relation.isVerified ? 'bg-green-400/30' : 'bg-amber-400/30'
                }`}
              >
                <Text className="text-[10px] font-bold text-white">
                  {relation.isVerified
                    ? `✓ ${t('family.verified')}`
                    : t('family.unverified')}
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        {/* Contact info */}
        <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4 gap-3">
          {jemaat.noHp ? (
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
                <Phone size={18} color="#EA580C" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-neutral-500">{t('family.phone_label')}</Text>
                <Text className="text-sm font-semibold text-neutral-900">
                  {formatPhoneDisplay(jemaat.noHp)}
                </Text>
              </View>
            </View>
          ) : null}
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
              <MapPin size={18} color="#EA580C" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-neutral-500">{t('family.branch_label')}</Text>
              <Text className="text-sm font-semibold text-neutral-900">
                {jemaat.cabang.nama}
              </Text>
            </View>
          </View>
        </View>

        {/* Role editor — granular tipe relasi */}
        <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4">
          <TipeRelasiPicker
            value={currentTipe}
            onChange={setEditingTipe}
            disabled={updateMutation.isPending}
          />
          {hasTipeChange ? (
            <View className="flex-row gap-2 mt-3">
              <View className="flex-1">
                <Button
                  label={t('common.cancel')}
                  variant="secondary"
                  onPress={() => setEditingTipe(null)}
                  fullWidth
                  disabled={updateMutation.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={t('family.save_role')}
                  onPress={handleSaveRole}
                  loading={updateMutation.isPending}
                  fullWidth
                />
              </View>
            </View>
          ) : null}
        </View>

        {/* Edit Profile button — hanya untuk dependent (anak balita / lansia tanpa HP).
            Member non-dependent yang punya akun sendiri harus edit profil mereka sendiri.
            Per BE patch 2026-05-22a — endpoint dependent edit sudah ready. */}
        {jemaat.isDependent ? (
          <Pressable
            onPress={() =>
              router.push(`/settings/edit-profile?dependent=${jemaat.id}` as never)
            }
            className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3 mb-4"
          >
            <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
              <Pencil size={18} color="#EA580C" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-neutral-900">
                {t('family.edit_dependent_btn')}
              </Text>
              <Text className="text-xs text-neutral-500 mt-0.5">
                {t('family.edit_dependent_sub')}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {/* Unlink */}
        <Pressable
          onPress={() => setUnlinkOpen(true)}
          className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3"
        >
          <View className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center">
            <Trash2 size={18} color="#DC2626" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-red-600">
              {t('family.unlink_btn')}
            </Text>
            <Text className="text-xs text-neutral-500 mt-0.5">
              {t('family.unlink_sub')}
            </Text>
          </View>
        </Pressable>
      </ScrollView>

      {/* Unlink confirm modal */}
      <Modal
        visible={unlinkOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setUnlinkOpen(false)}
      >
        <Pressable
          onPress={() => setUnlinkOpen(false)}
          className="flex-1 bg-black/50 items-center justify-center px-6"
        >
          <Pressable
            onPress={() => {}}
            className="bg-white rounded-2xl p-5 w-full max-w-sm"
          >
            <View className="w-12 h-12 rounded-xl bg-red-50 items-center justify-center mb-3 self-start">
              <AlertTriangle size={24} color="#DC2626" />
            </View>
            <Text className="text-lg font-bold text-neutral-900 mb-1">
              {t('family.unlink_confirm_title')}
            </Text>
            <Text className="text-sm text-neutral-500 mb-4 leading-relaxed">
              {t('family.unlink_confirm_msg', { name: jemaat.namaLengkap })}
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label={t('common.cancel')}
                  variant="secondary"
                  onPress={() => setUnlinkOpen(false)}
                  fullWidth
                  disabled={unlinkMutation.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={t('family.confirm_unlink')}
                  variant="danger"
                  onPress={handleUnlink}
                  loading={unlinkMutation.isPending}
                  fullWidth
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
