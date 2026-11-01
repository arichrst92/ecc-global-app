/**
 * Catat pertemuan (visit) dengan TAMU — orang tanpa akun Els App.
 * Isi nama, no HP, kategori tamu, judul & lokasi. Tamu ikut masuk "Tamu saya".
 * No HP milik jemaat terdaftar → server mencatat dengan akun jemaat itu.
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Handshake, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { TamuKategoriPicker, type TamuKategori } from '@/components/tamu/TamuKategoriPicker';
import { createGuestVisit } from '@/api/visit';
import type { VisitListItem } from '@/types/visit';
import { ApiError } from '@/types/api';
import { invalidPhoneMessage, normalizePhone } from '@/utils/phone';
import { nc } from '@/theme/ThemeRoot';

export function VisitGuestModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (v: VisitListItem) => void;
}) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [kategori, setKategori] = useState<TamuKategori>('BELUM');
  const [judul, setJudul] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const e164 = normalizePhone(noHp);
  const phoneErr = noHp.trim() && !e164 ? invalidPhoneMessage(noHp, i18n.language === 'en' ? 'en' : 'id') : undefined;

  function reset() {
    setNama('');
    setNoHp('');
    setKategori('BELUM');
    setJudul('');
    setLokasi('');
    setErr(null);
  }
  function close() {
    reset();
    onClose();
  }

  const mut = useMutation({
    mutationFn: () =>
      createGuestVisit({ nama: nama.trim(), noHp: e164!, kategori, judul: judul.trim(), lokasi: lokasi.trim() || undefined }),
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ['visit'] });
      qc.invalidateQueries({ queryKey: ['tamu', 'mine'] });
      reset();
      onCreated(v);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : t('error.generic')),
  });

  const inputCls = 'bg-neutral-50 rounded-xl px-3 py-3 text-sm text-neutral-900 border border-neutral-200';
  const can = nama.trim().length >= 2 && !!e164 && judul.trim().length >= 2;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-black/50 justify-end">
        <Pressable className="flex-1" onPress={close} />
        <View className="bg-card rounded-t-3xl" style={{ maxHeight: '90%' }}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Handshake size={18} color="#7C3AED" />
                <Text className="text-lg font-bold text-neutral-900">{t('visit.guest_title')}</Text>
              </View>
              <Pressable onPress={close} hitSlop={10} accessibilityLabel={t('common.close')}>
                <X size={18} color={nc('#737373')} />
              </Pressable>
            </View>
            <Text className="text-xs text-neutral-500 leading-5">{t('visit.guest_hint')}</Text>

            <Text className="text-sm font-semibold text-neutral-800">{t('tamu.nama')}</Text>
            <TextInput
              value={nama}
              onChangeText={(v) => {
                setNama(v);
                setErr(null);
              }}
              placeholder={t('tamu.nama_ph')}
              placeholderTextColor={nc('#A3A3A3')}
              maxLength={255}
              className={inputCls}
            />
            <PhoneInput
              label={t('tamu.no_hp')}
              value={noHp}
              onChangeText={(v) => {
                setNoHp(v);
                setErr(null);
              }}
              error={phoneErr}
            />
            <TamuKategoriPicker value={kategori} onChange={setKategori} />

            <Text className="text-sm font-semibold text-neutral-800">{t('visit.judul_label')}</Text>
            <TextInput
              value={judul}
              onChangeText={setJudul}
              placeholder={t('visit.judul_placeholder')}
              placeholderTextColor={nc('#A3A3A3')}
              maxLength={255}
              className={inputCls}
            />
            <Text className="text-sm font-semibold text-neutral-800">{t('visit.lokasi_label')}</Text>
            <TextInput
              value={lokasi}
              onChangeText={setLokasi}
              placeholder={t('visit.lokasi_placeholder')}
              placeholderTextColor={nc('#A3A3A3')}
              maxLength={500}
              className={inputCls}
            />
            {err ? <Text className="text-xs text-red-600">{err}</Text> : null}
            <Button label={t('visit.guest_submit')} loading={mut.isPending} disabled={!can} onPress={() => mut.mutate()} fullWidth />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
