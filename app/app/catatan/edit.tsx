/**
 * Editor Catatan saya (2.4.5) — catatan khotbah pribadi.
 *   /catatan/edit            → catatan baru (draf otomatis tersimpan di HP)
 *   /catatan/edit?id=        → ubah catatan
 *   /catatan/edit?ref=&quote= → catatan baru berisi ayat (dari halaman Alkitab)
 *
 * Format: markdown ringan via toolbar (tebal, miring, judul, poin, nomor,
 * kutipan, stabilo, ayat, gambar). Tanpa modul native.
 *
 * 2.4.9 — "ketuk untuk mengedit": catatan selalu tampil rapi (tanpa tab
 * Tulis/Pratinjau). Ketuk satu paragraf → hanya paragraf itu yang menjadi kotak
 * ketik; selesai (tutup keyboard / ketuk paragraf lain) → tampil rapi lagi.
 * Gambar (kamera / galeri) tampil langsung sebagai gambar; ketuk × untuk hapus.
 * Teks tersimpan tetap markdown yang sama (kompatibel dengan 2.4.8).
 */
import { appAlert } from '@/components/ui/AppDialog';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { CatatanRender } from '@/components/catatan/CatatanRender';
import { imageAssetToFile } from '@/utils/pickedImage';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { useToast } from '@/components/ui/Toast';
import { CATATAN_KEY, createCatatan, getCatatan, updateCatatan, uploadCatatanImage, type CatatanInput } from '@/api/catatan';
import { useCatatanBridge, type AyatInsert } from '@/stores/catatanBridge.store';
import { useAuthStore } from '@/stores/auth.store';
import {
  blockRanges,
  continueList,
  imagesOf,
  insertBlock,
  removeRange,
  toggleLinePrefix,
  wrapInline,
  type BlockRange,
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
  // Paragraf yang sedang diketik: posisi & panjang di teks asli (null = semua tampil rapi).
  const [active, setActive] = useState<{ start: number; len: number } | null>(null);
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
  const isiRef = useRef(isi);
  isiRef.current = isi;
  const activeRef = useRef(active);
  activeRef.current = active;
  // Ketukan toolbar / paragraf lain sesaat sebelum blur → jangan tutup mode ketik.
  const keepRef = useRef(0);
  const keep = () => {
    keepRef.current = Date.now();
  };

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
        // Sedang mengetik → di posisi kursor; tidak → di akhir catatan.
        const cur = activeRef.current ? selRef.current : { start: prev.length, end: prev.length };
        const at = cur.end <= prev.length ? cur : { start: prev.length, end: prev.length };
        const e = insertBlock(prev, at, a.quote);
        setSel(e.sel);
        return e.text;
      });
      setActive(null);
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
      const md = `![${t('catatan.img_alt')}](${url})`;
      touch();
      // Sisip di posisi kursor (bila sedang mengetik) atau di akhir catatan.
      setIsi((prev) => {
        const cur = activeRef.current ? selRef.current : { start: prev.length, end: prev.length };
        const at = cur.end <= prev.length ? cur : { start: prev.length, end: prev.length };
        const e = insertBlock(prev, at, md);
        setSel(e.sel);
        return e.text;
      });
      setActive(null);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : t('catatan.img_failed'), 'error');
    } finally {
      setUploading(false);
    }
  }
  function pickImage() {
    if (uploading) return;
    if (Platform.OS === 'web') return void addImage('library');
    appAlert(t('catatan.img_title'), undefined, [
      { text: t('catatan.img_camera'), onPress: () => void addImage('camera') },
      { text: t('catatan.img_library'), onPress: () => void addImage('library') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }
  function removeBlock(start: number, end: number) {
    touch();
    setActive(null);
    setIsi((prev) => removeRange(prev, start, end));
  }

  // ----- Mode ketik per paragraf -----
  function startEdit(start: number, end: number, cursor = end) {
    keep();
    setActive({ start, len: end - start });
    const c = { start: cursor, end: cursor };
    setSel(c);
    setForcedSel(c);
  }
  /** Mulai mengetik di akhir: paragraf teks terakhir, atau paragraf baru. */
  function startEditAtEnd() {
    startEditAtEndOf(isi);
  }
  function startEditAtEndOf(text: string) {
    const blocks = blockRanges(text);
    const last = blocks[blocks.length - 1];
    if (last && !last.img && !text.slice(last.end).trim()) return startEdit(last.start, last.end);
    const base = text.replace(/\s+$/, '');
    const next = base ? `${base}\n\n` : '';
    if (next !== text) setIsi(next);
    startEdit(next.length, next.length);
  }
  function endEdit() {
    const a = activeRef.current;
    if (!a) return;
    const cur = isiRef.current;
    // Paragraf yang dikosongkan → buang beserta baris kosongnya.
    if (!cur.slice(a.start, a.start + a.len).trim()) {
      const next = removeRange(cur, a.start, a.start + a.len);
      if (next !== cur) setIsi(next);
    }
    setActive(null);
  }

  // ----- Toolbar -----
  function apply(fn: (text: string, s: Sel) => Edit) {
    if (!active) return startEditAtEnd();
    touch();
    keep();
    const e = fn(isi, sel);
    setIsi(e.text);
    setActive({ start: active.start, len: Math.max(0, active.len + e.text.length - isi.length) });
    setSel(e.sel);
    setForcedSel(e.sel);
    requestAnimationFrame(() => bodyRef.current?.focus());
  }

  function onChangeBody(nextLocal: string) {
    if (!active) return;
    touch();
    const before = isi.slice(0, active.start);
    const after = isi.slice(active.start + active.len);
    const next = before + nextLocal + after;
    // Kursor setelah perubahan ≈ posisi akhir seleksi lama + selisih panjang.
    const cursor = sel.start + (next.length - isi.length) + (sel.end - sel.start);
    const cont = continueList(isi, next, cursor);
    if (cont) {
      setIsi(cont.text);
      setActive({ start: active.start, len: cont.text.length - before.length - after.length });
      setSel(cont.sel);
      setForcedSel(cont.sel);
    } else {
      setIsi(next);
      setActive({ start: active.start, len: nextLocal.length });
    }
  }

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
    appAlert(t('catatan.discard_title'), t('catatan.discard_body'), [
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

  const activeText = active ? isi.slice(active.start, active.start + active.len) : '';
  const forcedLocal =
    forcedSel && active
      ? { start: Math.max(0, forcedSel.start - active.start), end: Math.max(0, forcedSel.end - active.start) }
      : undefined;
  const webH = 26 * (activeText.split('\n').length + Math.floor(activeText.length / 42)) + 16;

  /** Pindah mengetik ke paragraf lain (null = di akhir). Paragraf aktif yang kosong dibuang. */
  function switchTo(b: BlockRange | null) {
    keep();
    let text = isi;
    let start = b?.start ?? 0;
    let end = b?.end ?? 0;
    if (active && !activeText.trim()) {
      text = removeRange(isi, active.start, active.start + active.len);
      if (b && b.start > active.start) {
        start += text.length - isi.length;
        end += text.length - isi.length;
      }
      if (text !== isi) setIsi(text);
    }
    if (!b) {
      isiRef.current = text;
      return startEditAtEndOf(text);
    }
    startEdit(start, end);
  }

  const renderBlocks = (bs: BlockRange[]) =>
    bs.map((b) =>
      b.img ? (
        <View key={`b${b.start}`} className="my-1">
          <CatatanRender text={isi.slice(b.start, b.end)} />
          <Pressable
            onPressIn={keep}
            onPress={() => removeBlock(b.start, b.end)}
            hitSlop={8}
            accessibilityLabel={t('common.delete')}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-neutral-900/70 items-center justify-center"
          >
            <X size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          key={`b${b.start}`}
          onPressIn={keep}
          onPress={() => switchTo(b)}
          accessibilityHint={t('catatan.tap_to_edit')}
          className="rounded-lg py-0.5 active:bg-neutral-100"
        >
          <CatatanRender text={isi.slice(b.start, b.end)} />
        </Pressable>
      ),
    );

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

          {/* Isi catatan — selalu tampil rapi; ketuk paragraf untuk mengedit */}
          <View className="bg-card rounded-2xl border border-neutral-100 px-4 py-3 mt-4" style={{ minHeight: 280 }}>
            {renderBlocks(blockRanges(active ? isi.slice(0, active.start) : isi))}
            {active ? (
              <>
                <TextInput
                  key={`edit-${active.start}`}
                  ref={bodyRef}
                  autoFocus
                  value={activeText}
                  onChangeText={onChangeBody}
                  onSelectionChange={(e) => {
                    const d = e.nativeEvent.selection;
                    setSel({ start: active.start + d.start, end: active.start + d.end });
                    if (forcedSel) setForcedSel(undefined);
                  }}
                  selection={forcedLocal}
                  onBlur={() => {
                    // Tutup keyboard / ketuk di luar → tampil rapi lagi (kecuali ketukan toolbar).
                    setTimeout(() => {
                      if (Date.now() - keepRef.current < 450) return;
                      endEdit();
                    }, 250);
                  }}
                  multiline
                  textAlignVertical="top"
                  placeholder={t('catatan.isi_placeholder')}
                  placeholderTextColor={nc('#A3A3A3')}
                  maxLength={Math.max(activeText.length, 20000 - (isi.length - activeText.length))}
                  // Native: kotak memanjang mengikuti isi. Web: contentSize = scrollHeight textarea
                  // (loop render bila dipakai) → tinggi diperkirakan dari jumlah baris.
                  onContentSizeChange={
                    Platform.OS === 'web'
                      ? undefined
                      : (e) => {
                          const h = Math.ceil(e.nativeEvent.contentSize.height) + 12;
                          setBodyH((prev) => (Math.abs(prev - h) < 2 ? prev : h));
                        }
                  }
                  className="text-base text-neutral-900 leading-relaxed bg-brand-50/60 rounded-lg px-2 py-1.5 -mx-2 my-1"
                  style={{ minHeight: Platform.OS === 'web' ? webH : Math.max(48, bodyH) }}
                />
                {renderBlocks(blockRanges(isi.slice(active.start + active.len), active.start + active.len))}
              </>
            ) : null}
            {uploading ? (
              <View className="h-24 rounded-xl bg-neutral-100 items-center justify-center my-2">
                <ActivityIndicator color="#EA580C" />
              </View>
            ) : null}
            {!active ? (
              <Pressable onPressIn={keep} onPress={() => switchTo(null)} className="flex-1 py-2" style={{ minHeight: isi.trim() ? 64 : 240 }}>
                <Text className="text-base text-neutral-400">{isi.trim() ? t('catatan.tap_to_write') : t('catatan.isi_placeholder')}</Text>
              </Pressable>
            ) : null}
          </View>
          {isi.trim() && !active ? <Text className="text-[11px] text-neutral-400 mt-2">{t('catatan.tap_to_edit')}</Text> : null}
          <Text className="text-[11px] text-neutral-400 mt-2">{t('catatan.private_hint')}</Text>
        </ScrollView>

        {/* Toolbar format */}
        <SafeAreaView edges={['bottom']} className="bg-card border-t border-neutral-200">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 6, gap: 4 }}>
            {tools.map((x) => (
              <Pressable
                key={x.key}
                onPressIn={keep}
                onPress={x.onPress}
                accessibilityLabel={x.label}
                className={`w-11 h-10 rounded-lg items-center justify-center active:bg-neutral-100 ${active ? '' : 'opacity-40'}`}
              >
                {x.icon}
              </Pressable>
            ))}
            <View className="w-px bg-neutral-200 mx-1 my-2" />
            <Pressable
              onPressIn={keep}
              onPress={pickImage}
              disabled={uploading}
              accessibilityLabel={t('catatan.img_title')}
              className="flex-row items-center gap-1.5 px-3 h-10 rounded-lg bg-neutral-100"
            >
              {uploading ? <ActivityIndicator size="small" color="#EA580C" /> : <ImagePlus size={16} color={nc('#404040')} />}
              <Text className="text-xs font-bold text-neutral-700">{t('catatan.tool_image')}</Text>
            </Pressable>
            <Pressable onPressIn={keep} onPress={() => setAyatOpen(true)} className="flex-row items-center gap-1.5 px-3 h-10 rounded-lg bg-brand-50">
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
