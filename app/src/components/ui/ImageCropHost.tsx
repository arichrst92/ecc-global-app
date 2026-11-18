/**
 * Crop gambar di dalam app (Android).
 *
 * Layar crop bawaan expo-image-picker di Android (CanHub) memakai toolbar
 * Android; di sebagian HP (Android 15 edge-to-edge, ROM tertentu) tombol
 * Batal / Pilih tertutup status bar atau tidak terlihat → jemaat terjebak.
 * Di Android kita pilih gambar tanpa crop bawaan, lalu crop di sini:
 * geser (1 jari), cubit untuk zoom (2 jari) atau tombol − / +, rasio terkunci.
 * Hasil dipotong dengan expo-image-manipulator (sudah ada di build → bukan
 * modul native baru). iOS & web tetap memakai picker bawaan.
 *
 * Pakai: `launchImageLibraryCropped({ aspect: [1, 1], quality: 0.8 })` —
 * bentuk hasil sama dengan ImagePicker.launchImageLibraryAsync.
 */
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, PanResponder, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';
import * as ImagePicker from 'expo-image-picker';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { Minus, Plus } from 'lucide-react-native';

type Rect = { originX: number; originY: number; width: number; height: number };
type CropRequest = { uri: string; width: number; height: number; aspect: [number, number]; resolve: (r: Rect | null) => void };

const useCropStore = create<{ req: CropRequest | null; open: (r: CropRequest) => void; close: () => void }>((set) => ({
  req: null,
  open: (req) => set({ req }),
  close: () => set({ req: null }),
}));

/** Sisi terpanjang gambar yang dipotong (supaya cepat & hemat memori). */
const WORK_MAX = 2048;
const MAX_ZOOM = 4;

export async function launchImageLibraryCropped(opts: {
  aspect: [number, number];
  quality?: number;
  /** Lebar maksimum hasil (px). Default 1600. */
  maxWidth?: number;
}): Promise<ImagePicker.ImagePickerResult> {
  const quality = opts.quality ?? 0.85;
  if (Platform.OS !== 'android') {
    return ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: opts.aspect, quality });
  }
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
  const a = picked.canceled ? null : picked.assets[0];
  if (!a) return { canceled: true, assets: null };

  try {
    // Normalisasi: orientasi EXIF diterapkan & ukuran dibatasi → yang tampil = yang dipotong.
    const big = Math.max(a.width || 0, a.height || 0) > WORK_MAX;
    const work = await manipulateAsync(
      a.uri,
      big ? [a.width >= a.height ? { resize: { width: WORK_MAX } } : { resize: { height: WORK_MAX } }] : [],
      { compress: 1, format: SaveFormat.JPEG },
    );

    const rect = await new Promise<Rect | null>((resolve) =>
      useCropStore.getState().open({ uri: work.uri, width: work.width, height: work.height, aspect: opts.aspect, resolve }),
    );
    if (!rect) return { canceled: true, assets: null };

    const outW = Math.min(rect.width, opts.maxWidth ?? 1600);
    const out = await manipulateAsync(work.uri, [{ crop: rect }, { resize: { width: outW } }], {
      compress: quality,
      format: SaveFormat.JPEG,
    });
    return {
      canceled: false,
      assets: [
        {
          ...a,
          uri: out.uri,
          width: out.width,
          height: out.height,
          mimeType: 'image/jpeg',
          fileName: `foto-${Date.now()}.jpg`,
          fileSize: undefined,
          exif: undefined,
          base64: undefined,
        },
      ],
    };
  } catch {
    // Gagal memotong (memori / format) → pakai gambar asli; server tetap mengecilkan.
    return picked;
  }
}

const dist = (t: { pageX: number; pageY: number }[]) => Math.hypot(t[0]!.pageX - t[1]!.pageX, t[0]!.pageY - t[1]!.pageY);
const mid = (t: { pageX: number; pageY: number }[]) => ({ x: (t[0]!.pageX + t[1]!.pageX) / 2, y: (t[0]!.pageY + t[1]!.pageY) / 2 });

/** Pasang sekali di root layout. */
export function ImageCropHost() {
  const req = useCropStore((s) => s.req);
  if (!req) return null;
  return <CropScreen key={req.uri} req={req} />;
}

