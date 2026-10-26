/**
 * Kerangka tiket: kepala (gambar / pita) · isi · garis sobek berlekuk · sobekan.
 * Dipakai tiket ibadah & event (daftar maupun tampilan penuh).
 */
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { nc } from '@/theme/ThemeRoot';

export function TicketShell({
  header,
  body,
  stub,
  footer,
  onPress,
  notchColor = nc('#FAFAFA'),
  dim,
}: {
  header: ReactNode;
  body: ReactNode;
  stub: ReactNode;
  footer?: ReactNode;
  onPress?: () => void;
  /** Warna latar halaman (lekukan kiri-kanan garis sobek). */
  notchColor?: string;
  /** Tiket batal → dibuat pudar. */
  dim?: boolean;
}) {
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap
      onPress={onPress}
      className="bg-card rounded-2xl border border-neutral-100 overflow-hidden"
      style={dim ? { opacity: 0.55 } : undefined}
    >
      {header}
      <View className="px-3.5 pt-2.5 pb-3">{body}</View>
      {/* garis sobek + lekukan */}
      <View style={{ height: 18, justifyContent: 'center' }}>
        <View style={{ marginHorizontal: 14, borderTopWidth: 2, borderStyle: 'dashed', borderColor: nc('#E5E5E5') }} />
        <View style={{ position: 'absolute', left: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: notchColor }} />
        <View style={{ position: 'absolute', right: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: notchColor }} />
      </View>
      <View className="px-3.5 pt-1 pb-3">{stub}</View>
      {footer ? <View className="px-3.5 pb-3.5">{footer}</View> : null}
    </Wrap>
  );
}
