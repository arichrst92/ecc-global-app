/**
 * Jemaat view-only profile page — per BE patch 2026-05-22a.
 *
 * Sekarang fetch dari endpoint `/admin/jemaat-public/:id` dengan tiered
 * visibility (public + close-relation fields). Fallback ke client-cache lookup
 * (family + cached homecell members) kalau BE query gagal — supaya offline /
 * stale-data scenarios tetap workable.
 */
import { useMemo } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Award,
  Cake,
  Calendar,
  HeartHandshake,
  Home,
  MapPin,
  MessageCircle,
  Phone,
  Users as UsersIcon,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { useMyFamily } from '@/hooks/useFamily';
import { getJemaatPublicProfile } from '@/api/jemaat';
import { formatPhoneDisplay } from '@/utils/phone';
import type { HomecellDetail } from '@/types/homecell';
import type { FamilyRelation } from '@/types/family';
import type { JemaatPublicProfile } from '@/types/jemaat';

type CacheFallback = {
  source: 'family' | 'homecell';
  data: {
    id: string;
    namaLengkap: string;
    kode?: string | null;
    noHp?: string | null;
    fotoUrl?: string | null;
    cabang?: { id: string; nama: string } | null;
  };
};

export default function JemaatViewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const familyQuery = useMyFamily();

  // Primary source: BE endpoint
  const beQuery = useQuery({
    queryKey: ['jemaat', 'public', id],
    queryFn: () => getJemaatPublicProfile(id!),
    enabled: !!id,
    staleTime: 2 * 60_000,
    retry: 1,
  });

  // Fallback: client cache lookup (kalau BE gagal / offline)
  const cacheFallback = useMemo<CacheFallback | null>(() => {
    if (!id || beQuery.data) return null; // skip kalau BE sudah return data
    const familyMatch = (familyQuery.data ?? []).find(
      (r: FamilyRelation) => r.jemaat.id === id,
    );
    if (familyMatch) {
      return {
        source: 'family',
        data: {
          id: familyMatch.jemaat.id,
          namaLengkap: familyMatch.jemaat.namaLengkap,
          kode: familyMatch.jemaat.kode,
          noHp: familyMatch.jemaat.noHp,
          fotoUrl: familyMatch.jemaat.fotoUrl,
          cabang: familyMatch.jemaat.cabang,
        },
      };
    }
    const cached = qc.getQueriesData<HomecellDetail>({
      queryKey: ['homecell', 'detail'],
    });
    for (const [, data] of cached) {
      if (!data) continue;
      const m = data.members.find((mem) => (mem.jemaat.id ?? mem.jemaatId) === id);
      if (m) {
        return {
          source: 'homecell',
          data: {
            id,
            namaLengkap: m.jemaat.namaLengkap,
            kode: m.jemaat.kode,
            noHp: m.jemaat.noHp,
            fotoUrl: m.jemaat.fotoUrl,
            cabang: null,
          },
        };
      }
    }
    return null;
  }, [id, beQuery.data, familyQuery.data, qc]);

  const profile = beQuery.data ?? null;
  const fallback = cacheFallback;

  function openWhatsApp(noHp: string) {
    const num = noHp.replace(/^\+/, '');
    Linking.openURL(`https://wa.me/${num}`).catch(() => {});
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <View className="bg-brand-500 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="px-4 py-2 flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center"
            >
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
            <Text className="flex-1 text-base font-bold text-white">
              {t('jemaat.detail_title')}
            </Text>
          </View>
          {profile || fallback ? (
            <View className="items-center pb-6 pt-2">
              <Avatar
                name={profile?.namaLengkap ?? fallback!.data.namaLengkap}
                fotoUrl={profile?.fotoUrl ?? fallback?.data.fotoUrl ?? undefined}
                size={80}
                className="bg-white/20"
              />
              <Text className="text-white text-xl font-bold mt-3 text-center px-5">
                {profile?.namaLengkap ?? fallback!.data.namaLengkap}
              </Text>
              {(profile?.kode || fallback?.data.kode) ? (
                <Text className="text-white/80 text-xs mt-0.5 font-mono tracking-widest">
                  {profile?.kode ?? fallback?.data.kode}
                </Text>
              ) : null}
            </View>
          ) : beQuery.isPending ? (
            <View className="items-center pb-6 pt-2">
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <View className="items-center pb-6 pt-2">
              <Avatar name="—" size={80} className="bg-white/20" />
              <Text className="text-white text-xl font-bold mt-3">
                {t('jemaat.unknown_name')}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        {!profile && !fallback ? (
          beQuery.isPending ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#F97316" />
              <Text className="text-xs text-neutral-500 mt-2">
                {t('common.loading')}
              </Text>
            </View>
          ) : beQuery.isError ? (
            <View className="bg-white rounded-2xl p-5 border border-neutral-100 items-center">
              <Text className="text-sm text-neutral-700 text-center leading-relaxed mb-3">
                {t('jemaat.load_failed')}
              </Text>
              {beQuery.error instanceof Error ? (
                <Text className="text-[10px] text-neutral-400 text-center mb-3">
                  {beQuery.error.message}
                </Text>
              ) : null}
              <Pressable
                onPress={() => beQuery.refetch()}
                className="px-4 py-2 bg-brand-500 rounded-lg"
              >
                <Text className="text-white font-semibold text-sm">
                  {t('common.retry')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="bg-white rounded-2xl p-5 border border-neutral-100 items-center">
              <Text className="text-sm text-neutral-700 text-center leading-relaxed">
                {t('jemaat.not_found')}
              </Text>
            </View>
          )
        ) : profile ? (
          /* Primary: BE response */
          <FullProfile profile={profile} onWhatsApp={openWhatsApp} t={t} router={router} />
        ) : (
          /* Fallback: client cache (limited info) */
          <FallbackProfile fallback={fallback!} onWhatsApp={openWhatsApp} t={t} />
        )}
      </ScrollView>
    </View>
  );
}

function FullProfile({
  profile,
  onWhatsApp,
  t,
  router,
}: {
  profile: JemaatPublicProfile;
  onWhatsApp: (noHp: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <>
      {/* Cabang */}
      <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3 flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
          <MapPin size={18} color="#EA580C" />
        </View>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500">{t('jemaat.branch_label')}</Text>
          <Text className="text-sm font-semibold text-neutral-900">
            {profile.cabang.nama}
          </Text>
        </View>
      </View>

      {/* Ulang tahun (selalu tampil — privacy-safe, no tahun) */}
      {profile.ulangTahunBulanTgl ? (
        <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3 flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-pink-50 items-center justify-center">
            <Cake size={18} color="#DB2777" />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-neutral-500">{t('jemaat.birthday_label')}</Text>
            <Text className="text-sm font-semibold text-neutral-900">
              {formatBirthMonthDay(profile.ulangTahunBulanTgl)}
              {profile.tanggalLahir ? ` · ${new Date(profile.tanggalLahir).getFullYear()}` : ''}
            </Text>
          </View>
        </View>
      ) : null}

      {/* HP — kalau close-relation, full + WA button. Else masked. */}
      {profile.noHp ? (
        <Pressable
          onPress={() => onWhatsApp(profile.noHp!)}
          className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3 flex-row items-center gap-3"
        >
          <View className="w-10 h-10 rounded-xl bg-green-50 items-center justify-center">
            <MessageCircle size={18} color="#16A34A" />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-neutral-500">{t('jemaat.whatsapp_btn')}</Text>
            <Text className="text-sm font-semibold text-neutral-900">
              {formatPhoneDisplay(profile.noHp)}
            </Text>
          </View>
        </Pressable>
      ) : profile.noHpMasked ? (
        <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3 flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-neutral-100 items-center justify-center">
            <Phone size={18} color="#737373" />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-neutral-500">{t('jemaat.phone_masked_label')}</Text>
            <Text className="text-sm font-semibold text-neutral-700">{profile.noHpMasked}</Text>
            <Text className="text-[10px] text-neutral-400 mt-0.5">
              {t('jemaat.phone_masked_hint')}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Alamat (close-relation only) */}
      {profile.alamat ? (
        <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3 flex-row items-start gap-3">
          <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
            <Home size={18} color="#EA580C" />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-neutral-500">{t('jemaat.address_label')}</Text>
            <Text className="text-sm text-neutral-900 leading-relaxed">{profile.alamat}</Text>
          </View>
        </View>
      ) : null}

      {/* Homecell */}
      {profile.homecell ? (
        <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3 flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
            <UsersIcon size={18} color="#EA580C" />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-neutral-500">{t('jemaat.homecell_label')}</Text>
            <Text className="text-sm font-semibold text-neutral-900">
              {profile.homecell.nama}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Roles — pakai layout sama dengan profile.tsx RoleCard: Award icon
          amber, role nama bold, subRole sebagai subtitle, status badge di kanan */}
      {profile.roles.length > 0 ? (
        <>
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-3 mb-2">
            {t('jemaat.roles_section')}
          </Text>
          <View className="bg-white rounded-2xl border border-neutral-100 overflow-hidden mb-3">
            {profile.roles.map((r, idx) => {
              const roleName = r.role?.nama ?? '—';
              const subName = r.subRole?.nama;
              return (
                <View
                  key={idx}
                  className={`flex-row items-center gap-3 p-4 ${
                    idx > 0 ? 'border-t border-neutral-100' : ''
                  }`}
                >
                  <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center">
                    <Award size={18} color="#D97706" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
                      {roleName}
                    </Text>
                    {subName ? (
                      <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                        {subName}
                      </Text>
                    ) : null}
                  </View>
                  {r.subRoleStatus?.nama ? (
                    <View className="bg-emerald-50 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-emerald-700">
                        {r.subRoleStatus.nama.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      {/* Ministries */}
      {profile.ministries.length > 0 ? (
        <>
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-2 mb-2">
            {t('jemaat.ministries_section')}
          </Text>
          <View className="bg-white rounded-2xl border border-neutral-100 mb-3">
            {profile.ministries.map((m, idx) => (
              <Pressable
                key={m.id}
                onPress={() => router.push(`/ministry/${m.pelayananId}` as never)}
                className={`p-3 flex-row items-center gap-3 ${
                  idx > 0 ? 'border-t border-neutral-100' : ''
                }`}
              >
                <View className="w-9 h-9 rounded-xl bg-brand-50 items-center justify-center">
                  <HeartHandshake size={16} color="#EA580C" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-neutral-900">{m.nama}</Text>
                  {m.posisi ? (
                    <Text className="text-xs text-neutral-500 mt-0.5">{m.posisi}</Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {/* Family (close-relation only) */}
      {profile.family && profile.family.length > 0 ? (
        <>
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-2 mb-2">
            {t('jemaat.family_section')}
          </Text>
          <View className="bg-white rounded-2xl border border-neutral-100 mb-3">
            {profile.family.map((f, idx) => (
              <Pressable
                key={f.jemaat.id}
                onPress={() => router.push(`/jemaat/${f.jemaat.id}` as never)}
                className={`p-3 flex-row items-center gap-3 ${
                  idx > 0 ? 'border-t border-neutral-100' : ''
                }`}
              >
                <Avatar
                  name={f.jemaat.namaLengkap}
                  fotoUrl={f.jemaat.fotoUrl ?? undefined}
                  size={36}
                />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-neutral-900">
                    {f.jemaat.namaLengkap}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    {t(`family.role_${f.role.toLowerCase()}`)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {/* Visibility notice — kalau bukan close-relation, kasih info */}
      {!profile.visibility.isCloseRelation ? (
        <View className="bg-neutral-100 rounded-2xl p-3 mt-2">
          <Text className="text-xs text-neutral-600 leading-relaxed">
            {t('jemaat.public_only_notice')}
          </Text>
        </View>
      ) : null}
    </>
  );
}

function FallbackProfile({
  fallback,
  onWhatsApp,
  t,
}: {
  fallback: CacheFallback;
  onWhatsApp: (noHp: string) => void;
  t: (key: string) => string;
}) {
  return (
    <>
      {fallback.data.cabang ? (
        <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3 flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
            <MapPin size={18} color="#EA580C" />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-neutral-500">{t('jemaat.branch_label')}</Text>
            <Text className="text-sm font-semibold text-neutral-900">
              {fallback.data.cabang.nama}
            </Text>
          </View>
        </View>
      ) : null}

      {fallback.data.noHp ? (
        <Pressable
          onPress={() => onWhatsApp(fallback.data.noHp!)}
          className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3 mb-3"
        >
          <View className="w-10 h-10 rounded-xl bg-green-50 items-center justify-center">
            <MessageCircle size={18} color="#16A34A" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-neutral-900">
              {t('jemaat.whatsapp_btn')}
            </Text>
            <Text className="text-xs text-neutral-500 mt-0.5">
              {t('jemaat.whatsapp_sub')}
            </Text>
          </View>
        </Pressable>
      ) : null}

      <View className="bg-amber-50 rounded-2xl p-3 border border-amber-100 mt-2">
        <Text className="text-xs text-amber-800 leading-relaxed">
          {t('jemaat.offline_fallback_notice')}
        </Text>
      </View>
    </>
  );
}

/** Convert "MM-DD" → "DD MonthName" (id locale) */
function formatBirthMonthDay(mmdd: string): string {
  const [mm, dd] = mmdd.split('-').map((s) => parseInt(s, 10));
  if (!mm || !dd) return mmdd;
  const tmp = new Date(2000, mm - 1, dd);
  return tmp.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
}
