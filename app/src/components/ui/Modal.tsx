/**
 * Pengganti `Modal` dari react-native — memberi SafeAreaProvider sendiri.
 *
 * Di iOS, Modal dirender di jendela native terpisah sehingga `SafeAreaView`
 * di dalamnya tidak mendapat inset dari provider root: header / tombol tutup
 * tertutup status bar (jam, baterai) dan tombol bawah menempel ke home
 * indicator. Dengan provider di dalam Modal, inset diukur ulang di tempatnya
 * (fullScreen = sama dengan layar, pageSheet = tanpa notch).
 *
 * Pakai: `import { Modal } from '@/components/ui/Modal'` — props sama persis.
 */
import { useEffect, useRef } from 'react';
import { Modal as RNModal, type ModalProps } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { ToastContainer, useModalStack } from '@/components/ui/Toast';
import { DialogContainer, handleDialogBack } from '@/components/ui/AppDialog';

let seq = 0;

/**
 * Toast juga tampil DI DALAM modal (mis. pesan error saat scan di layar
 * scanner) — tanpa ini toast root tertutup modal dan pengguna tidak melihat
 * apa-apa.
 */
export function Modal({ children, ...rest }: ModalProps) {
  const id = useRef(++seq).current;
  const { push, pop } = useModalStack.getState();
  useEffect(() => {
    if (rest.visible === false) {
      pop(id);
      return;
    }
    push(id);
    return () => pop(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rest.visible]);
  return (
    <RNModal
      {...rest}
      // Popup Els App terbuka di dalam modal → tombol kembali menutup popup, bukan modal.
      onRequestClose={(e) => {
        if (handleDialogBack()) return;
        rest.onRequestClose?.(e);
      }}
    >
      <SafeAreaProvider initialMetrics={rest.presentationStyle === 'pageSheet' || rest.presentationStyle === 'formSheet' ? undefined : initialWindowMetrics}>
        {children}
        <ToastContainer modalId={id} />
        <DialogContainer modalId={id} />
      </SafeAreaProvider>
    </RNModal>
  );
}
