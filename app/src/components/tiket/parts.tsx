/** Potongan UI bersama tiket: QR, label status, cap HADIR, info baris. */
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { nc } from '@/theme/ThemeRoot';

export function TicketQR({ value, size }: { value: string | null | undefined; size: number }) {
  if (!value) {
    return <View style={{ width: size, height: size, borderRadius: 6 }} className="bg-neutral-100" />;
  }
  // Kotak putih (quiet zone) — QR tetap mudah dipindai di mode gelap.
  const pad = Math.max(3, Math.round(size * 0.06));
  return (
    <View style={{ backgroundColor: '#FFFFFF', padding: pad, borderRadius: 8 }}>
      <QRCode value={value} size={size - pad * 2} backgroundColor="#FFFFFF" color="#171717" />
    </View>
  );
}

const PILL: Record<string, [string, string]> = {
  green: ['bg-emerald-100', 'text-emerald-700'],
  solidGreen: ['bg-emerald-600', 'text-white'],
  blue: ['bg-blue-100', 'text-blue-700'],
  amber: ['bg-amber-100', 'text-amber-800'],
  red: ['bg-red-100', 'text-red-700'],
  neutral: ['bg-neutral-100', 'text-neutral-600'],
};

export function StatusPill({ label, tone }: { label: string; tone: keyof typeof PILL }) {
  const [bg, fg] = PILL[tone] ?? PILL.neutral!;
  return (
    <View className={`px-2 py-0.5 rounded-full ${bg}`}>
      <Text className={`text-[10px] font-bold ${fg}`}>{label}</Text>
    </View>
  );
}

export function RelasiBadge({ label, tamu }: { label: string; tamu?: boolean }) {
  return (
    <View className={`px-1.5 py-0.5 rounded ${tamu ? 'bg-violet-100' : 'bg-sky-100'}`}>
      <Text className={`text-[9px] font-bold ${tamu ? 'text-violet-700' : 'text-sky-700'}`}>{label}</Text>
    </View>
  );
}

/** Cap miring "HADIR 07:52" di pojok sobekan. */
export function HadirStamp({ text }: { text: string }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: 4,
        top: -14,
        transform: [{ rotate: '-10deg' }],
        borderWidth: 2,
        borderColor: '#059669',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 1,
        backgroundColor: 'rgba(255,255,255,0.92)',
      }}
    >
      <Text style={{ color: '#059669', fontSize: 11, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function InfoLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <View className="flex-row items-center gap-1.5 mt-0.5">
      {icon}
      <Text className="text-[11px] text-neutral-500 flex-shrink" numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

export function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '50%' }} className="pr-2 mb-2">
      <Text className="text-[9px] text-neutral-400 tracking-wider">{label}</Text>
      <Text className="text-xs font-semibold text-neutral-900" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export function InlineError({ text }: { text: string | null }) {
  if (!text) return null;
  return <Text className="text-[11px] text-red-600 mt-2 leading-snug">{text}</Text>;
}

export function Hint({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'amber' }) {
  return (
    <Text className={`text-[11px] mt-1 ${tone === 'amber' ? 'text-amber-700' : 'text-neutral-500'}`}>{text}</Text>
  );
}
