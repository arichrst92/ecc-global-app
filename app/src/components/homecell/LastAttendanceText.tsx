/**
 * "Terakhir hadir: 6 Okt 2026 · 7 hari lalu" di bawah nama anggota homecell,
 * atau (variant="homecell") "Terakhir homecell: …" di bawah nama homecell.
 * Warna: ≤7 hari hijau, ≤30 hari kuning, >30 hari merah.
 */
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export function LastAttendanceText({
  date,
  daysAgo,
  variant = 'member',
}: {
  date?: string | null;
  daysAgo?: number | null;
  /** member = kehadiran anggota; homecell = pertemuan terakhir homecell. */
  variant?: 'member' | 'homecell';
}) {
  const { t, i18n } = useTranslation();
  const isHc = variant === 'homecell';
  if (!date || daysAgo == null) {
    return (
      <Text className="text-[11px] text-neutral-400 mt-0.5">
        {isHc ? t('hcj.last_meeting_never') : t('hcj.last_never')}
      </Text>
    );
  }
  const [y, m, d] = date.split('-').map(Number);
  const tgl = new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const rel =
    daysAgo === 0 ? t('hcj.last_today') : daysAgo === 1 ? t('hcj.last_yesterday') : t('hcj.last_days_ago', { count: daysAgo });
  const color = daysAgo <= 7 ? 'text-green-700' : daysAgo <= 30 ? 'text-amber-700' : 'text-red-600';
  return (
    <Text className="text-[11px] text-neutral-500 mt-0.5" numberOfLines={1}>
      {isHc ? t('hcj.last_meeting', { date: tgl }) : t('hcj.last_attended', { date: tgl })} · <Text className={`font-semibold ${color}`}>{rel}</Text>
    </Text>
  );
}
