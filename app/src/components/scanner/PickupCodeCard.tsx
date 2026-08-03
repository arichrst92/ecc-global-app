/**
 * Reusable card untuk display kode jemput 6-digit di reservasi detail parent view.
 *
 * Untuk M41 (Sprint 4 Phase 4B), belum ada dedicated "reservasi detail" screen
 * parent-side — endpoint GET /admin/me/reservasi/:kode (atau /latest) belum
 * ada di BE. Component ini siap dipakai kalau BE eventually expose:
 *   GET /admin/me/reservasi?ibadahId=X (list active reservasi user)
 *
 * Sementara, admin scanner (Modul 27) tampil toast dgn pickupCode setelah
 * check-in sukses — parent bisa juga tanya admin langsung.
 *
 * Per BE notice Modul 27 2026-08-01 (backend-notice-kids-ibadah-pickup.md).
 */
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Baby, Info } from 'lucide-react-native';

export function PickupCodeCard({
  pickupCode,
  anakNama,
  ibadahNama,
  isPickedUp,
  pickedUpAt,
}: {
  pickupCode: string;
  anakNama?: string;
  ibadahNama?: string;
  /** Kalau sudah pickup (checkedOut), show status hijau + timestamp instead of prominent code. */
  isPickedUp?: boolean;
  pickedUpAt?: string | null;
}) {
  const { t } = useTranslation();

  if (isPickedUp) {
    return (
      <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
        <View className="flex-row items-center gap-2">
          <Text className="text-2xl">✅</Text>
          <View className="flex-1">
            <Text className="text-sm font-bold text-emerald-900">
              {t('kids.pickup_completed_title')}
            </Text>
            {pickedUpAt ? (
              <Text className="text-xs text-emerald-700 mt-0.5">
                {t('kids.pickup_completed_at', { time: pickedUpAt.slice(11, 16) })}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-brand-50 border-2 border-brand-200 rounded-2xl p-5">
      <View className="flex-row items-center gap-2 mb-3">
        <Baby size={18} color="#F97316" />
        <Text className="text-xs font-bold text-brand-700 uppercase">
          {t('kids.pickup_code_title')}
        </Text>
      </View>

      {anakNama ? (
        <Text className="text-sm font-semibold text-neutral-900 mb-1">{anakNama}</Text>
      ) : null}
      {ibadahNama ? (
        <Text className="text-xs text-neutral-500 mb-4">{ibadahNama}</Text>
      ) : null}

      {/* Big 6-digit display */}
      <View className="bg-white rounded-xl py-6 items-center border border-brand-200">
        <Text
          className="text-5xl font-bold tracking-widest text-brand-600"
          style={{ letterSpacing: 8 }}
        >
          {pickupCode}
        </Text>
      </View>

      <View className="flex-row items-start gap-2 mt-3">
        <Info size={14} color="#C2410C" style={{ marginTop: 1 }} />
        <Text className="text-xs text-brand-800 flex-1 leading-relaxed">
          {t('kids.pickup_code_instruction')}
        </Text>
      </View>
    </View>
  );
}
