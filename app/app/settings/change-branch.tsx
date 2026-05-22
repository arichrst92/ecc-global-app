import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Church, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useBranches } from '@/hooks/useBranches';
import { useHomeBranch } from '@/hooks/useViewingBranch';
import { updateMyProfile } from '@/api/me';
import { useNotificationsStore } from '@/stores/notifications.store';
import { ApiError } from '@/types/api';
import type { Cabang } from '@/types/cabang';

/**
 * Change Branch — direct update (no approval flow).
 *
 * Per UX decision 2026-05-21: ganti cabang home langsung berlaku.
 * Sebelumnya pakai branch-change-request + admin approve, sekarang
 * PATCH /admin/me dengan cabangId baru, refresh user state.
 */
export default function ChangeBranchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const qc = useQueryClient();

  const branchesQuery = useBranches();
  const homeBranchQuery = useHomeBranch();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selected, setSelected] = useState<Cabang | null>(null);

  const homeBranchRef = homeBranchQuery.data;
  const allBranches = branchesQuery.data ?? [];
  const homeBranch = useMemo(
    () => allBranches.find((b) => b.id === homeBranchRef?.id) ?? null,
    [allBranches, homeBranchRef?.id],
  );
  const otherBranches = useMemo(
    () => allBranches.filter((b) => b.id !== homeBranchRef?.id),
    [allBranches, homeBranchRef?.id],
  );

  const addNotification = useNotificationsStore((s) => s.add);

  const mutation = useMutation({
    mutationFn: async (cabangId: string) => updateMyProfile({ cabangId }),
    onSuccess: async () => {
      // Invalidate homeBranch (resolved via getMyProfile), me profile,
      // dan content queries yang depend on cabangId
      await qc.invalidateQueries({ queryKey: ['homeBranch'] });
      await qc.invalidateQueries({ queryKey: ['me'] });
      await qc.invalidateQueries({ queryKey: ['ibadah'] });
      await qc.invalidateQueries({ queryKey: ['events'] });
      // Local notification: branch change diary trail
      if (selected) {
        await addNotification({
          category: 'branch_change',
          title: t('notif.branch_change_title'),
          body: t('notif.branch_change_body', { branch: selected.nama }),
          deepLink: '/(tabs)/profile',
        });
      }
      showToast(t('branch_change.success'), 'success');
      setConfirmOpen(false);
      router.back();
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : t('error.network');
      showToast(msg, 'error');
    },
  });

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
            {t('branch_change.title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('branch_change.current_home')}
        </Text>
        <View className="bg-white rounded-2xl p-4 border border-brand-200 flex-row items-center gap-3 mb-4">
          <View className="w-12 h-12 rounded-xl bg-brand-50 items-center justify-center">
            <Church size={22} color="#EA580C" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">
              {homeBranch?.nama ?? '—'}
            </Text>
            {homeBranch?.alamat ? (
              <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={2}>
                {homeBranch.alamat}
              </Text>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={() => setPickerOpen(true)}
          className="bg-brand-500 rounded-2xl py-3.5 items-center mb-3"
        >
          <Text className="text-white font-bold text-base">
            {t('branch_change.choose_new')}
          </Text>
        </Pressable>

        <Text className="text-xs text-neutral-500 text-center px-4 leading-relaxed">
          {t('branch_change.direct_notice')}
        </Text>
      </ScrollView>

      {/* Picker */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="bg-white border-b border-neutral-100 px-4 py-3 flex-row items-center">
            <Pressable
              onPress={() => setPickerOpen(false)}
              className="w-10 h-10 items-center justify-center"
            >
              <X size={20} color="#171717" />
            </Pressable>
            <Text className="text-base font-bold text-neutral-900 flex-1">
              {t('branch_change.picker_title')}
            </Text>
          </View>
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
            <View className="gap-2">
              {otherBranches.map((b) => (
                <Pressable
                  key={b.id}
                  onPress={() => {
                    setSelected(b);
                    setPickerOpen(false);
                    setConfirmOpen(true);
                  }}
                  className="bg-white rounded-2xl p-4 flex-row items-center gap-3 border border-neutral-100"
                >
                  <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
                    <Church size={18} color="#EA580C" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-neutral-900">
                      {b.nama}
                    </Text>
                    {b.alamat ? (
                      <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                        {b.alamat}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Confirm */}
      <Modal
        visible={confirmOpen && !!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <View className="items-center mb-3">
              <View className="w-14 h-14 rounded-2xl bg-brand-50 items-center justify-center mb-2">
                <CheckCircle2 size={28} color="#EA580C" />
              </View>
              <Text className="text-lg font-bold text-neutral-900 text-center">
                {t('branch_change.confirm_title')}
              </Text>
            </View>
            <Text className="text-sm text-neutral-600 text-center mb-1">
              {t('branch_change.confirm_body')}
            </Text>
            <Text className="text-base font-bold text-brand-700 text-center mb-4">
              {selected?.nama}
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setConfirmOpen(false)}
                disabled={mutation.isPending}
                className="flex-1 py-3 rounded-xl bg-neutral-100 items-center"
              >
                <Text className="font-semibold text-neutral-700">
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <View className="flex-1">
                <Button
                  label={t('common.confirm')}
                  onPress={() => selected && mutation.mutate(selected.id)}
                  loading={mutation.isPending}
                  fullWidth
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
