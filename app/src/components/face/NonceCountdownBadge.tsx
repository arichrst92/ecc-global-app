import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Clock, RotateCw } from 'lucide-react-native';

/**
 * Floating badge top-center yang show countdown sampai nonce expire.
 *
 * Behavior:
 * - Hitung tiap 1s dari nonceExpiresAt (ISO string)
 * - > 60s: gray badge "Berlaku 2:30"
 * - <= 30s: amber badge dengan warning color
 * - <= 0: invoke onExpired() (auto-refresh nonce) + show "Memperbarui..."
 * - onExpired auto-called sekali — caller harus reset nonceExpiresAt
 *   ke nilai baru supaya countdown restart
 *
 * Hidden kalau nonceExpiresAt null (V1 grace: nonce request failed, mode tanpa nonce).
 */

type Props = {
  /** ISO datetime expiry. Kalau null → badge hidden (V1 grace mode tanpa nonce). */
  nonceExpiresAt: string | null;
  /** Dipanggil sekali saat countdown hit 0. Caller harus refresh nonce + update expiresAt. */
  onExpired: () => void;
  /** True kalau sedang refresh — show "Memperbarui..." instead of countdown. */
  refreshing?: boolean;
};

export function NonceCountdownBadge({ nonceExpiresAt, onExpired, refreshing }: Props) {
  const { t } = useTranslation();
  const [remainingMs, setRemainingMs] = useState<number>(() =>
    nonceExpiresAt ? Math.max(0, new Date(nonceExpiresAt).getTime() - Date.now()) : 0,
  );
  // Track apakah onExpired sudah dipanggil untuk expiresAt ini — supaya tidak
  // di-fire berkali-kali dalam interval yang sama.
  const expiredFiredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!nonceExpiresAt) {
      setRemainingMs(0);
      return;
    }
    // Reset fired flag kalau expiresAt berubah (nonce baru di-issue).
    if (expiredFiredFor.current !== nonceExpiresAt) {
      expiredFiredFor.current = null;
    }
    const tick = () => {
      const ms = new Date(nonceExpiresAt).getTime() - Date.now();
      setRemainingMs(Math.max(0, ms));
      if (ms <= 0 && expiredFiredFor.current !== nonceExpiresAt) {
        expiredFiredFor.current = nonceExpiresAt;
        onExpired();
      }
    };
    tick(); // immediate
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nonceExpiresAt, onExpired]);

  if (!nonceExpiresAt) return null;

  const totalSec = Math.ceil(remainingMs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const isWarn = totalSec <= 30 && totalSec > 0;
  const isExpired = totalSec <= 0;

  return (
    <View
      pointerEvents="none"
      className="absolute top-0 left-0 right-0 pt-12 items-center"
    >
      <View
        className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${
          refreshing
            ? 'bg-neutral-700/80'
            : isExpired
              ? 'bg-red-600/90'
              : isWarn
                ? 'bg-amber-500/90'
                : 'bg-black/60'
        }`}
      >
        {refreshing ? (
          <>
            <RotateCw size={12} color="#fff" />
            <Text className="text-white text-xs font-semibold">
              {t('face.nonce_refreshing')}
            </Text>
          </>
        ) : (
          <>
            <Clock size={12} color="#fff" />
            <Text className="text-white text-xs font-semibold">
              {isExpired
                ? t('face.nonce_expired')
                : t('face.nonce_remaining', {
                    time: `${mins}:${secs.toString().padStart(2, '0')}`,
                  })}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
