/**
 * Tambah / ubah item katalog — 2.4.7.
 * Param: bizId (wajib), itemId (opsional → mode ubah).
 *
 * Foto 3:2 maks. 4. Mode tambah: foto disimpan lokal dulu, diunggah setelah
 * item tercipta. Mode ubah: foto langsung diunggah/dihapus.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { TextInput } from '@/components/ui/ThemedTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, Check, ChevronDown, Trash2, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { HeroImage } from '@/components/ui/HeroImage';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { useToast } from '@/components/ui/Toast';
import {
  useDeleteItem,
  useDeleteItemFoto,
  useMyItems,
  useSaveItem,
  useUploadItemFoto,
} from '@/hooks/useLocalBusiness';
import { ApiError } from '@/types/api';
import {
  CURRENCY_SYMBOL,
  LOCAL_CURRENCIES,
  hargaLabel,
  type LocalHargaTipe,
  type LocalItemJenis,
} from '@/types/localBusiness';
import { goBack } from '@/utils/nav';
import { imageAssetToFile } from '@/utils/pickedImage';
import type { FileObj } from '@/api/businesses';
import { nc } from '@/theme/ThemeRoot';
import { cekTeks, pertamaGagal } from '@/utils/inputRules';

const FOTO_MAX = 4;

export default function KatalogItemFormScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const { bizId = '', itemId } = useLocalSearchParams<{ bizId: string; itemId?: string }>();
  const isEdit = !!itemId;

  const itemsQ = useMyItems(bizId);
  const item = useMemo(() => itemsQ.data?.items.find((i) => i.id === itemId), [itemsQ.data, itemId]);

  const save = useSaveItem(bizId);
  const del = useDeleteItem(bizId);
  const upFoto = useUploadItemFoto(bizId);
  const delFoto = useDeleteItemFoto(bizId);

  const [jenis, setJenis] = useState<LocalItemJenis>('PRODUK');
  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [hargaTipe, setHargaTipe] = useState<LocalHargaTipe>('TETAP');
  const [harga, setHarga] = useState('');
  const [mataUang, setMataUang] = useState('IDR');
  const [satuan, setSatuan] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [localFotos, setLocalFotos] = useState<FileObj[]>([]);
  const [curOpen, setCurOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (item && !loaded) {
      setJenis(item.jenis);
      setNama(item.nama);
      setDeskripsi(item.deskripsi ?? '');
      setHargaTipe(item.hargaTipe);
      setHarga(item.harga != null ? String(item.harga) : '');
      setMataUang(item.mataUang);
      setSatuan(item.satuan ?? '');
      setIsActive(item.isActive);
      setLoaded(true);
    }
  }, [item, loaded]);

  const serverFotos = item?.fotoUrls ?? [];
  const fotoCount = isEdit ? serverFotos.length : localFotos.length;
  const hargaNum = Number(harga.replace(/[^\d.]/g, ''));
  const onErr = (err: unknown) => showToast(err instanceof ApiError ? err.message : t('error.network'), 'error');

  async function pickFoto() {
    if (fotoCount >= FOTO_MAX) {
      showToast(t('katalog.foto_max', { max: FOTO_MAX }), 'error');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast(t('my_business.permission_denied'), 'error');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 2],
      quality: 0.85,
    });
    if (r.canceled || !r.assets[0]) return;
    const file = await imageAssetToFile(r.assets[0]);
    if (isEdit && itemId) {
      upFoto.mutate({ itemId, file }, { onError: onErr });
    } else {
      setLocalFotos((p) => [...p, file]);
    }
  }

  function removeFoto(idx: number) {
    if (isEdit && itemId) {
      const url = serverFotos[idx];
      if (url) delFoto.mutate({ itemId, url }, { onError: onErr });
    } else {
      setLocalFotos((p) => p.filter((_, i) => i !== idx));
    }
  }

  async function handleSave() {
    if (nama.trim().length < 2) {
      showToast(t('katalog.nama_required'), 'error');
      return;
    }
    const salah = pertamaGagal(
      cekTeks(nama, { label: t('katalog.nama_label') }),
      cekTeks(deskripsi, { label: t('katalog.deskripsi_label') }),
    );
    if (salah) {
      showToast(salah, 'error');
      return;
    }
    if (hargaTipe !== 'NEGO' && !(hargaNum > 0)) {
      showToast(t('katalog.harga_required'), 'error');
      return;
    }
    const payload = {
      jenis,
      nama: nama.trim(),
      deskripsi: deskripsi.trim() || null,
      hargaTipe,
      harga: hargaTipe === 'NEGO' ? null : hargaNum,
      mataUang,
      satuan: hargaTipe === 'NEGO' ? null : satuan.trim() || null,
      isActive,
    };
    setBusy(true);
    try {
      const saved = await save.mutateAsync({ itemId, payload });
      if (!isEdit) {
        for (const f of localFotos) {
          await upFoto.mutateAsync({ itemId: saved.id, file: f }).catch(onErr);
        }
      }
      showToast(t('katalog.saved'), 'success');
      goBack(router);
    } catch (err) {
      onErr(err);
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    if (!itemId) return;
    Alert.alert(t('katalog.delete_title'), t('katalog.delete_msg', { name: nama }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          del.mutate(itemId, {
            onSuccess: () => {
              showToast(t('katalog.deleted'), 'success');
              goBack(router);
            },
            onError: onErr,
          }),
      },
    ]);
  }

  if (isEdit && itemsQ.isPending) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  const fotoBusy = upFoto.isPending || delFoto.isPending;
  const preview = hargaLabel(
    { hargaTipe, harga: hargaTipe === 'NEGO' ? null : hargaNum || 0, mataUang, satuan: satuan.trim() || null },
    t('katalog.harga_nego'),
    t('katalog.harga_mulai'),
  );

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {isEdit ? t('katalog.edit_title') : t('katalog.new_title')}
          </Text>
          {isEdit ? (
            <Pressable onPress={handleDelete} className="w-10 h-10 items-center justify-center">
              <Trash2 size={18} color="#DC2626" />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>

      <KeyboardSafeView className="flex-1">
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* Foto 3:2 */}
          <Label text={`${t('katalog.foto_label')} (${fotoCount}/${FOTO_MAX})`} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
            <View className="flex-row gap-2">
              {(isEdit ? serverFotos : localFotos.map((f) => f.uri)).map((u, idx) => (
                <View key={`${u}-${idx}`} style={{ width: 150, aspectRatio: 1.5 }} className="rounded-xl overflow-hidden">
                  {isEdit ? (
                    <HeroImage url={u} fallbackEmoji="📦" emojiSize={24} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Image source={{ uri: u }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  )}
                  <Pressable
                    onPress={() => removeFoto(idx)}
                    disabled={fotoBusy}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/55 items-center justify-center"
                  >
                    <X size={13} color="#fff" />
                  </Pressable>
                  {idx === 0 ? (
                    <View className="absolute bottom-1.5 left-1.5 bg-black/55 rounded-full px-2 py-0.5">
                      <Text className="text-[9px] font-bold text-white">{t('katalog.foto_cover')}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
              {fotoCount < FOTO_MAX ? (
                <Pressable
                  onPress={pickFoto}
                  disabled={fotoBusy}
                  style={{ width: 150, aspectRatio: 1.5 }}
                  className="rounded-xl border border-dashed border-neutral-300 bg-card items-center justify-center"
                >
                  {fotoBusy ? <ActivityIndicator color="#EA580C" /> : <Camera size={22} color="#EA580C" />}
                  <Text className="text-[11px] font-semibold text-brand-600 mt-1">{t('katalog.foto_add')}</Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
          <Text className="text-[10px] text-neutral-400 mb-4">{t('katalog.foto_hint')}</Text>

          <Label text={t('katalog.jenis_label')} />
          <View className="flex-row gap-2 mb-4">
            {(['PRODUK', 'JASA'] as const).map((j) => (
              <Chip
                key={j}
                active={jenis === j}
                label={j === 'JASA' ? t('katalog.jenis_jasa') : t('katalog.jenis_produk')}
                onPress={() => setJenis(j)}
              />
            ))}
          </View>

          <Label text={`${t('katalog.nama_label')} *`} />
          <TextInput
            value={nama}
            onChangeText={setNama}
            maxLength={150}
            placeholder={t('katalog.nama_ph')}
            className="bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900 mb-4"
          />

          <Label text={t('katalog.harga_tipe_label')} />
          <View className="flex-row gap-2 mb-3">
            {(['TETAP', 'MULAI_DARI', 'NEGO'] as const).map((h) => (
              <Chip
                key={h}
                active={hargaTipe === h}
                label={t(`katalog.tipe_${h.toLowerCase()}`)}
                onPress={() => setHargaTipe(h)}
              />
            ))}
          </View>

          {hargaTipe !== 'NEGO' ? (
            <>
              <View className="flex-row gap-2 mb-3">
                <Pressable
                  onPress={() => setCurOpen(true)}
                  className="bg-card rounded-xl px-3 border border-neutral-200 flex-row items-center gap-1"
                >
                  <Text className="text-sm font-bold text-neutral-900">{mataUang}</Text>
                  <ChevronDown size={14} color={nc('#737373')} />
                </Pressable>
                <TextInput
                  value={harga}
                  onChangeText={(v) => setHarga(v.replace(/[^\d.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  maxLength={15}
                  className="flex-1 bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
                />
                <TextInput
                  value={satuan}
                  onChangeText={setSatuan}
                  placeholder={t('katalog.satuan_ph')}
                  maxLength={30}
                  className="w-[96px] bg-card rounded-xl px-3 py-3 border border-neutral-200 text-sm text-neutral-900"
                />
              </View>
            </>
          ) : null}
          <Text className="text-xs text-neutral-500 mb-4">
            {t('katalog.preview')}: <Text className="font-bold text-brand-600">{preview}</Text>
          </Text>

          <Label text={t('katalog.deskripsi_label')} />
          <TextInput
            value={deskripsi}
            onChangeText={setDeskripsi}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            placeholder={t('katalog.deskripsi_ph')}
            className="bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900 min-h-[100px] mb-4"
          />

          <Pressable
            onPress={() => setIsActive(!isActive)}
            className={`p-4 rounded-2xl border flex-row items-center gap-3 ${
              isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-neutral-100 border-neutral-200'
            }`}
          >
            <View className="flex-1">
              <Text className={`text-sm font-bold ${isActive ? 'text-emerald-700' : 'text-neutral-600'}`}>
                {isActive ? t('katalog.active') : t('katalog.inactive')}
              </Text>
              <Text className="text-xs text-neutral-500 mt-0.5">
                {isActive ? t('katalog.active_sub') : t('katalog.inactive_sub')}
              </Text>
            </View>
            <View
              className={`w-12 h-6 rounded-full justify-center px-0.5 ${
                isActive ? 'bg-emerald-500 items-end' : 'bg-neutral-300 items-start'
              }`}
            >
              <View className="w-5 h-5 rounded-full bg-card" />
            </View>
          </Pressable>
        </ScrollView>

        <SafeAreaView edges={['bottom']} className="bg-card border-t border-neutral-100">
          <View className="px-5 pt-3 pb-3">
            <Button label={t('common.save')} onPress={handleSave} loading={busy} fullWidth size="lg" />
          </View>
        </SafeAreaView>
      </KeyboardSafeView>

      {/* Pilih mata uang */}
      <Modal visible={curOpen} transparent animationType="slide" onRequestClose={() => setCurOpen(false)}>
        <Pressable onPress={() => setCurOpen(false)} className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={() => {}} className="bg-card rounded-t-3xl pt-4 pb-8">
            <Text className="text-base font-bold text-neutral-900 px-5 mb-2">{t('katalog.currency_title')}</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {LOCAL_CURRENCIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    setMataUang(c);
                    setCurOpen(false);
                  }}
                  className="px-5 py-3 flex-row items-center border-t border-neutral-100"
                >
                  <Text className="w-14 text-sm font-bold text-neutral-900">{c}</Text>
                  <Text className="flex-1 text-sm text-neutral-500">{CURRENCY_SYMBOL[c]}</Text>
                  {mataUang === c ? <Check size={16} color="#EA580C" /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{text}</Text>;
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 py-2.5 rounded-xl border items-center ${
        active ? 'bg-brand-50 border-brand-500' : 'bg-card border-neutral-200'
      }`}
    >
      <Text className={`text-xs font-bold ${active ? 'text-brand-700' : 'text-neutral-700'}`} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
