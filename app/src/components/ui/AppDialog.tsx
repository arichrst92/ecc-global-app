/**
 * Popup pemberitahuan Els App — pengganti `Alert.alert` bawaan sistem.
 *
 * Tampilan seragam: ikon Els App + judul + pesan + tombol (utama bergradasi
 * oranye, "hapus/batalkan" merah, "batal" abu). Dipanggil dengan signature
 * yang sama dengan Alert.alert:
 *
 *   appAlert('Judul', 'Pesan', [{ text: 'Batal', style: 'cancel' }, { text: 'Ya', onPress }])
 *
 * Seperti toast, popup ikut tampil di DALAM modal yang sedang terbuka
 * (DialogContainer dirender di root dan di setiap Modal; hanya yang teratas
 * yang menampilkan) — popup sistem dulu muncul di atas modal, popup custom
 * harus melakukan hal yang sama.
 */
import { useEffect } from 'react';
import { BackHandler, Image, Pressable, ScrollView, Text, View, type AlertButton, type AlertOptions } from 'react-native';
import { create } from 'zustand';

import { Button } from '@/components/ui/Button';
import { useModalStack } from '@/components/ui/Toast';

const APP_ICON = require('../../../assets/images/ecc-icon-ios.png');

type DialogItem = {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  cancelable: boolean;
  onDismiss?: () => void;
};

type DialogState = { queue: DialogItem[]; push: (d: DialogItem) => void; shift: (id: number) => void };

const useDialogStore = create<DialogState>((set) => ({
  queue: [],
  push: (d) => set((s) => ({ queue: [...s.queue, d] })),
  shift: (id) => set((s) => ({ queue: s.queue.filter((q) => q.id !== id) })),
}));

let seq = 0;

/** Sama dengan `appAlert(title, message?, buttons?, options?)`. */
export function appAlert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions): void {
  useDialogStore.getState().push({
    id: ++seq,
    title,
    message: message || undefined,
    buttons: buttons && buttons.length ? buttons : [{ text: 'OK' }],
    cancelable: options?.cancelable === true,
    onDismiss: options?.onDismiss,
  });
}

/**
 * Tombol kembali Android saat popup tampil. Di dalam Modal, Android tidak
 * meneruskan tombol kembali ke BackHandler (yang dipanggil onRequestClose Modal),
 * jadi Modal memanggil ini dulu. true = sudah ditangani (Modal jangan ditutup).
 */
export function handleDialogBack(): boolean {
  const cur = useDialogStore.getState().queue[0];
  if (!cur) return false;
  const cancel = cur.buttons.find((b) => b.style === 'cancel');
  if (cancel) {
    useDialogStore.getState().shift(cur.id);
    setTimeout(() => cancel.onPress?.(), 0);
  } else if (cur.cancelable) {
    useDialogStore.getState().shift(cur.id);
    cur.onDismiss?.();
  }
  return true;
}

/** Letakkan di root layout dan di dalam Modal (lihat components/ui/Modal). */
export function DialogContainer({ modalId }: { modalId?: number } = {}) {
  const current = useDialogStore((s) => s.queue[0]);
  const shift = useDialogStore((s) => s.shift);
  const top = useModalStack((s) => s.ids[s.ids.length - 1]);
  const visibleHere = modalId === undefined ? top === undefined : top === modalId;

  const cancelBtn = current?.buttons.find((b) => b.style === 'cancel');

  const press = (b?: AlertButton) => {
    if (!current) return;
    shift(current.id);
    // Tutup popup dulu, baru jalankan aksi (aksi bisa membuka popup berikutnya).
    setTimeout(() => b?.onPress?.(), 0);
  };

  // Tombol kembali Android = tombol "batal" (bila ada) / tutup bila boleh.
  useEffect(() => {
    if (!current || !visibleHere) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (cancelBtn) press(cancelBtn);
      else if (current.cancelable) {
        shift(current.id);
        current.onDismiss?.();
      }
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, visibleHere]);

  if (!current || !visibleHere) return null;

  const btns = current.buttons;
  // Berdampingan hanya bila label pendek: di HP 360dp tiap tombol ±9–10 huruf
  // ("Ya, batalkan" / "Tampilkan QR Saya" terpotong "…") → selebihnya bertumpuk.
  const stacked = btns.length > 2 || btns.some((b) => (b.text ?? '').length > 10);
  // Tombol utama (gradasi): berdampingan → tombol terakhir yang bukan "batal";
  // bertumpuk (daftar pilihan) → pilihan pertama, yang tampil paling atas.
  const primaryIdx = (() => {
    if (stacked) {
      const first = btns.findIndex((b) => b.style !== 'cancel');
      return first < 0 ? 0 : first;
    }
    for (let i = btns.length - 1; i >= 0; i--) if (btns[i]!.style !== 'cancel') return i;
    return btns.length - 1;
  })();
  const variantOf = (b: AlertButton, i: number) =>
    b.style === 'destructive' ? 'danger' : b.style === 'cancel' ? 'secondary' : i === primaryIdx ? 'primary' : 'secondary';
  // Susunan: berdampingan → batal di kiri; bertumpuk → urutan asli, tombol batal paling bawah.
  const ordered = stacked
    ? [...btns.map((b, i) => ({ b, i })).filter((x) => x.b.style !== 'cancel'), ...btns.map((b, i) => ({ b, i })).filter((x) => x.b.style === 'cancel')]
    : btns.map((b, i) => ({ b, i }));

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, elevation: 1000 }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (!current.cancelable) return;
          shift(current.id);
          current.onDismiss?.();
        }}
        className="flex-1 bg-black/50 items-center justify-center px-8"
      >
        <Pressable onPress={() => {}} className="bg-card w-full max-w-sm rounded-3xl px-5 pt-6 pb-5" accessibilityViewIsModal>
          <View className="items-center">
            <Image source={APP_ICON} style={{ width: 52, height: 52, borderRadius: 13 }} />
            <Text className="text-lg font-bold text-neutral-900 text-center mt-3" accessibilityRole="header">
              {current.title}
            </Text>
          </View>
          {current.message ? (
            <ScrollView style={{ maxHeight: 260 }} className="mt-2" bounces={false}>
              <Text className="text-sm text-neutral-600 text-center leading-5">{current.message}</Text>
            </ScrollView>
          ) : null}
          <View className={`mt-5 ${stacked ? 'gap-2' : 'flex-row gap-2'}`}>
            {ordered.map(({ b, i }) => (
              <View key={i} style={stacked ? undefined : { flex: 1 }}>
                <Button label={b.text ?? 'OK'} variant={variantOf(b, i)} onPress={() => press(b)} fullWidth singleLine={!stacked} />
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </View>
  );
}
