/**
 * Editor Catatan saya (2.4.5) — catatan khotbah pribadi.
 *   /catatan/edit            → catatan baru (draf otomatis tersimpan di HP)
 *   /catatan/edit?id=        → ubah catatan
 *   /catatan/edit?ref=&quote= → catatan baru berisi ayat (dari halaman Alkitab)
 *
 * Format: markdown ringan via toolbar (tebal, miring, judul, poin, nomor,
 * kutipan, stabilo, ayat, gambar). Tanpa modul native.
 * Gambar (2.4.9): kamera / galeri → diunggah → disisipkan di posisi kursor
 * sebagai baris `![gambar](url)`, tampil menyatu dengan teks di Pratinjau &
 * tampilan baca; daftar gambar di atas kotak tulis (ketuk × untuk hapus).
 * Di kotak tulis baris gambar tampil sebagai penanda pendek "[Gambar n]"
 * (teks tersimpan tetap markdown asli) — lihat imageView().
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { TextInput } from '@/components/ui/ThemedTextInput';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Bold,
  BookOpen,
  CalendarDays,
  Heading,
  Highlighter,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Mic,
  Plus,
  Quote,
  X,
} from 'lucide-react-native';

import * as ImagePicker from 'expo-image-picker';
import { AyatInsertModal } from '@/components/catatan/AyatInsertModal';
import { CatatanRender, catatanImgSrc } from '@/components/catatan/CatatanRender';
import { imageAssetToFile } from '@/utils/pickedImage';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { useToast } from '@/components/ui/Toast';
import { CATATAN_KEY, createCatatan, getCatatan, updateCatatan, uploadCatatanImage, type CatatanInput } from '@/api/catatan';
import { useCatatanBridge, type AyatInsert } from '@/stores/catatanBridge.store';
import { useAuthStore } from '@/stores/auth.store';
import {
  applyDisplayEdit,
  continueList,
  dispToRaw,
  imageView,
  imagesOf,
  rawToDisp,
  insertBlock,
  toggleLinePrefix,
  wrapInline,
  type Edit,
  type Sel,
} from '@/utils/catatanMarkdown';
import { formatDateWithDay } from '@/utils/date';
import { goBack } from '@/utils/nav';
import { ApiError } from '@/types/api';
import { nc } from '@/theme/ThemeRoot';

const ymdLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type Draft = { judul: string; isi: string; ayat: string[]; pengkhotbah: string; tanggal: string };

export default function CatatanEditScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const params = useLocalSearchParams<{ id?: string; ref?: string; quote?: string }>();
  const id = typeof params.id === 'string' && params.id ? params.id : null;
  const jemaatId = useAuthStore((s) => s.user?.jemaatId ?? 'anon');
  const draftKey = `catatan:draft:${jemaatId}`;

  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [ayat, setAyat] = useState<string[]>([]);
  const [pengkhotbah, setPengkhotbah] = useState('');
  const [tanggal, setTanggal] = useState(ymdLocal(new Date()));
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [sel, setSel] = useState<Sel>({ start: 0, end: 0 });
  const [forcedSel, setForcedSel] = useState<Sel | undefined>(undefined);
  const [ayatOpen, setAyatOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [ready, setReady] = useState(!id);
  const dirty = useRef(false);
  const saved = useRef(false);
  const bodyRef = useRef<TextInput>(null);
  // Tinggi isi catatan → kotak ikut memanjang (halaman yang menggulir, bukan
  // kotaknya) dan minimal mengisi layar sampai toolbar.
  const [bodyH, setBodyH] = useState(0);
  const selRef = useRef(sel);
  selRef.current = sel;

  // ----- Muat catatan / draf -----
  const existing = useQuery({ queryKey: [...CATATAN_KEY, 'detail', id], queryFn: () => getCatatan(id!), enabled: !!id });
  useEffect(() => {
    if (!id || !existing.data || ready) return;
    const n = existing.data;
    setJudul(n.judul);
    setIsi(n.isi);
    setAyat(n.ayat);
    setPengkhotbah(n.pengkhotbah ?? '');
    setTanggal(n.tanggal);
    setReady(true);
  }, [id, existing.data, ready]);

  useEffect(() => {
    if (id) return;
    const fromRef = typeof params.ref === 'string' && params.ref ? params.ref : null;
    const quote = typeof params.quote === 'string' && params.quote ? params.quote : '';
    AsyncStorage.getItem(draftKey)
      .then((raw) => {
        // Pengguna sudah mulai mengetik sebelum draf selesai dimuat → jangan timpa.
        if (dirty.current && !fromRef) return;
        let d: Partial<Draft> = {};
        try {
          d = raw ? (JSON.parse(raw) as Draft) : {};
        } catch {
          d = {};
        }
        const isiDraf = typeof d.isi === 'string' ? d.isi : '';
        const ayatDraf = Array.isArray(d.ayat) ? d.ayat : [];
        setJudul(d.judul ?? '');
        setPengkhotbah(d.pengkhotbah ?? '');
        if (d.tanggal) setTanggal(d.tanggal);
        if (fromRef) {
          // Dari Alkitab: ayat DITAMBAHKAN ke draf yang ada (draf lama tidak hilang).
          setAyat(ayatDraf.includes(fromRef) ? ayatDraf : [...ayatDraf, fromRef].slice(0, 20));
          setIsi(quote ? `${isiDraf.trimEnd() ? `${isiDraf.trimEnd()}\n\n` : ''}${quote}\n\n` : isiDraf);
          dirty.current = true;
        } else {
          setIsi(isiDraf);
          setAyat(ayatDraf);
        }
      })
      .catch(() => {
        if (!fromRef) return;
        setAyat([fromRef]);
        if (quote) setIsi(`${quote}\n\n`);
        dirty.current = true;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draf otomatis (catatan baru saja) — aman bila app tertutup di tengah khotbah.
  useEffect(() => {
    if (id || !dirty.current || saved.current) return;
    const h = setTimeout(() => {
      AsyncStorage.setItem(draftKey, JSON.stringify({ judul, isi, ayat, pengkhotbah, tanggal } satisfies Draft)).catch(() => {});
    }, 600);
    return () => clearTimeout(h);
  }, [id, draftKey, judul, isi, ayat, pengkhotbah, tanggal]);

  // ----- Jembatan dari halaman Alkitab -----
  const bridgeOpen = useCatatanBridge((s) => s.open);
  const bridgeClose = useCatatanBridge((s) => s.close);
  const bridgeTake = useCatatanBridge((s) => s.take);
  useEffect(() => {
    bridgeOpen();
    return () => bridgeClose();
  }, [bridgeOpen, bridgeClose]);

  const touch = () => {
    dirty.current = true;
  };

  const applyAyat = useCallback((a: AyatInsert) => {
    touch();
    setAyat((prev) => (prev.includes(a.ref) ? prev : [...prev, a.ref].slice(0, 20)));
    if (a.quote) {
      setIsi((prev) => {
        const cur = selRef.current;
        const at = cur.end <= prev.length ? cur : { start: prev.length, end: prev.length };
        const e = insertBlock(prev, at, a.quote);
        setSel(e.sel);
        setForcedSel(e.sel);
        return e.text;
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const items = bridgeTake();
      items.forEach(applyAyat);
      if (items.length) showToast(t('catatan.ayat_added', { count: items.length }), 'success');
    }, [bridgeTake, applyAyat, showToast, t]),
  );

  // ----- Gambar (kamera / galeri) -----
  const [uploading, setUploading] = useState(false);
  const images = imagesOf(isi);
  // Kotak tulis: baris gambar → "[Gambar n]" (nomor sama dengan thumbnail).
  const view = useMemo(() => imageView(isi, (n) => `[${t('catatan.img_token', { n })}]`), [isi, t]);
  async function addImage(source: 'camera' | 'library') {
    if (images.length >= 30) return showToast(t('catatan.img_max'), 'error');
    const perm =
      source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return showToast(t('catatan.img_permission'), 'error');
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, allowsEditing: false };
    const r = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    const a = r.canceled ? null : r.assets[0];
    if (!a) return;
    setUploading(true);
    try {
      const { url } = await uploadCatatanImage(await imageAssetToFile(a, 'catatan.jpg'));
      apply((x, s) => insertBlock(x, s, `![${t('catatan.img_alt')}](${url})`));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : t('catatan.img_failed'), 'error');
    } finally {
      setUploading(false);
    }
  }
  function pickImage() {
    if (uploading) return;
    if (Platform.OS === 'web') return void addImage('library');
    Alert.alert(t('catatan.img_title'), undefined, [
      { text: t('catatan.img_camera'), onPress: () => void addImage('camera') },
      { text: t('catatan.img_library'), onPress: () => void addImage('library') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }
  function removeImage(url: string) {
    touch();
    // Hapus baris gambar beserta satu baris kosong sesudahnya (bila ada).
    setIsi((prev) =>
      prev
        .split('\n')
        .filter((l) => !(l.trim().startsWith('![') && l.includes(`(${url})`)))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n'),
    );
  }

  // ----- Toolbar -----
  function apply(fn: (text: string, s: Sel) => Edit) {
    touch();
    const e = fn(isi, sel);
    setIsi(e.text);
    setSel(e.sel);
    setForcedSel(e.sel);
    if (tab !== 'write') setTab('write');
    requestAnimationFrame(() => bodyRef.current?.focus());
  }

  function onChangeBody(nextDisplay: string) {
    touch();
    // Perubahan di tampilan (penanda gambar) → teks asli + kursor (koordinat asli).
    const { text: next, cursor } = applyDisplayEdit(isi, view, nextDisplay);
    const cont = continueList(isi, next, cursor);
    if (cont) {
      setIsi(cont.text);
      setSel(cont.sel);
      setForcedSel(cont.sel);
    } else {
      setIsi(next);
      // Penanda gambar terhapus utuh / ketikan dipindah → kursor perlu dipaksa.
      const shownNext = imageView(next, (n) => `[${t('catatan.img_token', { n })}]`).display;
      if (shownNext !== nextDisplay) {
        const c = { start: cursor, end: cursor };
        setSel(c);
        setForcedSel(c);
      }
    }
  }
  const forcedDisp = forcedSel ? { start: rawToDisp(view, forcedSel.start), end: rawToDisp(view, forcedSel.end) } : undefined;

  // ----- Simpan -----
  const payload = (): CatatanInput => ({
    judul: judul.trim() || t('catatan.untitled'),
    isi: isi.trimEnd(),
    ayat,
    pengkhotbah: pengkhotbah.trim() || null,
    tanggal,
  });
  const save = useMutation({
    mutationFn: () => (id ? updateCatatan(id, payload()) : createCatatan(payload())),
    onSuccess: (n) => {
      saved.current = true;
      dirty.current = false;
      if (!id) AsyncStorage.removeItem(draftKey).catch(() => {});
      qc.invalidateQueries({ queryKey: CATATAN_KEY });
      showToast(t('catatan.saved'), 'success');
      if (id) goBack(router, `/catatan/${n.id}`);
      else router.replace(`/catatan/${n.id}` as never);
    },
    onError: (e) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error'),
  });
  const canSave = (judul.trim() || isi.trim()).length > 0 && !save.isPending;

  function leave() {
    if (!dirty.current || saved.current) return goBack(router, '/catatan');
    if (!id) {
      // Catatan baru: draf sudah tersimpan otomatis di HP.
      showToast(t('catatan.draft_kept'), 'info');
      return goBack(router, '/catatan');
    }
    Alert.alert(t('catatan.discard_title'), t('catatan.discard_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('catatan.discard_ok'), style: 'destructive', onPress: () => goBack(router, `/catatan/${id}`) },
    ]);
  }

  if (id && !ready) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        {existing.isError ? (
          <Text className="text-sm text-neutral-500">{t('error.generic')}</Text>
        ) : (
          <ActivityIndicator color="#EA580C" />
        )}
      </View>
    );
  }

  const tools: { key: string; icon: React.ReactNode; onPress: () => void; label: string }[] = [
    { key: 'b', icon: <Bold size={18} color={nc('#262626')} />, onPress: () => apply((x, s) => wrapInline(x, s, '**')), label: t('catatan.tool_bold') },
    { key: 'i', icon: <Italic size={18} color={nc('#262626')} />, onPress: () => apply((x, s) => wrapInline(x, s, '_')), label: t('catatan.tool_italic') },
    { key: 'h', icon: <Heading size={18} color={nc('#262626')} />, onPress: () => apply((x, s) => toggleLinePrefix(x, s, 'h')), label: t('catatan.tool_heading') },
    { key: 'li', icon: <List size={18} color={nc('#262626')} />, onPress: () => apply((x, s) => toggleLinePrefix(x, s, 'li')), label: t('catatan.tool_bullet') },
    { key: 'ol', icon: <ListOrdered size={18} color={nc('#262626')} />, onPress: () => apply((x, s) => toggleLinePrefix(x, s, 'ol')), label: t('catatan.tool_numbered') },
    { key: 'q', icon: <Quote size={18} color={nc('#262626')} />, onPress: () => apply((x, s) => toggleLinePrefix(x, s, 'quote')), label: t('catatan.tool_quote') },
    { key: 'm', icon: <Highlighter size={18} color="#D97706" />, onPress: () => apply((x, s) => wrapInline(x, s, '==')), label: t('catatan.tool_highlight') },
  ];

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-2 py-2 flex-row items-center">
          <Pressable onPress={leave} className="w-10 h-10 items-center justify-center" accessibilityLabel={t('common.back')}>
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">{id ? t('catatan.edit_title') : t('catatan.new_title')}</Text>
          <Pressable
            onPress={() => canSave && save.mutate()}
            disabled={!canSave}
            className={`px-4 py-2 rounded-full bg-brand-500 ${canSave ? '' : 'opacity-40'}`}
          >
            {save.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-sm font-bold text-white">{t('common.save')}</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardSafeView className="flex-1">
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 24, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <TextInput
            value={judul}
            onChangeText={(v) => {
              touch();
              setJudul(v);
            }}
            placeholder={t('catatan.judul_placeholder')}
            placeholderTextColor={nc('#A3A3A3')}
            maxLength={200}
            className="text-xl font-bold text-neutral-900 py-1"
          />

          {/* Meta: tanggal · pengkhotbah */}
          <View className="flex-row items-center gap-2 mt-2">
            <Pressable onPress={() => setDateOpen(true)} className="flex-row items-center gap-1.5 bg-card border border-neutral-200 rounded-full px-3 py-1.5">
              <CalendarDays size={13} color={nc('#525252')} />
              <Text className="text-xs font-semibold text-neutral-700">{formatDateWithDay(tanggal, i18n.language)}</Text>
            </Pressable>
            <View className="flex-1 flex-row items-center gap-1.5 bg-card border border-neutral-200 rounded-full px-3 py-1">
              <Mic size={13} color={nc('#525252')} />
              <TextInput
                value={pengkhotbah}
                onChangeText={(v) => {
                  touch();
                  setPengkhotbah(v);
                }}
                placeholder={t('catatan.pengkhotbah_placeholder')}
                placeholderTextColor={nc('#A3A3A3')}
                maxLength={120}
                className="flex-1 text-xs text-neutral-800 py-1"
              />
            </View>
          </View>

          {/* Ayat terkait */}
          <View className="flex-row flex-wrap gap-1.5 mt-3">
            {ayat.map((r) => (
              <View key={r} className="flex-row items-center gap-1 bg-brand-50 border border-brand-200 rounded-full pl-2.5 pr-1.5 py-1">
                <BookOpen size={12} color="#C2410C" />
                <Text className="text-xs font-semibold text-brand-700">{r}</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    touch();
                    setAyat((p) => p.filter((x) => x !== r));
                  }}
                  accessibilityLabel={t('common.delete')}
                >
                  <X size={12} color="#C2410C" />
                </Pressable>
              </View>
            ))}
            <Pressable onPress={() => setAyatOpen(true)} className="flex-row items-center gap-1 border border-dashed border-neutral-300 rounded-full px-2.5 py-1">
              <Plus size={12} color={nc('#525252')} />
              <Text className="text-xs font-semibold text-neutral-600">{t('catatan.add_ayat')}</Text>
            </Pressable>
          </View>

          {/* Tulis / Pratinjau */}
          <View className="flex-row bg-neutral-100 rounded-xl p-1 mt-4 mb-2">
            {(['write', 'preview'] as const).map((k) => (
              <Pressable key={k} onPress={() => setTab(k)} className={`flex-1 py-1.5 rounded-lg items-center ${tab === k ? 'bg-card' : ''}`}>
                <Text className={`text-xs font-semibold ${tab === k ? 'text-neutral-900' : 'text-neutral-500'}`}>
                  {k === 'write' ? t('catatan.tab_write') : t('catatan.tab_preview')}
                </Text>
              </Pressable>
            ))}
          </View>

          {tab === 'write' && (images.length || uploading) ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              // Jangan ikut melar mengisi layar (web: ScrollView flexGrow 1 → kotak tulis terdorong ke bawah).
              style={{ flexGrow: 0, flexShrink: 0 }}
              contentContainerStyle={{ gap: 8, paddingTop: 6, paddingRight: 6, paddingBottom: 8 }}
            >
              {images.map((u, i) => (
                <View key={u} style={{ width: 72, height: 72 }}>
                  <Image source={{ uri: catatanImgSrc(u) }} style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: '#F5F5F5' }} />
                  <View className="absolute left-1 bottom-1 px-1.5 rounded-md bg-neutral-900/70">
                    <Text className="text-[10px] font-bold text-white">{i + 1}</Text>
                  </View>
                  <Pressable
                    onPress={() => removeImage(u)}
                    hitSlop={8}
                    accessibilityLabel={t('common.delete')}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-neutral-900/80 items-center justify-center"
                  >
                    <X size={13} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {uploading ? (
                <View style={{ width: 72, height: 72 }} className="rounded-[10px] bg-neutral-100 items-center justify-center">
                  <ActivityIndicator color="#EA580C" />
                </View>
              ) : null}
            </ScrollView>
          ) : null}
          {tab === 'write' ? (
            <TextInput
              ref={bodyRef}
              value={view.display}
              onChangeText={onChangeBody}
              onSelectionChange={(e) => {
                const d = e.nativeEvent.selection;
                setSel({ start: dispToRaw(view, d.start), end: dispToRaw(view, d.end) });
                if (forcedSel) setForcedSel(undefined);
              }}
              selection={forcedDisp}
              multiline
              textAlignVertical="top"
              placeholder={t('catatan.isi_placeholder')}
              placeholderTextColor={nc('#A3A3A3')}
              maxLength={20000}
              // Native: kotak memanjang mengikuti isi (contentSize = teks saja, + padding).
              // Web: TIDAK dipakai — contentSize di web = scrollHeight textarea yang ikut
              // membesar saat minHeight diubah → loop render (React #185). Di web kotak
              // cukup mengisi layar (flex-1) dan menggulir di dalam.
              onContentSizeChange={
                Platform.OS === 'web'
                  ? undefined
                  : (e) => {
                      const h = Math.ceil(e.nativeEvent.contentSize.height) + 34;
                      setBodyH((prev) => (Math.abs(prev - h) < 2 ? prev : h));
                    }
              }
              className="flex-1 bg-card rounded-2xl border border-neutral-100 p-4 text-base text-neutral-900 leading-relaxed"
              style={{ minHeight: Math.max(280, bodyH) }}
            />
          ) : (
            <View className="flex-1 bg-card rounded-2xl border border-neutral-100 p-4" style={{ minHeight: 280 }}>
              {isi.trim() ? <CatatanRender text={isi} /> : <Text className="text-sm text-neutral-400">{t('catatan.preview_empty')}</Text>}
            </View>
          )}
          <Text className="text-[11px] text-neutral-400 mt-2">{t('catatan.private_hint')}</Text>
        </ScrollView>

        {/* Toolbar format */}
        <SafeAreaView edges={['bottom']} className="bg-card border-t border-neutral-200">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 6, gap: 4 }}>
            {tools.map((x) => (
              <Pressable key={x.key} onPress={x.onPress} accessibilityLabel={x.label} className="w-11 h-10 rounded-lg items-center justify-center active:bg-neutral-100">
                {x.icon}
              </Pressable>
            ))}
            <View className="w-px bg-neutral-200 mx-1 my-2" />
            <Pressable
              onPress={pickImage}
              disabled={uploading}
              accessibilityLabel={t('catatan.img_title')}
              className="flex-row items-center gap-1.5 px-3 h-10 rounded-lg bg-neutral-100"
            >
              {uploading ? <ActivityIndicator size="small" color="#EA580C" /> : <ImagePlus size={16} color={nc('#404040')} />}
              <Text className="text-xs font-bold text-neutral-700">{t('catatan.tool_image')}</Text>
            </Pressable>
            <Pressable onPress={() => setAyatOpen(true)} className="flex-row items-center gap-1.5 px-3 h-10 rounded-lg bg-brand-50">
              <BookOpen size={16} color="#EA580C" />
              <Text className="text-xs font-bold text-brand-700">{t('catatan.tool_ayat')}</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </KeyboardSafeView>

      <AyatInsertModal
        visible={ayatOpen}
        onClose={() => setAyatOpen(false)}
        onInsert={(a) => {
          setAyatOpen(false);
          applyAyat(a);
        }}
        onOpenBible={() => {
          setAyatOpen(false);
          router.push('/bible' as never);
        }}
      />
      {dateOpen ? (
        <DatePickerModal
          value={new Date(`${tanggal}T12:00:00`)}
          onChange={(d) => {
            touch();
            setTanggal(ymdLocal(d));
            setDateOpen(false);
          }}
          onClose={() => setDateOpen(false)}
        />
      ) : null}
    </View>
  );
}
