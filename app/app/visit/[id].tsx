/**
 * Visit detail screen — per BE handoff doc 2026-05-22.
 *
 * Sections:
 * - Header: judul + tanggal/jam, edit btn (initiator-only)
 * - Lawan profile card: avatar, nama, cabang, WA btn (kalau noHp)
 * - Lokasi (kalau ada)
 * - My note: editable text area
 * - Note lawan: read-only display
 * - Cancel (initiator-only, < 1 jam)
 */
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  MapPin,
  MessageCircle,
  MessageSquare,
  Pencil,
  Trash2,
  X,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  useDeleteVisit,
  useUpdateVisitMeta,
  useUpdateVisitNote,
  useVisitDetail,
} from '@/hooks/useVisit';
import { ApiError } from '@/types/api';

export default function VisitDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showToast = useToast((s) => s.show);

  const query = useVisitDetail(id);
  const visit = query.data;

  const updateMetaMutation = useUpdateVisitMeta(id ?? '');
  const updateNoteMutation = useUpdateVisitNote(id ?? '');
  const deleteMutation = useDeleteVisit();

  const [editMetaOpen, setEditMetaOpen] = useState(false);
  const [editJudul, setEditJudul] = useState('');
  const [editLokasi, setEditLokasi] = useState('');

  const [editNoteOpen, setEditNoteOpen] = useState(false);
  const [editNote, setEditNote] = useState('');

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (visit) {
      setEditJudul(visit.judul);
      setEditLokasi(visit.lokasi ?? '');
      setEditNote(visit.myNote ?? '');
    }
  }, [visit]);

  // Cancel allowed kalau initiator + visit < 1 jam
  const canCancel = (() => {
    if (!visit?.iAmInitiator) return false;
    const ageMs = Date.now() - new Date(visit.createdAt).getTime();
    return ageMs < 60 * 60 * 1000;
  })();

  function handleSaveMeta() {
    const j = editJudul.trim();
    const l = editLokasi.trim();
    if (!j) {
      showToast(t('visit.judul_required'), 'error');
      return;
    }
    updateMetaMutation.mutate(
      { judul: j, lokasi: l || null },
      {
        onSuccess: () => {
          setEditMetaOpen(false);
          showToast(t('visit.meta_updated'), 'success');
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : t('error.network');
          showToast(msg, 'error');
        },
      },
    );
  }

  function handleSaveNote() {
    updateNoteMutation.mutate(
      { note: editNote },
      {
        onSuccess: () => {
          setEditNoteOpen(false);
          showToast(t('visit.note_updated'), 'success');
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : t('error.network');
          showToast(msg, 'error');
        },
      },
    );
  }

  function handleDelete() {
    if (!id) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setConfirmDeleteOpen(false);
        showToast(t('visit.deleted'), 'success');
        router.back();
      },
      onError: (err) => {
        setConfirmDeleteOpen(false);
        const msg = err instanceof ApiError ? err.message : t('error.network');
        showToast(msg, 'error');
      },
    });
  }

  function openWhatsApp() {
    if (!visit?.lawan.noHp) return;
    const num = visit.lawan.noHp.replace(/^\+/, '');
    Linking.openURL(`https://wa.me/${num}`).catch(() => {});
  }

  if (query.isPending) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  if (!visit) {
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
            {t('visit.detail_not_found')}
          </Text>
        </View>
      </View>
    );
  }

  const tanggalStr = new Date(visit.tanggalVisit).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
              {t('visit.detail_title')}
            </Text>
            {visit.iAmInitiator ? (
              <Pressable
                onPress={() => setEditMetaOpen(true)}
                className="w-10 h-10 items-center justify-center"
                accessibilityLabel={t('visit.edit_meta_btn')}
              >
                <Pencil size={18} color="#fff" />
              </Pressable>
            ) : null}
          </View>
          <View className="px-5 pb-6 pt-2">
            <View
              className={`self-start px-2 py-0.5 rounded-full mb-2 ${
                visit.iAmInitiator ? 'bg-white/20' : 'bg-cyan-300/30'
              }`}
            >
              <Text className="text-[10px] font-bold text-white tracking-wider">
                {visit.iAmInitiator
                  ? t('visit.role_badge_initiator')
                  : t('visit.role_badge_target')}
              </Text>
            </View>
            <Text className="text-white text-xl font-bold">{visit.judul}</Text>
            <View className="flex-row items-center gap-1.5 mt-2">
              <Calendar size={12} color="#fff" />
              <Text className="text-xs text-white/80">{tanggalStr}</Text>
            </View>
            {visit.lokasi ? (
              <View className="flex-row items-center gap-1.5 mt-1">
                <MapPin size={12} color="#fff" />
                <Text className="text-xs text-white/80" numberOfLines={2}>
                  {visit.lokasi}
                </Text>
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        {/* Lawan profile */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {visit.iAmInitiator ? t('visit.lawan_section_target') : t('visit.lawan_section_initiator')}
        </Text>
        <Pressable
          onPress={() => router.push(`/jemaat/${visit.lawan.id}` as never)}
          className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3 mb-4"
        >
          <Avatar
            name={visit.lawan.namaLengkap}
            fotoUrl={visit.lawan.fotoUrl ?? undefined}
            size={56}
          />
          <View className="flex-1 min-w-0">
            <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
              {visit.lawan.namaLengkap}
            </Text>
            <Text className="text-xs text-neutral-500 mt-0.5">
              {visit.lawan.cabang.nama}
            </Text>
          </View>
          {visit.lawan.noHp ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                openWhatsApp();
              }}
              className="w-10 h-10 rounded-full bg-green-50 items-center justify-center"
              accessibilityLabel={t('visit.whatsapp_btn')}
            >
              <MessageCircle size={16} color="#16A34A" />
            </Pressable>
          ) : null}
          <ChevronRight size={16} color="#A3A3A3" />
        </Pressable>

        {/* My note */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('visit.my_note_section')}
        </Text>
        <Pressable
          onPress={() => setEditNoteOpen(true)}
          className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4"
        >
          {visit.myNote ? (
            <Text className="text-sm text-neutral-700 leading-relaxed">
              {visit.myNote}
            </Text>
          ) : (
            <View className="flex-row items-center gap-2">
              <MessageSquare size={16} color="#A3A3A3" />
              <Text className="text-sm text-neutral-400 italic flex-1">
                {t('visit.my_note_empty')}
              </Text>
            </View>
          )}
          <View className="flex-row items-center justify-end mt-2 pt-2 border-t border-neutral-100">
            <Pencil size={11} color="#EA580C" />
            <Text className="text-xs text-brand-600 font-semibold ml-1">
              {visit.myNote ? t('visit.note_edit_cta') : t('visit.note_add_cta')}
            </Text>
          </View>
        </Pressable>

        {/* Note lawan (read-only) */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('visit.lawan_note_section', { name: visit.lawan.namaLengkap.split(' ')[0] })}
        </Text>
        <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4">
          {visit.noteLawan ? (
            <Text className="text-sm text-neutral-700 leading-relaxed">
              {visit.noteLawan}
            </Text>
          ) : (
            <View className="flex-row items-center gap-2">
              <MessageSquare size={16} color="#A3A3A3" />
              <Text className="text-sm text-neutral-400 italic flex-1">
                {t('visit.lawan_note_empty')}
              </Text>
            </View>
          )}
        </View>

        {/* Cancel — initiator only, < 1 jam */}
        {canCancel ? (
          <Pressable
            onPress={() => setConfirmDeleteOpen(true)}
            className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3"
          >
            <View className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center">
              <Trash2 size={18} color="#DC2626" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-red-600">
                {t('visit.cancel_btn')}
              </Text>
              <Text className="text-xs text-neutral-500 mt-0.5">
                {t('visit.cancel_sub')}
              </Text>
            </View>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Edit meta modal (judul + lokasi) */}
      <Modal
        visible={editMetaOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditMetaOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <Pressable
            onPress={() => setEditMetaOpen(false)}
            className="flex-1 bg-black/50 justify-end"
          >
            <Pressable
              onPress={() => {}}
              className="bg-white rounded-t-3xl p-5 pb-8"
            >
              <View className="flex-row items-center mb-3">
                <Text className="text-lg font-bold text-neutral-900 flex-1">
                  {t('visit.edit_meta_title')}
                </Text>
                <Pressable
                  onPress={() => setEditMetaOpen(false)}
                  className="w-8 h-8 items-center justify-center"
                >
                  <X size={18} color="#737373" />
                </Pressable>
              </View>

              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                {t('visit.judul_label')} *
              </Text>
              <TextInput
                value={editJudul}
                onChangeText={setEditJudul}
                placeholder={t('visit.judul_placeholder')}
                maxLength={255}
                className="bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900 mb-3"
              />

              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                {t('visit.lokasi_label')}
              </Text>
              <TextInput
                value={editLokasi}
                onChangeText={setEditLokasi}
                placeholder={t('visit.lokasi_placeholder')}
                maxLength={500}
                className="bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900 mb-4"
              />

              <Button
                label={t('common.save')}
                onPress={handleSaveMeta}
                loading={updateMetaMutation.isPending}
                fullWidth
                size="lg"
              />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit note modal */}
      <Modal
        visible={editNoteOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditNoteOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <Pressable
            onPress={() => setEditNoteOpen(false)}
            className="flex-1 bg-black/50 justify-end"
          >
            <Pressable
              onPress={() => {}}
              className="bg-white rounded-t-3xl p-5 pb-8"
            >
              <View className="flex-row items-center mb-3">
                <Text className="text-lg font-bold text-neutral-900 flex-1">
                  {t('visit.edit_note_title')}
                </Text>
                <Pressable
                  onPress={() => setEditNoteOpen(false)}
                  className="w-8 h-8 items-center justify-center"
                >
                  <X size={18} color="#737373" />
                </Pressable>
              </View>

              <Text className="text-xs text-neutral-500 mb-2">
                {t('visit.note_helper')}
              </Text>
              <TextInput
                value={editNote}
                onChangeText={setEditNote}
                placeholder={t('visit.note_placeholder')}
                multiline
                numberOfLines={6}
                maxLength={2000}
                textAlignVertical="top"
                className="bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900 mb-2 min-h-[120px]"
              />
              <Text className="text-[10px] text-neutral-400 mb-4 text-right">
                {editNote.length} / 2000
              </Text>

              <Button
                label={t('common.save')}
                onPress={handleSaveNote}
                loading={updateNoteMutation.isPending}
                fullWidth
                size="lg"
              />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cancel confirm modal */}
      <Modal
        visible={confirmDeleteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeleteOpen(false)}
      >
        <Pressable
          onPress={() => setConfirmDeleteOpen(false)}
          className="flex-1 bg-black/50 items-center justify-center px-6"
        >
          <Pressable
            onPress={() => {}}
            className="bg-white rounded-2xl p-5 w-full max-w-sm"
          >
            <View className="w-12 h-12 rounded-xl bg-red-50 items-center justify-center mb-3 self-start">
              <Trash2 size={24} color="#DC2626" />
            </View>
            <Text className="text-lg font-bold text-neutral-900 mb-1">
              {t('visit.cancel_confirm_title')}
            </Text>
            <Text className="text-sm text-neutral-500 mb-4 leading-relaxed">
              {t('visit.cancel_confirm_msg')}
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label={t('common.cancel')}
                  variant="secondary"
                  onPress={() => setConfirmDeleteOpen(false)}
                  fullWidth
                  disabled={deleteMutation.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={t('visit.confirm_cancel')}
                  variant="danger"
                  onPress={handleDelete}
                  loading={deleteMutation.isPending}
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
