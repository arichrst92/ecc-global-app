/**
 * Homecell Schedule Detail + QR Scan Attendance — PIC only.
 *
 * Layout:
 * - Header: tanggal + lokasi + creator + progress (8 / 12 hadir)
 * - List Hadir (attendances) — bisa tap row untuk hapus
 * - List Belum Hadir (missingMembers)
 * - FAB "Scan QR" → modal full-screen scanner (continuous mode)
 *
 * BE endpoint masih pending — query 404 → friendly error state.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowLeft,
  Camera as CameraIcon,
  CheckCircle2,
  MapPin,
  ScanLine,
  Trash2,
  UserX,
  X,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ScannerCamera } from '@/components/scanner/ScannerCamera';
import {
  useHomecellSchedule,
  useRecordAttendance,
  useDeleteAttendance,
  useDeleteSchedule,
} from '@/hooks/useHomecellSchedules';
import { ApiError } from '@/types/api';
import { formatDateWithDay } from '@/utils/date';
import type { HomecellAttendance } from '@/types/homecellSchedule';

export default function ScheduleDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id, scheduleId } = useLocalSearchParams<{
    id: string;
    scheduleId: string;
  }>();
  const lang = i18n.language;
  const showToast = useToast((s) => s.show);

  const detailQuery = useHomecellSchedule(id, scheduleId);
  const recordMutation = useRecordAttendance(id, scheduleId);
  const deleteAttMutation = useDeleteAttendance(id, scheduleId);
  const deleteSchedMutation = useDeleteSchedule(id);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<HomecellAttendance | null>(null);
  const [confirmDeleteSchedule, setConfirmDeleteSchedule] = useState(false);

  const insets = useSafeAreaInsets();

  const schedule = detailQuery.data;

  function handleScan(kode: string) {
    recordMutation.mutate(kode, {
      onSuccess: (data) => {
        const name = data.jemaat.namaLengkap;
        if (data.alreadyAttended) {
          showToast(t('homecell.schedule_attendance_already', { name }), 'info');
        } else {
          showToast(t('homecell.schedule_attendance_recorded', { name }), 'success');
        }
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          // BE-specific codes (NOT_HOMECELL_MEMBER, KODE_NOT_FOUND) belum
          // di union ApiErrorCode — cast string compare. Aman karena cuma
          // dipakai di label mapping.
          const code = String(err.code);
          if (code === 'NOT_HOMECELL_MEMBER') {
            showToast(t('homecell.schedule_attendance_not_member'), 'error');
          } else if (code === 'KODE_NOT_FOUND' || code === 'NOT_FOUND') {
            showToast(t('homecell.kode_not_found_msg', { kode: '?' }), 'error');
          } else {
            showToast(err.message, 'error');
          }
        } else {
          showToast(t('error.network'), 'error');
        }
      },
    });
  }

  function handleDeleteAtt() {
    if (!confirmDelete) return;
    deleteAttMutation.mutate(confirmDelete.id, {
      onSuccess: () => {
        showToast(t('homecell.schedule_attendance_deleted'), 'success');
        setConfirmDelete(null);
      },
      onError: (err) => {
        const msg = err instanceof ApiError ? err.message : t('error.network');
        showToast(msg, 'error');
        setConfirmDelete(null);
      },
    });
  }

  function handleDeleteSchedule() {
    deleteSchedMutation.mutate(scheduleId, {
      onSuccess: () => {
        showToast(t('homecell.schedule_deleted_toast'), 'success');
        setConfirmDeleteSchedule(false);
        router.back();
      },
      onError: (err) => {
        if (err instanceof ApiError && String(err.code) === 'HAS_ATTENDANCE') {
          showToast(t('homecell.schedule_delete_blocked'), 'error');
        } else {
          const msg = err instanceof ApiError ? err.message : t('error.network');
          showToast(msg, 'error');
        }
        setConfirmDeleteSchedule(false);
      },
    });
  }

  if (detailQuery.isPending) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  if (detailQuery.isError || !schedule) {
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
          <AlertTriangle size={32} color="#A3A3A3" />
          <Text className="text-sm text-neutral-500 text-center mt-3">
            {detailQuery.error instanceof ApiError
              ? detailQuery.error.message
              : t('error.network')}
          </Text>
        </View>
      </View>
    );
  }

  const totalMembers = schedule.memberCount;
  const attendedCount = schedule.attendanceCount;

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
              {t('homecell.schedule_detail_title')}
            </Text>
            <Pressable
              onPress={() => setConfirmDeleteSchedule(true)}
              className="w-10 h-10 items-center justify-center"
              disabled={attendedCount > 0}
            >
              <Trash2 size={18} color={attendedCount > 0 ? '#fff8' : '#fff'} />
            </Pressable>
          </View>
          <View className="px-5 pb-6 pt-2">
            <Text className="text-white text-xl font-bold">
              {formatDateWithDay(schedule.tanggal, lang)}
            </Text>
            <View className="flex-row items-center gap-2 mt-1.5">
              <MapPin size={14} color="#fff8" />
              <Text className="text-white/90 text-sm flex-1" numberOfLines={2}>
                {schedule.lokasi}
              </Text>
            </View>
            {/* Progress */}
            <View className="bg-white/15 rounded-xl p-3 mt-4">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs font-bold text-white/80 uppercase tracking-wider">
                  {t('homecell.schedule_progress', {
                    attended: attendedCount,
                    total: totalMembers,
                  })}
                </Text>
                <Text className="text-xs text-white/80">
                  {totalMembers > 0
                    ? `${Math.round((attendedCount / totalMembers) * 100)}%`
                    : '—'}
                </Text>
              </View>
              <View className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <View
                  className="h-full bg-white rounded-full"
                  style={{
                    width: `${totalMembers > 0 ? Math.min(100, (attendedCount / totalMembers) * 100) : 0}%`,
                  }}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          // Extra bottom padding supaya last item tidak ke-overlap FAB.
          // FAB position = insets.bottom + 16 + button height(~52) → tambah 100 buffer.
          paddingBottom: insets.bottom + 100,
        }}
      >
        {schedule.catatan ? (
          <View className="bg-amber-50 border border-amber-100 rounded-2xl p-3 mb-4">
            <Text className="text-sm text-amber-900 leading-relaxed">
              {schedule.catatan}
            </Text>
          </View>
        ) : null}

        {/* Hadir */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('homecell.schedule_attendance_section', { count: attendedCount })}
        </Text>
        {schedule.attendances.length === 0 ? (
          <View className="bg-white rounded-2xl p-5 border border-dashed border-neutral-300 items-center mb-5">
            <CheckCircle2 size={24} color="#A3A3A3" />
            <Text className="text-sm text-neutral-500 text-center mt-2">
              Belum ada yang hadir
            </Text>
          </View>
        ) : (
          <View className="gap-2 mb-5">
            {schedule.attendances.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => setConfirmDelete(a)}
                className="bg-white rounded-2xl p-3 flex-row items-center gap-3 border border-neutral-100"
              >
                <Avatar
                  name={a.jemaat.namaLengkap}
                  fotoUrl={a.jemaat.fotoUrl ?? undefined}
                  size={40}
                />
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                    {a.jemaat.namaLengkap}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    {new Date(a.scannedAt).toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' · '}
                    {a.source === 'QR_SCAN' ? 'QR' : 'Manual'}
                  </Text>
                </View>
                <Trash2 size={14} color="#DC2626" />
              </Pressable>
            ))}
          </View>
        )}

        {/* Belum Hadir */}
        {schedule.missingMembers.length > 0 ? (
          <>
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              {t('homecell.schedule_missing_section', {
                count: schedule.missingMembers.length,
              })}
            </Text>
            <View className="gap-2">
              {schedule.missingMembers.map((m) => (
                <View
                  key={m.jemaatId}
                  className="bg-white rounded-2xl p-3 flex-row items-center gap-3 border border-neutral-100"
                >
                  <View className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center">
                    <UserX size={18} color="#A3A3A3" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-sm font-medium text-neutral-700" numberOfLines={1}>
                      {m.namaLengkap}
                    </Text>
                    <Text className="text-xs text-neutral-400 mt-0.5">{m.kode}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* FAB Scan QR — offset dari safe-area inset bottom supaya tidak
          overlap Android gesture bar atau 3-button nav. Minimum 16px gap
          dari edge sistem. */}
      <View
        className="absolute right-6"
        style={{ bottom: insets.bottom + 16 }}
      >
        <Pressable
          onPress={() => setScannerOpen(true)}
          className="bg-brand-500 rounded-full px-5 py-4 flex-row items-center gap-2 shadow-lg"
        >
          <ScanLine size={20} color="#fff" />
          <Text className="text-white font-bold text-sm">
            {t('homecell.schedule_scan_btn')}
          </Text>
        </Pressable>
      </View>

      {/* Scanner modal — continuous (no auto-close after scan) */}
      <Modal
        visible={scannerOpen}
        animationType="slide"
        onRequestClose={() => setScannerOpen(false)}
      >
        <View className="flex-1 bg-black">
          <SafeAreaView edges={['top']} className="bg-black/60">
            <View className="px-4 py-2 flex-row items-center">
              <Pressable
                onPress={() => setScannerOpen(false)}
                className="w-10 h-10 items-center justify-center"
              >
                <X size={22} color="#fff" />
              </Pressable>
              <Text className="flex-1 text-base font-bold text-white">
                {t('homecell.schedule_scan_modal_title')}
              </Text>
              <View className="w-10 h-10" />
            </View>
          </SafeAreaView>
          <View className="flex-1">
            <ScannerCamera
              paused={recordMutation.isPending}
              onScan={handleScan}
              onManualInput={() => {
                // Manual input deferred — untuk MVP scan only
                showToast('Manual input belum tersedia', 'info');
              }}
            />
          </View>
          <View className="bg-black/60 px-5 py-3 pb-8">
            <Text className="text-xs text-white/70 text-center">
              {recordMutation.isPending
                ? 'Mencatat kehadiran...'
                : `Arahkan kamera ke QR jemaat · ${attendedCount} / ${totalMembers} hadir`}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Delete attendance confirm */}
      <Modal
        visible={!!confirmDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDelete(null)}
      >
        <Pressable
          onPress={() => setConfirmDelete(null)}
          className="flex-1 bg-black/50 items-center justify-center px-6"
        >
          <Pressable onPress={() => {}} className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <View className="w-12 h-12 rounded-xl bg-red-50 items-center justify-center mb-3">
              <AlertTriangle size={24} color="#DC2626" />
            </View>
            <Text className="text-sm text-neutral-700 mb-4 leading-relaxed">
              {t('homecell.schedule_attendance_delete_confirm', {
                name: confirmDelete?.jemaat.namaLengkap ?? '',
              })}
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label={t('common.cancel')}
                  variant="secondary"
                  onPress={() => setConfirmDelete(null)}
                  fullWidth
                  disabled={deleteAttMutation.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={t('common.delete')}
                  variant="danger"
                  onPress={handleDeleteAtt}
                  loading={deleteAttMutation.isPending}
                  fullWidth
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete schedule confirm */}
      <Modal
        visible={confirmDeleteSchedule}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeleteSchedule(false)}
      >
        <Pressable
          onPress={() => setConfirmDeleteSchedule(false)}
          className="flex-1 bg-black/50 items-center justify-center px-6"
        >
          <Pressable onPress={() => {}} className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <View className="w-12 h-12 rounded-xl bg-red-50 items-center justify-center mb-3">
              <AlertTriangle size={24} color="#DC2626" />
            </View>
            <Text className="text-sm text-neutral-700 mb-4 leading-relaxed">
              {t('homecell.schedule_delete_confirm')}
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label={t('common.cancel')}
                  variant="secondary"
                  onPress={() => setConfirmDeleteSchedule(false)}
                  fullWidth
                  disabled={deleteSchedMutation.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={t('homecell.schedule_delete_btn')}
                  variant="danger"
                  onPress={handleDeleteSchedule}
                  loading={deleteSchedMutation.isPending}
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
