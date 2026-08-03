/**
 * My Reservasi — parent view untuk reservasi active (self + anak).
 * Focus: display pickup code besar untuk kids ibadah + status check-in/checkout.
 *
 * Endpoint: `GET /admin/me/reservasi?activeOnly=true` (live 2026-08-03).
 *
 * Per BE response `backend-request-me-reservasi-pickup-code.md`.
 */
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Baby,
  CalendarCheck,
  CheckCircle2,
  Church,
  Clock,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { PickupCodeCard } from '@/components/scanner/PickupCodeCard';
import { useMyReservasi } from '@/hooks/useMyReservasi';
import { formatDate } from '@/utils/date';
import type { MyReservasi } from '@/types/ibadah';

export default function MyReservasiScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();

  const query = useMyReservasi({ activeOnly: true });
  const reservasi = query.data ?? [];

  // Group kids-ibadah reservasi (butuh pickup code prominent) vs regular
  const kidsReservasi = reservasi.filter(
    (r) => r.ibadah.isKidsIbadah && r.pickupCode,
  );
  const regularReservasi = reservasi.filter(
    (r) => !(r.ibadah.isKidsIbadah && r.pickupCode),
  );

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">
              {t('my_reservasi.title')}
            </Text>
            <Text className="text-xs text-neutral-500">
              {t('my_reservasi.subtitle')}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor="#EC4899"
          />
        }
      >
        {query.isPending ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : query.isError ? (
          <View className="items-center py-16 px-8">
            <Text className="text-sm text-red-600 text-center mb-3">
              {t('error.generic')}
            </Text>
            <Pressable onPress={() => query.refetch()}>
              <Text className="text-sm font-bold text-brand-600">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : reservasi.length === 0 ? (
          <View className="items-center py-16 px-8">
            <View className="w-16 h-16 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
              <CalendarCheck size={28} color="#A3A3A3" />
            </View>
            <Text className="text-sm font-bold text-neutral-900 text-center mb-1">
              {t('my_reservasi.empty_title')}
            </Text>
            <Text className="text-xs text-neutral-500 text-center">
              {t('my_reservasi.empty_body')}
            </Text>
          </View>
        ) : (
          <>
            {/* Kids ibadah — pickup code prominent */}
            {kidsReservasi.length > 0 ? (
              <View className="gap-3 mb-6">
                <View className="flex-row items-center gap-2">
                  <Baby size={16} color="#EC4899" />
                  <Text className="text-xs font-bold text-pink-700 uppercase">
                    {t('my_reservasi.kids_section')}
                  </Text>
                </View>
                {kidsReservasi.map((r) => (
                  <KidsReservasiCard key={r.id} reservasi={r} />
                ))}
              </View>
            ) : null}

            {/* Regular ibadah */}
            {regularReservasi.length > 0 ? (
              <View className="gap-2">
                <Text className="text-xs font-bold text-neutral-500 uppercase">
                  {t('my_reservasi.other_section')}
                </Text>
                {regularReservasi.map((r) => (
                  <RegularReservasiRow key={r.id} reservasi={r} lang={lang} />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* ==============================================================
 * KIDS RESERVASI CARD — dgn PickupCodeCard prominent
 * ============================================================== */
function KidsReservasiCard({ reservasi }: { reservasi: MyReservasi }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <View className="bg-white rounded-2xl overflow-hidden border border-neutral-100">
      {/* Header — nama anak + ibadah */}
      <View className="p-4 flex-row items-center gap-3 bg-pink-50">
        <Avatar
          size={44}
          name={reservasi.jemaat.namaLengkap}
          fotoUrl={reservasi.jemaat.fotoUrl}
        />
        <View className="flex-1">
          <Text className="text-sm font-bold text-neutral-900">
            {reservasi.jemaat.namaLengkap}
          </Text>
          <Text className="text-xs text-neutral-600">{reservasi.ibadah.nama}</Text>
          <Text className="text-[10px] text-neutral-500">
            {formatDate(reservasi.tanggalIbadah, lang)} · {reservasi.ibadah.jamMulai}
          </Text>
        </View>
      </View>

      {/* PickupCodeCard */}
      <View className="p-4">
        <PickupCodeCard
          pickupCode={reservasi.pickupCode!}
          anakNama={reservasi.jemaat.namaLengkap}
          ibadahNama={reservasi.ibadah.nama}
          isPickedUp={!!reservasi.pickedUpAt}
          pickedUpAt={reservasi.pickedUpAt}
        />
      </View>
    </View>
  );
}

/* ==============================================================
 * REGULAR RESERVASI ROW (non-kids)
 * ============================================================== */
function RegularReservasiRow({
  reservasi,
  lang,
}: {
  reservasi: MyReservasi;
  lang: string;
}) {
  const { t } = useTranslation();

  const statusColor =
    reservasi.status === 'COMPLETED'
      ? 'text-emerald-700 bg-emerald-100'
      : reservasi.status === 'JOIN'
      ? 'text-blue-700 bg-blue-100'
      : reservasi.status === 'CANCEL'
      ? 'text-red-700 bg-red-100'
      : 'text-neutral-700 bg-neutral-100';

  return (
    <View className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row gap-3">
      <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
        <Church size={18} color="#EA580C" />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
          {reservasi.ibadah.nama}
        </Text>
        <Text className="text-xs text-neutral-500 mt-0.5">
          {reservasi.jemaat.namaLengkap} · {formatDate(reservasi.tanggalIbadah, lang)}
        </Text>
        <View className="flex-row items-center gap-2 mt-2">
          <View className={`px-2 py-0.5 rounded-full ${statusColor}`}>
            <Text className="text-[10px] font-bold">{reservasi.status}</Text>
          </View>
          {reservasi.joinedAt ? (
            <View className="flex-row items-center gap-1">
              <Clock size={10} color="#737373" />
              <Text className="text-[10px] text-neutral-500">
                {t('my_reservasi.checkin_at', {
                  time: reservasi.joinedAt.slice(11, 16),
                })}
              </Text>
            </View>
          ) : null}
          {reservasi.checkedOutAt ? (
            <View className="flex-row items-center gap-1">
              <CheckCircle2 size={10} color="#059669" />
              <Text className="text-[10px] text-emerald-700">
                {t('my_reservasi.checkout_at', {
                  time: reservasi.checkedOutAt.slice(11, 16),
                })}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
