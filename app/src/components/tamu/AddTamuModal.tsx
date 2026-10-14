/**
 * Tambah tamu (teman non-anggota) — nama + no HP. Dipakai di pendaftaran
 * event dan popup self check-in ibadah.
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { UserPlus, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { addMyTamu, type Tamu } from '@/api/tamu';
import { ApiError } from '@/types/api';
import { invalidPhoneMessage, normalizePhone } from '@/utils/phone';

export function AddTamuModal({
  visible,
  onClose,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  onAdded: (t: Tamu) => void;
}) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const e164 = normalizePhone(noHp);

  const mut = useMutation({
    mutationFn: () => addMyTamu({ nama: nama.trim(), noHp: e164! }),
    onSuccess: (tamu) => {
      qc.invalidateQueries({ queryKey: ['tamu', 'mine'] });
      onAdded(tamu);
      reset();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : t('error.generic')),
  });

  function reset() {
    setNama('');
    setNoHp('');
    setErr(null);
  }
  function close() {
    reset();
    onClose();
  }

  const phoneErr = noHp.trim() && !e164 ? invalidPhoneMessage(noHp, i18n.language === 'en' ? 'en' : 'id') : undefined;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-black/50 justify-end">
        <Pressable className="flex-1" onPress={close} />
        <View className="bg-white rounded-t-3xl p-5 gap-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <UserPlus size={18} color="#7C3AED" />
              <Text className="text-lg font-bold text-neutral-900">{t('tamu.add_title')}</Text>
            </View>
            <Pressable onPress={close} hitSlop={10}>
              <X size={18} color="#737373" />
            </Pressable>
          </View>
          <Text className="text-xs text-neutral-500 leading-5">{t('tamu.add_hint')}</Text>
          <Text className="text-sm font-semibold text-neutral-800">{t('tamu.nama')}</Text>
          <TextInput
            value={nama}
            onChangeText={(v) => {
              setNama(v);
              setErr(null);
            }}
            placeholder={t('tamu.nama_ph')}
            placeholderTextColor="#A3A3A3"
            maxLength={255}
            className="bg-neutral-50 rounded-xl px-3 py-3 text-sm text-neutral-900 border border-neutral-200"
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
          {err ? <Text className="text-xs text-red-600">{err}</Text> : null}
          <Button
            label={t('tamu.add_btn')}
            loading={mut.isPending}
            disabled={nama.trim().length < 2 || !e164}
            onPress={() => mut.mutate()}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
