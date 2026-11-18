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
import { Modal as RNModal, type ModalProps } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

export function Modal({ children, ...rest }: ModalProps) {
  return (
    <RNModal {...rest}>
      <SafeAreaProvider initialMetrics={rest.presentationStyle === 'pageSheet' || rest.presentationStyle === 'formSheet' ? undefined : initialWindowMetrics}>
        {children}
      </SafeAreaProvider>
    </RNModal>
  );
}
