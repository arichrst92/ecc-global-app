/**
 * [Pemimpin homecell] Ubah kategori (Umum/Single/Couple) + rentang usia anggota.
 * PATCH /admin/me/homecell/:id/segmen
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useSetHomecellSegmen } from '@/hooks/useHomecell';
import { ApiError } from '@/types/api';
import { nc } from '@/theme/ThemeRoot';

type Kategori = 'SINGLE' | 'COUPLE' | null;

export function SegmenEditModal({
  visible,
  homecellId,
  kategori,
  usiaMin,
  usiaMax,
  onClose,
  onSaved,
}: {
  visible: boolean;
  homecellId: string;
  kategori?: Kategori;
  usiaMin?: number | null;
  usiaMax?: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [kat, setKat] = useState<Kategori>(kategori ?? null);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mut = useSetHomecellSegmen();

  useEffect(() => {
    if (!visible) return;
    setKat(kategori ?? null);
    setMin(usiaMin != null ? String(usiaMin) : '');
    setMax(usiaMax != null ? String(usiaMax) : '');
    setError(null);
  }, [visible, kategori, usiaMin, usiaMax]);

  const parse = (v: string) => (v.trim() === '' ? null : Number(v.replace(/\D/g, '')));

  function save() {
    const a = parse(min);
    const b = parse(max);
    if ((a != null && (a < 0 || a > 120)) || (b != null && (b < 0 || b > 120))) {
      setError(t('hcj.segmen_err_range'));
      return;
    }
    if (a != null && b != null && a > b) {
      setError(t('hcj.segmen_err_order'));
      return;
    }
    setError(null);
    mut.mutate(
      { homecellId, kategori: kat, usiaMin: a, usiaMax: b },
      {
        onSuccess: onSaved,
        onError: (e) => setError(e instanceof ApiError ? e.message : t('error.network')),
      },
    );
  }

  const opts: { v: Kategori; label: string }[] = [
    { v: null, label: t('hcj.kategori_umum') },
    { v: 'SINGLE', label: t('hcj.kategori_single') },
    { v: 'COUPLE', label: t('hcj.kategori_couple') },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <Pressable onPress={onClose} className="flex-1 bg-black/50 items-center justify-center px-6">
          <Pressable onPress={() => {}} className="bg-card rounded-3xl p-5 w-full max-w-sm">
            <Text className="text-lg font-bold text-neutral-900">{t('hcj.segmen_title')}</Text>
            <Text className="text-xs text-neutral-500 mt-1 mb-4">{t('hcj.segmen_hint')}</Text>

            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{t('hcj.segmen_kategori')}</Text>
            <View className="flex-row gap-2 mb-4">
              {opts.map((o) => {
                const on = kat === o.v;
                return (
                  <Pressable
                    key={o.label}
                    onPress={() => setKat(o.v)}
                    className={`flex-1 py-2 rounded-xl border items-center ${on ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'}`}
                  >
                    <Text className={`text-sm font-semibold ${on ? 'text-white' : 'text-neutral-700'}`}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{t('hcj.segmen_usia')}</Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                value={min}
                onChangeText={(v) => setMin(v.replace(/\D/g, '').slice(0, 3))}
                keyboardType="number-pad"
                placeholder={t('hcj.segmen_from')}
                placeholderTextColor={nc('#A3A3A3')}
                className="flex-1 bg-card border border-neutral-200 rounded-xl px-3 py-2.5 text-base text-neutral-900 text-center"
              />
              <Text className="text-neutral-500">–</Text>
              <TextInput
                value={max}
                onChangeText={(v) => setMax(v.replace(/\D/g, '').slice(0, 3))}
                keyboardType="number-pad"
                placeholder={t('hcj.segmen_to')}
                placeholderTextColor={nc('#A3A3A3')}
                className="flex-1 bg-card border border-neutral-200 rounded-xl px-3 py-2.5 text-base text-neutral-900 text-center"
              />
              <Text className="text-sm text-neutral-500">{t('hcj.years')}</Text>
            </View>
            <Text className="text-[11px] text-neutral-400 mt-1.5">{t('hcj.segmen_usia_hint')}</Text>

            {error ? <Text className="text-xs text-red-600 mt-3">{error}</Text> : null}

            <View className="flex-row gap-2 mt-5">
              <Pressable onPress={onClose} className="flex-1 py-3 rounded-xl bg-neutral-100 items-center">
                <Text className="text-sm font-semibold text-neutral-700">{t('common.cancel')}</Text>
              </Pressable>
              <Pressable onPress={save} disabled={mut.isPending} className="flex-1 py-3 rounded-xl bg-brand-500 items-center">
                {mut.isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-sm font-bold text-white">{t('common.save')}</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
