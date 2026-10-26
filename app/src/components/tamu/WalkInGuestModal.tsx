/**
 * Petugas: catat TAMU walk-in (datang tanpa daftar) di layar scanner.
 * Nama + no HP; event berbayar → pilih cara bayar (diterima petugas) / gratis.
 * No HP milik jemaat terdaftar → jemaat itu yang tercatat hadir.
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { UserPlus, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useToast } from '@/components/ui/Toast';
import { walkInGuestEvent, walkInGuestIbadah, type WalkInBayar } from '@/api/tamu';
import { ApiError } from '@/types/api';
import { invalidPhoneMessage, normalizePhone } from '@/utils/phone';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

type Target =
  | { kind: 'event'; eventId: string; tipeBayar: 'GRATIS' | 'NOMINAL_TETAP' | 'NOMINAL_BEBAS'; nominal?: string | number | null }
  | { kind: 'ibadah'; ibadahId: string; tanggalIbadah: string };

export function WalkInGuestModal({
  visible,
  target,
  onClose,
  onDone,
}: {
  visible: boolean;
  target: Target;
  onClose: () => void;
  onDone?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const showToast = useToast((s) => s.show);
  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [bayar, setBayar] = useState<WalkInBayar>('TUNAI');
  const [nominal, setNominal] = useState('');
  const [quotaFull, setQuotaFull] = useState(false);
  const e164 = normalizePhone(noHp);
  const paid = target.kind === 'event' && target.tipeBayar !== 'GRATIS';

  const mut = useMutation({
    mutationFn: (force: boolean) =>
      target.kind === 'event'
        ? walkInGuestEvent(target.eventId, {
            nama: nama.trim(),
            noHp: e164!,
            ...(paid ? { pembayaran: bayar } : {}),
            ...(target.tipeBayar === 'NOMINAL_BEBAS' && bayar !== 'GRATIS' ? { nominal: Number(nominal) || 0 } : {}),
            ...(force ? { force: true } : {}),
          })
        : walkInGuestIbadah({ ibadahId: target.ibadahId, tanggalIbadah: target.tanggalIbadah, nama: nama.trim(), noHp: e164! }),
    onSuccess: (r) => {
      showToast(
        r.isMember ? t('tamu.walkin_member', { name: r.jemaat.namaLengkap }) : t('tamu.walkin_ok', { name: r.jemaat.namaLengkap }),
        'success',
      );
      onDone?.();
      close();
    },
    onError: (e) => {
      if (e instanceof ApiError && String(e.code) === 'QUOTA_FULL') {
        setQuotaFull(true);
        return;
      }
      showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error');
    },
  });

  function close() {
    setNama('');
    setNoHp('');
    setNominal('');
    setBayar('TUNAI');
    setQuotaFull(false);
    onClose();
  }
  const phoneErr = noHp.trim() && !e164 ? invalidPhoneMessage(noHp, i18n.language === 'en' ? 'en' : 'id') : undefined;
  const nominalTetap = target.kind === 'event' && target.tipeBayar === 'NOMINAL_TETAP' ? Number(target.nominal ?? 0) : 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-black/50 justify-end">
        <Pressable className="flex-1" onPress={close} />
        <View className="bg-card rounded-t-3xl p-5 gap-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <UserPlus size={18} color="#7C3AED" />
              <Text className="text-lg font-bold text-neutral-900">{t('tamu.walkin_title')}</Text>
            </View>
            <Pressable onPress={close} hitSlop={10}>
              <X size={18} color={nc('#737373')} />
            </Pressable>
          </View>
          <Text className="text-xs text-neutral-500 leading-5">{t('tamu.walkin_hint')}</Text>
          <Text className="text-sm font-semibold text-neutral-800">{t('tamu.nama')}</Text>
          <TextInput
            value={nama}
            onChangeText={setNama}
            placeholder={t('tamu.nama_ph')}
            placeholderTextColor={nc('#A3A3A3')}
            maxLength={255}
            className="bg-neutral-50 rounded-xl px-3 py-3 text-sm text-neutral-900 border border-neutral-200"
          />
          <PhoneInput label={t('tamu.no_hp')} value={noHp} onChangeText={setNoHp} error={phoneErr} />
          {paid ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-neutral-800">{t('tamu.pembayaran')}</Text>
              <View className="flex-row gap-2">
                {(['TUNAI', 'TRANSFER', 'QRIS', 'GRATIS'] as WalkInBayar[]).map((b) => {
                  const on = bayar === b;
                  return (
                    <Pressable
                      key={b}
                      onPress={() => setBayar(b)}
                      {...gx(`flex-1 items-center py-2 rounded-xl border ${on ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-300'}`)}
                    >
                      <Text className={`text-xs font-bold ${on ? 'text-white' : 'text-neutral-700'}`}>{t(`tamu.bayar_${b}`)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {target.kind === 'event' && target.tipeBayar === 'NOMINAL_BEBAS' && bayar !== 'GRATIS' ? (
                <TextInput
                  value={nominal}
                  onChangeText={(v) => setNominal(v.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  placeholder={t('tamu.nominal_ph')}
                  placeholderTextColor={nc('#A3A3A3')}
                  className="bg-neutral-50 rounded-xl px-3 py-3 text-sm text-neutral-900 border border-neutral-200"
                />
              ) : nominalTetap > 0 && bayar !== 'GRATIS' ? (
                <Text className="text-xs text-neutral-500">
                  {t('tamu.nominal_tetap', { nominal: nominalTetap.toLocaleString('id-ID') })}
                </Text>
              ) : null}
            </View>
          ) : null}
          {quotaFull ? (
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <Text className="text-xs text-amber-900">{t('tamu.quota_full')}</Text>
            </View>
          ) : null}
          <Button
            label={quotaFull ? t('tamu.force_btn') : t('tamu.walkin_btn')}
            loading={mut.isPending}
            disabled={nama.trim().length < 2 || !e164}
            onPress={() => mut.mutate(quotaFull)}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
