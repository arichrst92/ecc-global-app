/**
 * Shared business row component — dipakai di /market dan /profile/businesses.
 * Logo-focused single-row layout: logo kiri (64x64), center info (nama+tipe,
 * industri, lokasi, owner+online status), chevron kanan.
 *
 * Variant "owner" tampil active/inactive badge + dim styling kalau nonaktif,
 * untuk halaman My Businesses. Variant "public" untuk Local Market browse.
 */
import { Image, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  MapPin,
  Store,
  Wifi,
  WifiOff,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { env } from '@/config/env';
import type { LocalBusiness } from '@/types/localBusiness';

type Props = {
  business: LocalBusiness;
  onPress: () => void;
  /** "owner" tampil status aktif/nonaktif badge; "public" tampil owner attribution */
  variant?: 'owner' | 'public';
};

export function BusinessRow({ business, onPress, variant = 'public' }: Props) {
  const { t } = useTranslation();
  const tipeColor =
    business.tipeBisnis === 'B2C'
      ? 'bg-emerald-100 text-emerald-700'
      : business.tipeBisnis === 'B2B'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-violet-100 text-violet-700';
  const [tipeBg, tipeText] = tipeColor.split(' ');
  const isOwner = variant === 'owner';
  const isInactive = isOwner && !business.isActive;

  return (
    <Pressable
      onPress={onPress}
      className={`bg-white rounded-2xl border border-neutral-100 p-3 flex-row gap-3 ${
        isInactive ? 'opacity-60' : ''
      }`}
    >
      {/* Logo block — 64x64 square. Fallback ke Store icon kalau no logo */}
      <View className="w-16 h-16 rounded-2xl bg-brand-50 items-center justify-center overflow-hidden">
        {business.logoUrl ? (
          <Image
            source={{
              uri: business.logoUrl.startsWith('http')
                ? business.logoUrl
                : `${env.apiBaseUrl}${business.logoUrl}`,
            }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Store size={28} color="#EA580C" />
        )}
      </View>

      {/* Right column */}
      <View className="flex-1 min-w-0 justify-between py-0.5">
        {/* Top: nama + tipe pill */}
        <View>
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-bold text-neutral-900 flex-1" numberOfLines={1}>
              {business.nama}
            </Text>
            <View className={`px-1.5 py-0.5 rounded ${tipeBg}`}>
              <Text className={`text-[9px] font-bold ${tipeText}`}>
                {business.tipeBisnis}
              </Text>
            </View>
          </View>
          {business.industri ? (
            <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
              {business.industri}
            </Text>
          ) : null}
        </View>

        {/* Middle: lokasi (kalau ada) */}
        {business.lokasi ? (
          <View className="flex-row items-center gap-1 mt-1">
            <MapPin size={11} color="#A3A3A3" />
            <Text className="text-[11px] text-neutral-500 flex-1" numberOfLines={1}>
              {business.lokasi}
            </Text>
          </View>
        ) : null}

        {/* Bottom row — owner variant: status badge; public variant: owner attribution */}
        <View className="flex-row items-center gap-2 mt-1.5">
          {isOwner ? (
            <>
              {/* Active/Inactive badge untuk owner variant */}
              <View
                className={`px-1.5 py-0.5 rounded-full ${
                  business.isActive ? 'bg-emerald-50' : 'bg-neutral-200'
                }`}
              >
                <Text
                  className={`text-[9px] font-bold ${
                    business.isActive ? 'text-emerald-700' : 'text-neutral-600'
                  }`}
                >
                  {business.isActive
                    ? t('my_business.active_label').toUpperCase()
                    : t('my_business.inactive_label').toUpperCase()}
                </Text>
              </View>
              {/* Online/Offline */}
              <View
                className={`flex-row items-center gap-1 px-1.5 py-0.5 rounded-full ${
                  business.isOnline ? 'bg-blue-50' : 'bg-neutral-100'
                }`}
              >
                {business.isOnline ? (
                  <Wifi size={9} color="#2563EB" />
                ) : (
                  <WifiOff size={9} color="#737373" />
                )}
                <Text
                  className={`text-[9px] font-semibold ${
                    business.isOnline ? 'text-blue-700' : 'text-neutral-600'
                  }`}
                >
                  {business.isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Avatar
                name={business.owner.namaLengkap}
                fotoUrl={business.owner.fotoUrl ?? undefined}
                size={14}
              />
              <Text className="text-[10px] text-neutral-500 flex-1" numberOfLines={1}>
                {business.owner.namaLengkap}
              </Text>
              <View
                className={`flex-row items-center gap-1 px-1.5 py-0.5 rounded-full ${
                  business.isOnline ? 'bg-emerald-50' : 'bg-neutral-100'
                }`}
              >
                {business.isOnline ? (
                  <Wifi size={9} color="#059669" />
                ) : (
                  <WifiOff size={9} color="#737373" />
                )}
                <Text
                  className={`text-[9px] font-semibold ${
                    business.isOnline ? 'text-emerald-700' : 'text-neutral-600'
                  }`}
                >
                  {business.isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Right chevron — di align center vertical */}
      <View className="justify-center">
        <ChevronRight size={16} color="#A3A3A3" />
      </View>
    </Pressable>
  );
}
