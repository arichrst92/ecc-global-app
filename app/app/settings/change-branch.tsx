import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Church,
  Clock,
  History,
  X,
  XCircle,
} from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useBranches } from '@/hooks/useBranches';
import { useHomeBranch } from '@/hooks/useViewingBranch';
import {
  useMyBranchChangeRequests,
  useSubmitBranchChange,
} from '@/hooks/useBranchChange';
import { ApiError } from '@/types/api';
import type { Cabang } from '@/types/cabang';
import type { BranchChangeStatus } from '@/types/branch-change';

export default function ChangeBranchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);

  const branchesQuery = useBranches();
  const homeBranchQuery = useHomeBranch();
  const requestsQuery = useMyBranchChangeRequests();
  const submitMutation = useSubmitBranchChange();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selected, setSelected] = useState<Cabang | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const homeBranchRef = homeBranchQuery.data;
  const allBranches = branchesQuery.data ?? [];
  // Resolve full Cabang object (with alamat) dari list
  const homeBranch = useMemo(
    () => allBranches.find((b) => b.id === homeBranchRef?.id) ?? null,
    [allBranches, homeBranchRef?.id],
  );
  const otherBranches = useMemo(
    () => allBranches.filter((b) => b.id !== homeBranchRef?.id),
    [allBranches, homeBranchRef?.id],
  );

  // Cek apakah ada PENDING request
  const pendingRequest = useMemo(
    () => requestsQuery.data?.find((r) => r.status === 'PENDING') ?? null,
    [requestsQuery.data],
  );

  function handleSubmit() {
    setReasonError(null);
    if (!selected) return;
    if (reason.trim().length < 10) {
      setReasonError(t('branch_change.reason_too_short'));
      return;
    }
    submitMutation.mutate(
      { targetCabangId: selected.id, reason: reason.trim() },
      {
        onSuccess: () => {
          showToast(t('branch_change.submit_success'), 'success');
          setSelected(null);
          setReason('');
          // Refresh requests list akan otomatis via invalidate
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            if (err.code === 'CONFLICT') {
              Alert.alert(
                t('branch_change.pending_exists_title'),
                t('branch_change.pending_exists_msg'),
              );
            } else if (err.code === 'BAD_REQUEST') {
              Alert.alert(err.message);
            } else {
              Alert.alert(t('error.generic'), err.message);
            }
          } else {
            Alert.alert(t('error.network'));
          }
        },
      },
    );
  }

  const submitDisabled = !selected || !reason.trim() || !!pendingRequest;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="bg-white border-b border-neutral-100 px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('branch_change.title')}
          </Text>
          <Pressable
            onPress={() => setHistoryOpen(true)}
            className="w-10 h-10 items-center justify-center"
          >
            <History size={18} color="#525252" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Pending notice */}
          {pendingRequest ? (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex-row gap-3">
              <Clock size={20} color="#D97706" />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-amber-900">
                  {t('branch_change.pending_title')}
                </Text>
                <Text className="text-xs text-amber-800 mt-1 leading-relaxed">
                  {t('branch_change.pending_msg')}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Current branch */}
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            {t('branch_change.current_branch')}
          </Text>
          <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4 flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-xl bg-brand-100 items-center justify-center">
              <Church size={20} color="#EA580C" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-neutral-900">
                {homeBranch?.nama ?? '—'}
              </Text>
              <Text className="text-xs text-neutral-500" numberOfLines={1}>
                {homeBranch?.alamat ?? ''}
              </Text>
            </View>
          </View>

          {/* Target branch picker */}
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            {t('branch_change.target_branch')}
          </Text>
          <Pressable
            onPress={() => setPickerOpen(true)}
            disabled={!!pendingRequest}
            className={`bg-white rounded-2xl p-4 border-2 mb-4 flex-row items-center gap-3 ${
              selected ? 'border-brand-400' : 'border-dashed border-neutral-300'
            } ${pendingRequest ? 'opacity-60' : ''}`}
          >
            <View className="w-12 h-12 rounded-xl bg-neutral-100 items-center justify-center">
              <Church size={20} color="#737373" />
            </View>
            <View className="flex-1">
              {selected ? (
                <>
                  <Text className="font-bold text-neutral-900">{selected.nama}</Text>
                  <Text className="text-xs text-neutral-500" numberOfLines={1}>
                    {selected.alamat}
                  </Text>
                </>
              ) : (
                <Text className="text-sm text-neutral-500">
                  {t('branch_change.pick_target')}
                </Text>
              )}
            </View>
          </Pressable>

          {/* Reason */}
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            {t('branch_change.reason_label')}
          </Text>
          <TextInput
            value={reason}
            onChangeText={(v) => {
              setReason(v);
              setReasonError(null);
            }}
            placeholder={t('branch_change.reason_placeholder')}
            placeholderTextColor="#A3A3A3"
            multiline
            numberOfLines={4}
            editable={!pendingRequest && !submitMutation.isPending}
            className={`bg-white px-3 py-3 border rounded-xl text-sm text-neutral-900 ${
              reasonError ? 'border-red-400' : 'border-neutral-200'
            }`}
            style={{
              textAlignVertical: 'top',
              minHeight: 100,
              ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
            }}
          />
          {reasonError ? (
            <Text className="text-xs text-red-600 mt-1.5">{reasonError}</Text>
          ) : (
            <Text className="text-xs text-neutral-500 mt-1.5">
              {t('branch_change.reason_helper')}
            </Text>
          )}

          {/* Info */}
          <View className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <Text className="text-xs text-blue-800 leading-relaxed">
              {t('branch_change.process_notice')}
            </Text>
          </View>
        </ScrollView>

        <View className="px-6 pt-3 pb-3 bg-white border-t border-neutral-100">
          <Button
            label={t('branch_change.submit_btn')}
            onPress={handleSubmit}
            loading={submitMutation.isPending}
            disabled={submitDisabled}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>

      {/* Branch picker modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          onPress={() => setPickerOpen(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <Pressable
            onPress={() => {}}
            className="bg-white rounded-t-3xl"
            style={{ minHeight: 420, maxHeight: '85%' }}
          >
            <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
              <View className="items-center pt-3">
                <View className="w-10 h-1 bg-neutral-300 rounded-full" />
              </View>
              <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
                <Text className="text-lg font-bold text-neutral-900">
                  {t('branch_change.pick_target')}
                </Text>
                <Pressable
                  onPress={() => setPickerOpen(false)}
                  className="w-8 h-8 items-center justify-center -mr-1"
                >
                  <X size={18} color="#737373" />
                </Pressable>
              </View>
              <ScrollView
                style={{ flex: 1 }}
                className="px-5"
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                <View className="gap-2">
                  {otherBranches.map((b) => {
                    const isPicked = selected?.id === b.id;
                    return (
                      <Pressable
                        key={b.id}
                        onPress={() => {
                          setSelected(b);
                          setPickerOpen(false);
                        }}
                        className={`p-3 rounded-2xl border-2 flex-row items-center gap-3 ${
                          isPicked
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-neutral-200 bg-white'
                        }`}
                      >
                        <View className="w-10 h-10 rounded-xl bg-neutral-100 items-center justify-center">
                          <Church size={18} color="#525252" />
                        </View>
                        <View className="flex-1">
                          <Text className="font-semibold text-neutral-900" numberOfLines={1}>
                            {b.nama}
                          </Text>
                          <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                            {b.alamat}
                          </Text>
                        </View>
                        {isPicked ? (
                          <CheckCircle2 size={20} color="#F97316" />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* History modal */}
      <Modal
        visible={historyOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setHistoryOpen(false)}
      >
        <Pressable
          onPress={() => setHistoryOpen(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <Pressable
            onPress={() => {}}
            className="bg-white rounded-t-3xl"
            style={{ minHeight: 420, maxHeight: '85%' }}
          >
            <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
              <View className="items-center pt-3">
                <View className="w-10 h-1 bg-neutral-300 rounded-full" />
              </View>
              <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
                <Text className="text-lg font-bold text-neutral-900">
                  {t('branch_change.history_title')}
                </Text>
                <Pressable
                  onPress={() => setHistoryOpen(false)}
                  className="w-8 h-8 items-center justify-center -mr-1"
                >
                  <X size={18} color="#737373" />
                </Pressable>
              </View>
              <ScrollView
                style={{ flex: 1 }}
                className="px-5"
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                {(requestsQuery.data ?? []).length === 0 ? (
                  <View className="items-center py-12">
                    <Text className="text-sm text-neutral-500">
                      {t('branch_change.history_empty')}
                    </Text>
                  </View>
                ) : (
                  <View className="gap-2">
                    {(requestsQuery.data ?? []).map((r) => {
                      const target = allBranches.find((b) => b.id === r.targetCabangId);
                      return (
                        <HistoryRow
                          key={r.id}
                          status={r.status}
                          targetName={target?.nama ?? '—'}
                          reason={r.reason}
                          createdAt={r.createdAt}
                          reviewNote={r.reviewNote}
                        />
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function HistoryRow({
  status,
  targetName,
  reason,
  createdAt,
  reviewNote,
}: {
  status: BranchChangeStatus;
  targetName: string;
  reason: string;
  createdAt: string;
  reviewNote?: string | null;
}) {
  const { t } = useTranslation();
  const cfg =
    status === 'APPROVED'
      ? { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle2 size={16} color="#059669" />, label: t('branch_change.status_approved') }
      : status === 'REJECTED'
        ? { bg: 'bg-red-50', text: 'text-red-700', icon: <XCircle size={16} color="#DC2626" />, label: t('branch_change.status_rejected') }
        : { bg: 'bg-amber-50', text: 'text-amber-700', icon: <Clock size={16} color="#D97706" />, label: t('branch_change.status_pending') };
  return (
    <View className="bg-white rounded-2xl p-3 border border-neutral-100">
      <View className="flex-row items-center gap-2 mb-2">
        {cfg.icon}
        <View className={`${cfg.bg} px-2 py-0.5 rounded-full`}>
          <Text className={`text-[10px] font-bold ${cfg.text}`}>{cfg.label}</Text>
        </View>
        <Text className="text-[10px] text-neutral-400 ml-auto">
          {new Date(createdAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>
      <Text className="text-sm font-semibold text-neutral-900">{targetName}</Text>
      <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={2}>
        {reason}
      </Text>
      {reviewNote ? (
        <View className="mt-2 p-2 bg-neutral-50 rounded-lg flex-row gap-2">
          <AlertTriangle size={12} color="#737373" style={{ marginTop: 2 }} />
          <Text className="text-xs text-neutral-600 flex-1 italic">
            {reviewNote}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