function CropScreen({ req }: { req: CropRequest }) {
  const { t } = useTranslation();
  const close = useCropStore((s) => s.close);
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  // Area kerja di antara bar atas (56) & bar bawah (~150).
  const areaTop = insets.top + 56;
  const areaH = Math.max(160, H - areaTop - (insets.bottom + 150));
  const [aw, ah] = req.aspect;
  let fw = W - 32;
  let fh = (fw * ah) / aw;
  if (fh > areaH - 24) {
    fh = areaH - 24;
    fw = (fh * aw) / ah;
  }
  const cx = W / 2;
  const cy = areaTop + areaH / 2;
  const base = Math.max(fw / req.width, fh / req.height); // "cover" pada zoom 1

  const [view, setView] = useState({ z: 1, tx: 0, ty: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;

  const clamp = (z: number, tx: number, ty: number) => {
    const zz = Math.min(MAX_ZOOM, Math.max(1, z));
    const s = base * zz;
    const mx = Math.max(0, (req.width * s - fw) / 2);
    const my = Math.max(0, (req.height * s - fh) / 2);
    return { z: zz, tx: Math.min(mx, Math.max(-mx, tx)), ty: Math.min(my, Math.max(-my, ty)) };
  };
  const clampRef = useRef(clamp);
  clampRef.current = clamp;

  const g = useRef<{ start: typeof view; d0: number; m0: { x: number; y: number }; n: number }>({
    start: view,
    d0: 0,
    m0: { x: 0, y: 0 },
    n: 0,
  });

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const ts = e.nativeEvent.touches;
          g.current = { start: viewRef.current, n: ts.length, d0: ts.length >= 2 ? dist(ts) : 0, m0: ts.length >= 2 ? mid(ts) : { x: ts[0]?.pageX ?? 0, y: ts[0]?.pageY ?? 0 } };
        },
        onPanResponderMove: (e) => {
          const ts = e.nativeEvent.touches;
          if (!ts.length) return;
          // Jumlah jari berubah → mulai ulang acuan supaya tidak melompat.
          if (ts.length !== g.current.n) {
            g.current = { start: viewRef.current, n: ts.length, d0: ts.length >= 2 ? dist(ts) : 0, m0: ts.length >= 2 ? mid(ts) : { x: ts[0]!.pageX, y: ts[0]!.pageY } };
            return;
          }
          const s = g.current.start;
          if (ts.length >= 2 && g.current.d0 > 0) {
            const m = mid(ts);
            const z = s.z * (dist(ts) / g.current.d0);
            const k = Math.min(MAX_ZOOM, Math.max(1, z)) / s.z;
            setView(clampRef.current(z, s.tx * k + (m.x - g.current.m0.x), s.ty * k + (m.y - g.current.m0.y)));
          } else {
            setView(clampRef.current(s.z, s.tx + ts[0]!.pageX - g.current.m0.x, s.ty + ts[0]!.pageY - g.current.m0.y));
          }
        },
      }),
    [],
  );

  const s = base * view.z;
  const dw = req.width * s;
  const dh = req.height * s;

  const finish = (rect: Rect | null) => {
    req.resolve(rect);
    close();
  };
  const confirm = () => {
    setBusy(true);
    const x = (dw / 2 - fw / 2 - view.tx) / s;
    const y = (dh / 2 - fh / 2 - view.ty) / s;
    const w = Math.min(req.width, Math.round(fw / s));
    const h = Math.min(req.height, Math.round(fh / s));
    finish({
      originX: Math.max(0, Math.min(req.width - w, Math.round(x))),
      originY: Math.max(0, Math.min(req.height - h, Math.round(y))),
      width: Math.max(1, w),
      height: Math.max(1, h),
    });
  };
  const zoomBy = (f: number) => setView((v) => clamp(v.z * f, v.tx * (Math.min(MAX_ZOOM, Math.max(1, v.z * f)) / v.z), v.ty * (Math.min(MAX_ZOOM, Math.max(1, v.z * f)) / v.z)));

  const frameL = cx - fw / 2;
  const frameT = cy - fh / 2;
  const dim = 'rgba(0,0,0,0.6)';

  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => !busy && finish(null)}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Area geser / cubit */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: areaTop, height: areaH, overflow: 'hidden' }} {...responder.panHandlers}>
          <Image
            source={{ uri: req.uri }}
            style={{ position: 'absolute', width: dw, height: dh, left: cx - dw / 2 + view.tx, top: cy - areaTop - dh / 2 + view.ty }}
            resizeMode="stretch"
          />
          {/* Gelap di luar bingkai */}
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: frameT - areaTop, backgroundColor: dim }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: frameT - areaTop + fh, bottom: 0, backgroundColor: dim }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, width: frameL, top: frameT - areaTop, height: fh, backgroundColor: dim }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: frameL + fw, right: 0, top: frameT - areaTop, height: fh, backgroundColor: dim }} />
          {/* Bingkai + garis sepertiga */}
          <View pointerEvents="none" style={{ position: 'absolute', left: frameL, top: frameT - areaTop, width: fw, height: fh, borderWidth: 2, borderColor: '#fff' }}>
            {[1, 2].map((i) => (
              <View key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: (fw * i) / 3, width: 1, backgroundColor: 'rgba(255,255,255,0.35)' }} />
            ))}
            {[1, 2].map((i) => (
              <View key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: (fh * i) / 3, height: 1, backgroundColor: 'rgba(255,255,255,0.35)' }} />
            ))}
          </View>
        </View>

        {/* Bar atas */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, paddingTop: insets.top, height: areaTop, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{t('crop.title')}</Text>
        </View>

        {/* Bar bawah: petunjuk, zoom, Batal / Gunakan */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 12, paddingHorizontal: 16, paddingTop: 10, backgroundColor: '#000' }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center' }}>{t('crop.hint')}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginTop: 10 }}>
            <Pressable onPress={() => zoomBy(1 / 1.25)} hitSlop={10} accessibilityLabel={t('crop.zoom_out')} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Minus size={18} color="#fff" />
            </Pressable>
            <Pressable onPress={() => zoomBy(1.25)} hitSlop={10} accessibilityLabel={t('crop.zoom_in')} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={18} color="#fff" />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
            <Pressable
              onPress={() => finish(null)}
              disabled={busy}
              style={{ flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{t('crop.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={confirm}
              disabled={busy}
              style={{ flex: 1, height: 48, borderRadius: 12, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center' }}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{t('crop.use')}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
