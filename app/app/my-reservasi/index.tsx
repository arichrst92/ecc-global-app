/**
 * Reservasi Saya — kehadiran ibadah saya, anak, tanggungan, keluarga yang
 * saya self check-in-kan, dan tamu saya.
 *
 * - Tab Aktif  : ibadah hari ini & mendatang (WIB) + check-in < 24 jam
 * - Tab Riwayat: 100 terbaru
 * - Ibadah anak yang belum dijemput: kode jemput besar di atas, auto-refresh
 *   tiap 20 detik sampai dijemput.
 *
 * Endpoint: `GET /admin/me/reservasi` (update 2026-10-17).
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Baby, CalendarCheck, CheckCircle2, ChevronRight, Church, Clock, LogOut } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { PickupCodeCard } from '@/components/scanner/PickupCodeCard';
import { useMyReservasi } from '@/hooks/useMyReservasi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { formatDateWithDay } from '@/utils/date';
import { wibTime } from '@/utils/serverClock';
import type { MyReservasi } from '@/types/ibadah';

type Tab = 'active' | 'history';

export default function MyReservasiScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('active');

  const query = useMyReservasi({ activeOnly: tab === 'active' });
  const reservasi = query.data ?? [];
  const kidsPending = reservasi.filter((r) => r.ibadah.isKidsIbadah && r.pickupCode && !r.pickedUpAt);
  const others = reservasi.filter((r) => !kidsPending.includes(r));

  // Selama ada anak yang belum dijemput, segarkan otomatis supaya status
  // "sudah dijemput" langsung terlihat.
  useMyReservasiPolling(tab === 'active' && kidsPending.length > 0, query.refetch);
  useRefetchOnFocus(() => query.refetch());

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">{t('my_reservasi.title')}</Text>
            <Text className="text-xs text-neutral-500">{t('my_reservasi.subtitle')}</Text>
          </View>
        </View>
        <View className="flex-row px-4 pb-2 gap-2">
          {(['active', 'history'] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => setTab(k)}
              className={`px-4 py-1.5 rounded-full ${tab === k ? 'bg-brand-500' : 'bg-neutral-100'}`}
            >
              <Text className={`text-xs font-semibold ${tab === k ? 'text-white' : 'text-neutral-700'}`}>
                {t(k === 'active' ? 'my_reservasi.tab_active' : 'my_reservasi.tab_history')}
              </Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor="#F97316" />
        }
      >
        {query.isPending ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : query.isError ? (
          <View className="items-center py-16 px-8">
            <Text className="text-sm text-red-600 text-center mb-3">{t('error.generic')}</Text>
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
              {t(tab === 'active' ? 'my_reservasi.empty_title' : 'my_reservasi.empty_history_title')}
            </Text>
            <Text className="text-xs text-neutral-500 text-center">
              {t(tab === 'active' ? 'my_reservasi.empty_body' : 'my_reservasi.empty_history_body')}
            </Text>
          </View>
        ) : (
          <>
            {kidsPending.length > 0 ? (
              <View className="gap-3 mb-6">
                <View className="flex-row items-center gap-2">
                  <Baby size={16} color="#F97316" />
                  <Text className="text-xs font-bold text-brand-700 uppercase">{t('my_reservasi.kids_section')}</Text>
                </View>
                {kidsPending.map((r) => (
                  <KidsReservasiCard key={r.id} reservasi={r} />
                ))}
              </View>
            ) : null}

            {others.length > 0 ? (
              <View className="gap-2">
                <Text className="text-xs font-bold text-neutral-500 uppercase">{t('my_reservasi.other_section')}</Text>
                {others.map((r) => (
                  <ReservasiRow key={r.id} reservasi={r} onPress={() => router.push(`/ibadah/${r.ibadah.id}` as never)} />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function useMyReservasiPolling(enabled: boolean, refetch: () => unknown) {
  const ref = useRef(refetch);
  ref.current = refetch;
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => ref.current(), 20_000);
    return () => clearInterval(id);
  }, [enabled]);
}

function RelationBadge({ r }: { r: MyReservasi }) {
  const { t } = useTranslation();
  if (!r.relation || r.relation === 'SELF') return null;
  const cls = r.relation === 'TAMU' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700';
  return (
    <View className={`px-1.5 py-0.5 rounded ${cls.split(' ')[0]}`}>
      <Text className={`text-[9px] font-bold ${cls.split(' ')[1]}`}>{t(`my_reservasi.rel_${r.relation}`)}</Text>
    </View>
  );
}

/* ---------------------------------------------------------------- anak */
function KidsReservasiCard({ reservasi }: { reservasi: MyReservasi }) {
  const { i18n } = useTranslation();
  return (
    <View className="bg-white rounded-2xl overflow-hidden border border-neutral-100">
      <View className="p-4 flex-row items-center gap-3 bg-brand-50">
        <Avatar size={44} name={reservasi.jemaat.namaLengkap} fotoUrl={reservasi.jemaat.fotoUrl} />
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm font-bold text-neutral-900 flex-shrink" numberOfLines={1}>
              {reservasi.jemaat.namaLengkap}
            </Text>
            <RelationBadge r={reservasi} />
          </View>
          <Text className="text-xs text-neutral-600">{reservasi.ibadah.nama}</Text>
          <Text className="text-[10px] text-neutral-500">
            {formatDateWithDay(reservasi.tanggalIbadah, i18n.language)} · {reservasi.ibadah.jamMulai}
            {reservasi.joinedAt ? ` · check-in ${wibTime(reservasi.joinedAt)}` : ''}
          </Text>
        </View>
      </View>
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

/* ---------------------------------------------------------------- baris */
function ReservasiRow({ reservasi: r, onPress }: { reservasi: MyReservasi; onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const checkedOut = !!r.checkedOutAt;
  const statusKey = checkedOut ? 'CHECKOUT' : r.status;
  const statusCls =
    statusKey === 'CHECKOUT' || statusKey === 'JOIN'
      ? ['bg-emerald-100', 'text-emerald-700']
      : statusKey === 'CANCEL'
        ? ['bg-red-100', 'text-red-700']
        : ['bg-blue-100', 'text-blue-700'];
  const needCheckout = r.status === 'JOIN' && r.ibadah.requiresCheckout && !checkedOut;
  const method = r.checkinMethod && ['SELF', 'SCAN', 'WALK_IN', 'MANUAL'].includes(r.checkinMethod) ? r.checkinMethod : null;

  return (
    <Pressable onPress={onPress} className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row gap-3 active:opacity-80">
      {r.relation && r.relation !== 'SELF' ? (
        <Avatar size={40} name={r.jemaat.namaLengkap} fotoUrl={r.jemaat.fotoUrl} />
      ) : (
        <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
          {r.ibadah.isKidsIbadah ? <Baby size={18} color="#EA580C" /> : <Church size={18} color="#EA580C" />}
        </View>
      )}
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
          {r.ibadah.nama}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-0.5">
          <Text className="text-xs text-neutral-500 flex-shrink" numberOfLines={1}>
            {r.jemaat.namaLengkap} · {formatDateWithDay(r.tanggalIbadah, i18n.language)} · {r.ibadah.jamMulai}
          </Text>
          <RelationBadge r={r} />
        </View>
        {r.ibadah.cabang?.nama || r.ibadah.lokasi ? (
          <Text className="text-[11px] text-neutral-400 mt-0.5" numberOfLines={1}>
            {[r.ibadah.cabang?.nama, r.ibadah.lokasi].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        <View className="flex-row flex-wrap items-center gap-2 mt-2">
          <View className={`px-2 py-0.5 rounded-full ${statusCls[0]}`}>
            <Text className={`text-[10px] font-bold ${statusCls[1]}`}>{t(`my_reservasi.status_${statusKey}`)}</Text>
          </View>
          {r.joinedAt ? (
            <View className="flex-row items-center gap-1">
              <Clock size={10} color="#737373" />
              <Text className="text-[10px] text-neutral-500">
                {t('my_reservasi.checkin_at', { time: wibTime(r.joinedAt) })}
                {method ? ` · ${t(`my_reservasi.method_${method}`)}` : ''}
              </Text>
            </View>
          ) : null}
          {checkedOut ? (
            <View className="flex-row items-center gap-1">
              <CheckCircle2 size={10} color="#059669" />
              <Text className="text-[10px] text-emerald-700">
                {t('my_reservasi.checkout_at', { time: wibTime(r.checkedOutAt) })}
              </Text>
            </View>
          ) : null}
          {r.ibadah.isKidsIbadah && r.pickedUpAt ? (
            <View className="flex-row items-center gap-1">
              <CheckCircle2 size={10} color="#059669" />
              <Text className="text-[10px] text-emerald-700">{t('kids.pickup_completed_at', { time: wibTime(r.pickedUpAt) })}</Text>
            </View>
          ) : null}
        </View>
        {needCheckout ? (
          <View className="flex-row items-center gap-1 mt-1.5">
            <LogOut size={10} color="#B45309" />
            <Text className="text-[10px] text-amber-700">{t('my_reservasi.checkout_needed')}</Text>
          </View>
        ) : null}
      </View>
      <ChevronRight size={16} color="#A3A3A3" />
    </Pressable>
  );
}
