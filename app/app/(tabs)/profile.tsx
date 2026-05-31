import { useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Award,
  Building2,
  ChevronRight,
  Download,
  Globe,
  HeartHandshake,
  Info,
  LogOut,
  Pencil,
  ScanLine,
  Sparkles,
  Store,
  Trash2,
  Users,
  UserPlus,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Avatar } from '@/components/ui/Avatar';
import { useMyFamily } from '@/hooks/useFamily';
import { Button } from '@/components/ui/Button';
import { GuestProfileView } from '@/components/GuestProfileView';
import { useAuthStore } from '@/stores/auth.store';
import { usePreferencesStore } from '@/stores/preferences.store';
import { useLogout } from '@/hooks/useLogout';
import { useScannerEvents, useScannerIbadah } from '@/hooks/useScanner';
import { getMyProfile } from '@/api/me';
import { formatPhoneDisplay } from '@/utils/phone';

export default function ProfileTab() {
  // Guard di luar — supaya rules-of-hooks tidak violated. Guest path tidak
  // pakai protected hooks (family, scanner, getMyProfile).
  const isGuest = useAuthStore((s) => s.isGuest);
  if (isGuest) {
    return <GuestProfileView />;
  }
  return <ProfileTabAuthenticated />;
}

function ProfileTabAuthenticated() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const logoutMutation = useLogout();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const language = usePreferencesStore((s) => s.language);
  const languageLabel = language === 'id' ? 'Bahasa Indonesia' : 'English';
  // Family + Scanner mode visible kalau user authorized untuk minimal 1 event/ibadah
  const familyQuery = useMyFamily();
  const scannerEventsQuery = useScannerEvents();
  const scannerIbadahQuery = useScannerIbadah();
  const isScannerAuthorized =
    (scannerEventsQuery.data?.length ?? 0) > 0 ||
    (scannerIbadahQuery.data?.length ?? 0) > 0;

  // Pull-to-refresh: refetch semua query yang feed profile page (family info,
  // scanner authorization, plus invalidate any cached me data).
  const isRefreshing =
    familyQuery.isFetching ||
    scannerEventsQuery.isFetching ||
    scannerIbadahQuery.isFetching;
  function handleRefresh() {
    void familyQuery.refetch();
    void scannerEventsQuery.refetch();
    void scannerIbadahQuery.refetch();
  }

  function confirmLogout() {
    setConfirmOpen(false);
    logoutMutation.mutate();
  }

  if (!user) return null;

  return (
    <View className="flex-1 bg-neutral-50">
      <StatusBar style="light" />
      {/* Header */}
      <View className="bg-brand-500 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-4 pb-8">
            <Text className="text-white text-lg font-bold mb-4">{t('profile.title')}</Text>
            <View className="flex-row items-center gap-4">
              <Avatar
                name={user.namaLengkap}
                fotoUrl={user.fotoUrl}
                size={72}
                className="bg-white/20"
              />
              <View className="flex-1">
                <Text className="text-white text-lg font-bold">{user.namaLengkap}</Text>
                <Text className="text-white/80 text-sm mb-2">
                  {formatPhoneDisplay(user.noHp)}
                </Text>
                <Pressable
                  onPress={() => router.push('/settings/edit-profile' as never)}
                  className="self-start bg-white/20 rounded-full px-3 py-1.5 flex-row items-center gap-1.5"
                >
                  <Pencil size={12} color="#fff" />
                  <Text className="text-white text-xs font-semibold">
                    {t('profile.edit_profile')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#F97316"
            colors={['#F97316']}
          />
        }
      >

        {/* Quick Access dipindah ke Dashboard. Scanner Mode tetap di sini
            karena merupakan akses penting volunteer. */}

        {/* Scanner Mode — only show kalau user authorized */}
        {isScannerAuthorized ? (
          <Pressable
            onPress={() => router.push('/scanner')}
            className="bg-brand-500 rounded-2xl p-4 flex-row items-center gap-3 mb-4"
          >
            <View className="w-12 h-12 rounded-xl bg-white/20 items-center justify-center">
              <ScanLine size={22} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-white">{t('profile.scanner_mode')}</Text>
              <Text className="text-xs text-white/80 mt-0.5">
                {t('profile.scanner_mode_sub')}
              </Text>
            </View>
            <ChevronRight size={18} color="#fff" />
          </Pressable>
        ) : null}

        {/* Cabang Home — section sendiri, dipisah dari pengaturan supaya
            data cabang aktif lebih prominent */}
        <BranchCard onPress={() => router.push('/settings/change-branch')} />

        {/* Keluarga — quick preview + link ke /family */}
        <FamilyCard onPress={() => router.push('/family' as never)} />

        {/* Role / peran current user */}
        <RoleCard />

        {/* Ministry / pelayanan current user */}
        <MinistryCard />

        {/* Bisnis saya — Local Market owner entry */}
        <View className="bg-white rounded-2xl border border-neutral-100 mb-4">
          <MenuRow
            icon={<Store size={18} color="#EA580C" />}
            iconBg="bg-brand-50"
            label={t('profile.my_business')}
            sub={t('profile.my_business_sub')}
            onPress={() => router.push('/profile/businesses' as never)}
            isLast
          />
        </View>

        {/* Settings menu — change_branch dipindah ke BranchCard di atas */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('profile.settings_title')}
        </Text>
        <View className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-100">
          <MenuRow
            icon={<Globe size={18} color="#0891B2" />}
            iconBg="bg-cyan-50"
            label={t('profile.language')}
            sub={languageLabel}
            onPress={() => router.push('/settings/language')}
          />
          <MenuRow
            icon={<Download size={18} color="#16A34A" />}
            iconBg="bg-emerald-50"
            label={t('profile.check_update')}
            sub={t('profile.check_update_sub')}
            onPress={() => router.push('/settings/check-update' as never)}
          />
          <MenuRow
            icon={<Info size={18} color="#0F766E" />}
            iconBg="bg-teal-50"
            label={t('profile.about')}
            sub="v0.1.0"
            onPress={() => router.push('/settings/about')}
            isLast
          />
        </View>

        <View className="mt-6">
          <Button
            label={t('auth.logout')}
            variant="danger"
            onPress={() => setConfirmOpen(true)}
            loading={logoutMutation.isPending}
            leftIcon={<LogOut size={16} color="#fff" />}
            fullWidth
          />
        </View>

        {/* Danger zone — hapus akun di paling bawah supaya tidak ke-tap accidental */}
        <Text className="text-xs font-bold text-red-500 uppercase tracking-wider mt-8 mb-2">
          {t('profile.danger_zone')}
        </Text>
        <View className="bg-white rounded-2xl border border-red-100 mb-4">
          <MenuRow
            icon={<Trash2 size={18} color="#DC2626" />}
            iconBg="bg-red-50"
            label={t('profile.delete_account')}
            sub={t('profile.delete_account_sub')}
            onPress={() => router.push('/settings/delete-account' as never)}
            isLast
          />
        </View>

        <Text className="text-xs text-neutral-400 text-center mt-4">
          Els App v0.1.0
        </Text>
      </ScrollView>

      {/* Confirm logout modal */}
      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <Pressable
          onPress={() => setConfirmOpen(false)}
          className="flex-1 bg-black/50 items-center justify-center px-6"
        >
          <Pressable
            onPress={() => {}}
            className="bg-white rounded-2xl p-5 w-full max-w-sm"
          >
            <View className="w-12 h-12 rounded-xl bg-red-50 items-center justify-center mb-3 self-start">
              <AlertTriangle size={24} color="#DC2626" />
            </View>
            <Text className="text-lg font-bold text-neutral-900 mb-1">
              {t('auth.logout_confirm_title')}
            </Text>
            <Text className="text-sm text-neutral-500 mb-4 leading-relaxed">
              {t('auth.logout_confirm_msg')}
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label={t('common.cancel')}
                  variant="secondary"
                  onPress={() => setConfirmOpen(false)}
                  fullWidth
                  disabled={logoutMutation.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={t('auth.logout')}
                  variant="danger"
                  onPress={confirmLogout}
                  fullWidth
                  loading={logoutMutation.isPending}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuRow({
  label,
  sub,
  isLast,
  onPress,
  icon,
  iconBg,
}: {
  label: string;
  sub?: string;
  isLast?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  /** Tailwind class untuk background icon (mis. "bg-brand-50") */
  iconBg?: string;
}) {
  return (
    <Pressable onPress={onPress} className="p-4 flex-row items-center gap-3">
      {icon ? (
        <View
          className={`w-9 h-9 rounded-xl items-center justify-center ${iconBg ?? 'bg-neutral-100'}`}
        >
          {icon}
        </View>
      ) : null}
      <View className="flex-1">
        <Text className="text-sm font-medium text-neutral-900">{label}</Text>
        {sub ? <Text className="text-xs text-neutral-500 mt-0.5">{sub}</Text> : null}
      </View>
      <ChevronRight size={16} color="#A3A3A3" />
    </Pressable>
  );
}

/**
 * BranchCard — tampil cabang home current user, tap → /settings/change-branch.
 * Section sendiri (bukan di dalam Pengaturan) supaya data cabang aktif
 * lebih prominent.
 */
function BranchCard({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const meQuery = useQuery({
    queryKey: ['me', 'profile-tab'],
    queryFn: getMyProfile,
    staleTime: 5 * 60_000,
  });
  const cabang = meQuery.data?.cabang;

  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
        {t('profile.branch_section')}
      </Text>
      <Pressable
        onPress={onPress}
        className="bg-white rounded-2xl border border-neutral-100 overflow-hidden"
      >
        <View className="flex-row items-center gap-3 p-4">
          <View className="w-12 h-12 rounded-2xl bg-brand-50 items-center justify-center">
            <Building2 size={22} color="#EA580C" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-xs text-neutral-500 mb-0.5">
              {t('profile.branch_home_label')}
            </Text>
            <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
              {cabang?.nama ?? '—'}
            </Text>
            {cabang?.kode ? (
              <Text className="text-[10px] text-neutral-400 mt-0.5 font-mono tracking-wider">
                {cabang.kode}
              </Text>
            ) : null}
          </View>
          <View className="flex-row items-center gap-1">
            <Text className="text-xs text-brand-600 font-semibold">
              {t('profile.branch_change_cta')}
            </Text>
            <ChevronRight size={14} color="#EA580C" />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

/**
 * FamilyCard — preview anggota keluarga di profile screen.
 * Tampil count + 3 avatar preview + "Lihat semua" CTA.
 * Tap card → navigate ke /family. Empty state → CTA tambah anggota pertama.
 */
function FamilyCard({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const familyQuery = useMyFamily();
  const family = familyQuery.data ?? [];
  const previewCount = Math.min(family.length, 3);
  const previewItems = family.slice(0, previewCount);
  const extraCount = Math.max(0, family.length - previewCount);

  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
        {t('profile.family_section')}
      </Text>
      <Pressable
        onPress={onPress}
        className="bg-white rounded-2xl border border-neutral-100 overflow-hidden"
      >
        <View className="flex-row items-center gap-3 p-4">
          <View className="w-12 h-12 rounded-2xl bg-pink-50 items-center justify-center">
            {family.length > 0 ? (
              <Users size={22} color="#DB2777" />
            ) : (
              <UserPlus size={22} color="#DB2777" />
            )}
          </View>
          <View className="flex-1 min-w-0">
            {family.length > 0 ? (
              <>
                <Text className="text-sm font-bold text-neutral-900">
                  {t('profile.family_count', { count: family.length })}
                </Text>
                <View className="flex-row items-center gap-1.5 mt-1.5">
                  {previewItems.map((rel, idx) => (
                    <Avatar
                      key={rel.jemaat.id}
                      name={rel.jemaat.namaLengkap}
                      fotoUrl={rel.jemaat.fotoUrl ?? undefined}
                      size={22}
                      className={idx > 0 ? '-ml-2' : ''}
                    />
                  ))}
                  {extraCount > 0 ? (
                    <View className="-ml-2 w-[22px] h-[22px] rounded-full bg-pink-100 items-center justify-center border border-white">
                      <Text className="text-[9px] font-bold text-pink-700">
                        +{extraCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </>
            ) : (
              <>
                <Text className="text-sm font-semibold text-neutral-700">
                  {t('profile.family_empty')}
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  {t('profile.family_empty_sub')}
                </Text>
              </>
            )}
          </View>
          <ChevronRight size={14} color="#A3A3A3" />
        </View>
      </Pressable>
    </View>
  );
}

/**
 * RoleCard — tampil daftar peran current user di gereja (jemaatRoles dari
 * /admin/me). Termasuk role + subRole + status. Misal:
 * "Volunteer · Worship Team · Aktif"
 *
 * Visual: tiap role di-render sebagai mini-card dengan icon Award, nama role
 * bold, subRole + status di subtitle. Layout list dengan separator.
 */
function RoleCard() {
  const { t } = useTranslation();
  const meQuery = useQuery({
    queryKey: ['me', 'profile-tab'],
    queryFn: getMyProfile,
    staleTime: 5 * 60_000,
  });
  const roles = meQuery.data?.jemaatRoles ?? [];

  if (roles.length === 0) {
    return null; // Hide kalau user belum punya role apapun
  }

  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
        {t('profile.role_section')}
      </Text>
      <View className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        {roles.map((r, idx) => {
          const roleName = r.role?.nama ?? '—';
          // Sub-role di tampil sebagai sub-info; sub-role STATUS hanya tampil
          // sebagai badge di kanan (tidak duplicate di teks)
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
    </View>
  );
}

/**
 * MinistryCard — tampil daftar ministry / pelayanan current user.
 * Per BE patch 2026-05-22a — `me.ministries` field active.
 *
 * Visual: tiap ministry sebagai mini-card row, icon HeartHandshake brand,
 * nama bold + posisi sebagai subtitle. Tap row → navigate ke detail
 * ministry. Empty state CTA → /ministry explore page.
 */
function MinistryCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const meQuery = useQuery({
    queryKey: ['me', 'profile-tab'],
    queryFn: getMyProfile,
    staleTime: 5 * 60_000,
  });
  const ministries = meQuery.data?.ministries ?? [];

  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
        {t('profile.ministry_section')}
      </Text>
      {ministries.length === 0 ? (
        <Pressable
          onPress={() => router.push('/ministry' as never)}
          className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3"
        >
          <View className="w-10 h-10 rounded-xl bg-rose-50 items-center justify-center">
            <Sparkles size={18} color="#E11D48" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-neutral-700">
              {t('profile.ministry_empty')}
            </Text>
            <Text className="text-xs text-neutral-500 mt-0.5">
              {t('profile.ministry_explore_sub')}
            </Text>
          </View>
          <ChevronRight size={16} color="#A3A3A3" />
        </Pressable>
      ) : (
        <View className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          {ministries.map((m, idx) => (
            <Pressable
              key={m.id}
              onPress={() => router.push(`/ministry/${m.pelayananId}` as never)}
              className={`flex-row items-center gap-3 p-4 ${
                idx > 0 ? 'border-t border-neutral-100' : ''
              }`}
            >
              <View className="w-10 h-10 rounded-xl bg-rose-50 items-center justify-center">
                <HeartHandshake size={18} color="#E11D48" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
                  {m.nama}
                </Text>
                {m.posisi ? (
                  <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                    {m.posisi}
                  </Text>
                ) : null}
              </View>
              <ChevronRight size={14} color="#A3A3A3" />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
