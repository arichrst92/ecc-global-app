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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Briefcase,
  Check,
  ChevronRight,
  Footprints,
  Cake,
  Calendar,
  Heart,
  HeartHandshake,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserRound,
  Users2,
  Users as UsersIcon,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { useMyFamily } from '@/hooks/useFamily';
import { getJemaatPublicProfile } from '@/api/jemaat';
import { formatPhoneDisplay } from '@/utils/phone';
import type { HomecellDetail } from '@/types/homecell';
import type { FamilyRelation } from '@/types/family';
import type { JemaatPublicProfile } from '@/types/jemaat';
import { goBack } from '@/utils/nav';
import { parseLocalDate } from '@/utils/date';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

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
  const insets = useSafeAreaInsets();
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
      <View {...gx('bg-brand-500 rounded-b-3xl')}>
        <SafeAreaView edges={['top']}>
          <View className="px-4 py-2 flex-row items-center">
            <Pressable
              onPress={() => goBack(router)}
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 32 }}
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
            <View className="bg-card rounded-2xl p-5 border border-neutral-100 items-center">
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
                {...gx('px-4 py-2 bg-brand-500 rounded-lg')}
              >
                <Text className="text-white font-semibold text-sm">
                  {t('common.retry')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="bg-card rounded-2xl p-5 border border-neutral-100 items-center">
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
  const journey = profile.spiritualJourney;
  const hc = profile.homecell;
  const pekerjaan = profile.pekerjaan
    ? [profile.pekerjaan.statusPekerjaan, profile.pekerjaan.namaKantor].filter(Boolean).join(' · ')
    : '';
  const pernikahan = profile.pernikahan?.statusPernikahan
    ? [
        profile.pernikahan.statusPernikahan,
        profile.pernikahan.tanggalPernikahan
          ? parseLocalDate(profile.pernikahan.tanggalPernikahan).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <>
      {/* ============ 1. Kontak & Data Diri ============ */}
      <Cluster
        bg="bg-brand-50"
        icon={<UserRound size={16} color="#EA580C" />}
        title={t('jemaat.cluster_contact')}
        sub={t('jemaat.cluster_contact_sub')}
      >
        <Box>
          <Row icon={<MapPin size={16} color="#EA580C" />} bg="bg-brand-50" label={t('jemaat.branch_label')} value={profile.cabang.nama} />
          {profile.noHp ? (
            <Row
              icon={<MessageCircle size={16} color="#16A34A" />}
              bg="bg-green-50"
              label={t('jemaat.whatsapp_btn')}
              value={formatPhoneDisplay(profile.noHp)}
              onPress={() => onWhatsApp(profile.noHp!)}
              action={
                <View className="bg-green-500 rounded-full px-3 py-1">
                  <Text className="text-[11px] font-bold text-white">{t('jemaat.chat')}</Text>
                </View>
              }
            />
          ) : profile.noHpMasked ? (
            <Row
              icon={<Phone size={16} color={nc('#737373')} />}
              bg="bg-neutral-100"
              label={t('jemaat.phone_masked_label')}
              value={profile.noHpMasked}
              hint={t('jemaat.phone_masked_hint')}
            />
          ) : null}
          {profile.email ? (
            <Row icon={<Mail size={16} color="#2563EB" />} bg="bg-blue-50" label={t('jemaat.email_label')} value={profile.email} />
          ) : null}
          {profile.ulangTahunBulanTgl ? (
            <Row
              icon={<Cake size={16} color="#DB2777" />}
              bg="bg-pink-50"
              label={t('jemaat.birthday_label')}
              value={`${formatBirthMonthDay(profile.ulangTahunBulanTgl)}${
                profile.tanggalLahir ? ` · ${parseLocalDate(profile.tanggalLahir).getFullYear()}` : ''
              }`}
            />
          ) : null}
          {profile.alamat ? (
            <Row icon={<Home size={16} color="#059669" />} bg="bg-emerald-50" label={t('jemaat.address_label')} value={profile.alamat} />
          ) : null}
          {pekerjaan ? (
            <Row icon={<Briefcase size={16} color={nc('#B45309')} />} bg="bg-amber-50" label={t('jemaat.job_label')} value={pekerjaan} />
          ) : null}
          {pernikahan ? (
            <Row icon={<Heart size={16} color="#E11D48" />} bg="bg-rose-50" label={t('jemaat.marriage_label')} value={pernikahan} />
          ) : null}
        </Box>
      </Cluster>

      {/* ============ 2. Pertumbuhan Rohani ============ */}
      {journey && journey.total > 0 ? (
        <Cluster
          bg="bg-emerald-50"
          icon={<Footprints size={16} color="#059669" />}
          title={t('profile.cluster_growth')}
          sub={t('jemaat.journey_sub')}
        >
          <View className="bg-card rounded-2xl border border-neutral-100 p-4">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-sm font-semibold text-neutral-900">
                {t('journey.progress', { done: journey.achievedCount, total: journey.total })}
              </Text>
              <Text className="text-xs font-bold text-emerald-600">
                {Math.round((journey.achievedCount / journey.total) * 100)}%
              </Text>
            </View>
            <View className="h-2 bg-neutral-100 rounded-full overflow-hidden mb-3">
              <View
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.round((journey.achievedCount / journey.total) * 100)}%` }}
              />
            </View>
            {journey.steps.map((st, i) => (
              <View key={st.id} className="flex-row gap-3">
                {/* garis timeline */}
                <View className="items-center" style={{ width: 24 }}>
                  <View
                    className={`w-6 h-6 rounded-full items-center justify-center ${
                      st.achieved ? 'bg-emerald-500' : st.isNext ? 'bg-amber-100 border border-amber-400' : 'bg-neutral-100'
                    }`}
                  >
                    {st.achieved ? (
                      <Check size={13} color="#fff" />
                    ) : (
                      <Text className={`text-[10px] font-bold ${st.isNext ? 'text-amber-700' : 'text-neutral-400'}`}>
                        {st.urutan}
                      </Text>
                    )}
                  </View>
                  {i < journey.steps.length - 1 ? (
                    <View
                      style={{ width: 2, flex: 1, minHeight: 10 }}
                      className={st.achieved ? 'bg-emerald-300' : 'bg-neutral-200'}
                    />
                  ) : null}
                </View>
                <View className="flex-1 flex-row items-center justify-between pb-3 pt-0.5">
                  <Text
                    className={`flex-1 text-sm ${
                      st.achieved ? 'text-neutral-900 font-medium' : st.isNext ? 'text-amber-800 font-medium' : 'text-neutral-400'
                    }`}
                    numberOfLines={1}
                  >
                    {st.ikon ? `${st.ikon} ` : ''}
                    {st.judul}
                  </Text>
                  {st.isNext ? (
                    <View className="bg-amber-50 px-2 py-0.5 rounded-full ml-2">
                      <Text className="text-[10px] font-bold text-amber-700">{t('jemaat.journey_next')}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </Cluster>
      ) : null}

      {/* ============ 3. Komunitas ============ */}
      {hc ? (
        <Cluster
          bg="bg-violet-50"
          icon={<Users2 size={16} color="#7C3AED" />}
          title={t('profile.cluster_community')}
          sub={t('jemaat.homecell_label')}
        >
          <Pressable
            onPress={() => router.push(`/homecell/view/${hc.id}` as never)}
            className="bg-card rounded-2xl border border-neutral-100 overflow-hidden active:opacity-80"
          >
            <View className="bg-violet-500 px-4 py-3 flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center">
                <Home size={17} color="#fff" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-bold text-white" numberOfLines={1}>
                  {hc.nama}
                </Text>
                {hc.area?.nama ? (
                  <Text className="text-[11px] text-white/80" numberOfLines={1}>
                    {t('jemaat.homecell_area', { area: hc.area.nama })}
                  </Text>
                ) : null}
              </View>
              <ChevronRight size={16} color="#fff" />
            </View>
            <View className="px-4 py-3 gap-2">
              {hc.hari || hc.jam ? (
                <View className="flex-row items-center gap-2">
                  <Calendar size={14} color="#7C3AED" />
                  <Text className="text-xs text-neutral-700">
                    {[hc.hari ? titleCase(hc.hari) : null, hc.jam].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              ) : null}
              {typeof hc.memberCount === 'number' ? (
                <View className="flex-row items-center gap-2">
                  <UsersIcon size={14} color="#7C3AED" />
                  <Text className="text-xs text-neutral-700">{t('jemaat.homecell_members', { count: hc.memberCount })}</Text>
                </View>
              ) : null}
              {hc.picJemaat ? (
                <View className="flex-row items-center gap-2">
                  <Avatar name={hc.picJemaat.namaLengkap} fotoUrl={hc.picJemaat.fotoUrl ?? undefined} size={20} />
                  <Text className="text-xs text-neutral-700 flex-1" numberOfLines={1}>
                    {t('jemaat.homecell_pic', { name: hc.picJemaat.namaLengkap })}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </Cluster>
      ) : null}

      {/* ============ 4. Pelayanan ============ */}
      {profile.ministries.length > 0 ? (
        <Cluster
          bg="bg-pink-50"
          icon={<HeartHandshake size={16} color="#DB2777" />}
          title={t('profile.cluster_service')}
          sub={t('jemaat.ministries_section')}
        >
          <Box>
            {profile.ministries.map((m) => (
              <Row
                key={m.id}
                icon={<HeartHandshake size={16} color="#DB2777" />}
                bg="bg-pink-50"
                label={m.posisi ?? ''}
                value={m.nama}
                strong
                onPress={() => router.push(`/ministry/${m.pelayananId}` as never)}
                chevron
              />
            ))}
          </Box>
        </Cluster>
      ) : null}

      {/* ============ 5. Keluarga ============ */}
      {profile.family && profile.family.length > 0 ? (
        <Cluster
          bg="bg-sky-50"
          icon={<UsersIcon size={16} color="#0284C7" />}
          title={t('jemaat.family_section')}
          sub={t('jemaat.family_count', { count: profile.family.length })}
        >
          <Box>
            {profile.family.map((f) => (
              <Pressable
                key={f.jemaat.id}
                onPress={() => router.push(`/jemaat/${f.jemaat.id}` as never)}
                className="px-4 py-3 flex-row items-center gap-3 active:bg-neutral-50"
              >
                <Avatar name={f.jemaat.namaLengkap} fotoUrl={f.jemaat.fotoUrl ?? undefined} size={36} />
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                    {f.jemaat.namaLengkap}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    {f.tipeRelasi?.nama ?? (f.role ? t(`family.role_${f.role.toLowerCase()}`) : t('family.role_generic'))}
                  </Text>
                </View>
                <ChevronRight size={16} color={nc('#A3A3A3')} />
              </Pressable>
            ))}
          </Box>
        </Cluster>
      ) : null}

      {/* Info privasi — kalau bukan relasi dekat */}
      {!profile.visibility.isCloseRelation ? (
        <View className="bg-neutral-100 rounded-2xl p-3 flex-row gap-2">
          <ShieldCheck size={14} color={nc('#737373')} style={{ marginTop: 1 }} />
          <Text className="text-xs text-neutral-600 leading-relaxed flex-1">{t('jemaat.public_only_notice')}</Text>
        </View>
      ) : null}
    </>
  );
}

/* ==============================================================
 * Komponen layout — sama gaya dengan tab Profil (cluster ber-ikon)
 * ============================================================== */
function Cluster({
  icon,
  title,
  sub,
  bg,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-5">
      <View className="flex-row items-center gap-2.5 mb-3">
        <View className={`w-9 h-9 rounded-xl items-center justify-center ${bg}`}>{icon}</View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-neutral-900">{title}</Text>
          {sub ? <Text className="text-[11px] text-neutral-500">{sub}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <View className="bg-card rounded-2xl border border-neutral-100 divide-y divide-neutral-100 overflow-hidden">{children}</View>;
}

function Row({
  icon,
  bg,
  label,
  value,
  hint,
  onPress,
  action,
  chevron,
  strong,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  hint?: string;
  onPress?: () => void;
  action?: React.ReactNode;
  chevron?: boolean;
  strong?: boolean;
}) {
  const body = (
    <>
      <View className={`w-9 h-9 rounded-xl items-center justify-center ${bg}`}>{icon}</View>
      <View className="flex-1 min-w-0">
        {strong ? (
          <>
            <Text className="text-sm font-semibold text-neutral-900">{value}</Text>
            {label ? <Text className="text-xs text-neutral-500 mt-0.5">{label}</Text> : null}
          </>
        ) : (
          <>
            <Text className="text-[11px] text-neutral-500">{label}</Text>
            <Text className="text-sm text-neutral-900 leading-relaxed">{value}</Text>
          </>
        )}
        {hint ? <Text className="text-[10px] text-neutral-400 mt-0.5">{hint}</Text> : null}
      </View>
      {action}
      {chevron ? <ChevronRight size={16} color={nc('#A3A3A3')} /> : null}
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} className="px-4 py-3 flex-row items-center gap-3 active:bg-neutral-50">
      {body}
    </Pressable>
  ) : (
    <View className="px-4 py-3 flex-row items-center gap-3">{body}</View>
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
        <View className="bg-card rounded-2xl p-4 border border-neutral-100 mb-3 flex-row items-center gap-3">
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
          className="bg-card rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3 mb-3"
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

/** "MINGGU" → "Minggu" */
function titleCase(v: string): string {
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}
