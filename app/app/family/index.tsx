import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronRight, Hourglass, Plus, UserPlus, Users } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { useFamilyRequestAction, useFamilyRequests, useMyFamily } from '@/hooks/useFamily';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/types/api';
import type { FamilyLinkRequestRow, FamilyRelation, FamilyRole } from '@/types/family';
import { formatPhoneDisplay } from '@/utils/phone';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { PullRefreshControl } from '@/components/ui/PullRefreshControl';

function roleLabel(role: FamilyRole, t: (k: string) => string): string {
  switch (role) {
    case 'SPOUSE':
      return t('family.role_spouse');
    case 'CHILD':
      return t('family.role_child');
    case 'PARENT':
      return t('family.role_parent');
    case 'SIBLING':
      return t('family.role_sibling');
    case 'GUARDIAN':
      return t('family.role_guardian');
    case 'OTHER':
    default:
      return t('family.role_other');
  }
}

/**
 * Display label — prefer tipeRelasi.nama (granular) over broad role.
 * Post BE refactor 2026-08-02 semua row baru punya tipeRelasi.
 * Row lama (pre-refactor) fallback ke roleLabel.
 */
function relationDisplayLabel(
  relation: FamilyRelation,
  t: (k: string) => string,
): string {
  if (relation.tipeRelasi?.nama) return relation.tipeRelasi.nama;
  return roleLabel(relation.role, t);
}

function roleColor(role: FamilyRole): { bg: string; text: string } {
  switch (role) {
    case 'SPOUSE':
      return { bg: 'bg-rose-100', text: 'text-rose-700' };
    case 'CHILD':
      return { bg: 'bg-blue-100', text: 'text-blue-700' };
    case 'PARENT':
      return { bg: 'bg-amber-100', text: 'text-amber-700' };
    case 'SIBLING':
      return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
    case 'GUARDIAN':
      return { bg: 'bg-purple-100', text: 'text-purple-700' };
    case 'OTHER':
    default:
      return { bg: 'bg-neutral-100', text: 'text-neutral-700' };
  }
}

export default function FamilyListScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const query = useMyFamily();
  const family = query.data ?? [];
  const reqQuery = useFamilyRequests();
  const incoming = reqQuery.data?.incoming ?? [];
  const outgoing = reqQuery.data?.outgoing ?? [];

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => goBack(router)}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">
              {t('family.title')}
            </Text>
            <Text className="text-xs text-neutral-500">
              {family.length} {t('family.members_count')}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/family/add')}
            {...gx('w-10 h-10 rounded-full bg-brand-500 items-center justify-center')}
          >
            <Plus size={18} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <PullRefreshControl
            onRefresh={() => Promise.all([query.refetch(), reqQuery.refetch()])}
            tintColor="#F97316"
          />
        }
      >
        <FamilyRequests incoming={incoming} outgoing={outgoing} />

        {query.isPending ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : query.isError ? (
          <View className="items-center py-16 px-8">
            <Text className="text-sm text-red-600 text-center mb-3">{t('error.generic')}</Text>
            <Pressable
              onPress={() => query.refetch()}
              {...gx('px-4 py-2 bg-brand-500 rounded-lg')}
            >
              <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : family.length === 0 ? (
          <EmptyState onAdd={() => router.push('/family/add')} />
        ) : (
          <View className="gap-2">
            {family.map((f) => (
              <FamilyCard
                key={f.id}
                relation={f}
                onPress={() => router.push(`/family/${f.jemaat.id}`)}
              />
            ))}
          </View>
        )}

        {family.length > 0 ? (
          <Pressable
            onPress={() => router.push('/family/add')}
            className="mt-4 p-4 bg-card rounded-2xl border border-dashed border-brand-300 flex-row items-center justify-center gap-2"
          >
            <Plus size={18} color="#EA580C" />
            <Text className="text-sm font-semibold text-brand-600">
              {t('family.add_member')}
            </Text>
          </Pressable>
        ) : null}

        {/* Info card */}
        <View className="mt-6 p-3 bg-blue-50 border border-blue-100 rounded-2xl">
          <Text className="text-xs text-blue-800 leading-relaxed">
            {t('family.info_notice')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function FamilyCard({
  relation,
  onPress,
}: {
  relation: FamilyRelation;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { jemaat, role, isVerified } = relation;
  const color = roleColor(role);

  return (
    <Pressable
      onPress={onPress}
      className="bg-card rounded-2xl p-3 flex-row items-center gap-3 border border-neutral-100"
    >
      <Avatar name={jemaat.namaLengkap} fotoUrl={jemaat.fotoUrl ?? undefined} size={48} />
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2">
          <Text className="font-semibold text-neutral-900" numberOfLines={1}>
            {jemaat.namaLengkap}
          </Text>
          {jemaat.isDependent ? (
            <View className="bg-neutral-200 px-1.5 py-0.5 rounded-full">
              <Text className="text-[9px] font-bold text-neutral-600">
                {t('family.dependent_badge')}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-xs text-neutral-500 mt-0.5">
          {jemaat.noHp ? formatPhoneDisplay(jemaat.noHp) : jemaat.cabang.nama}
        </Text>
        <View className="flex-row items-center flex-wrap gap-1.5 mt-1">
          <View className={`${color.bg} self-start px-2 py-0.5 rounded-full`}>
            <Text className={`text-[10px] font-bold ${color.text}`}>
              {relationDisplayLabel(relation, t)}
            </Text>
          </View>
          <View
            className={`self-start px-2 py-0.5 rounded-full ${
              isVerified ? 'bg-green-100' : 'bg-amber-100'
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                isVerified ? 'text-green-700' : 'text-amber-700'
              }`}
            >
              {isVerified ? `✓ ${t('family.verified')}` : t('family.unverified')}
            </Text>
          </View>
        </View>
      </View>
      <ChevronRight size={16} color={nc('#A3A3A3')} />
    </Pressable>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="items-center py-16 px-8">
      <View className="w-20 h-20 rounded-2xl bg-neutral-100 items-center justify-center mb-4">
        <Users size={32} color={nc('#A3A3A3')} />
      </View>
      <Text className="text-lg font-semibold text-neutral-700">
        {t('family.empty_title')}
      </Text>
      <Text className="text-sm text-neutral-500 text-center mt-1 mb-4">
        {t('family.empty_msg')}
      </Text>
      <Pressable
        onPress={onAdd}
        {...gx('px-4 py-2.5 bg-brand-500 rounded-xl flex-row items-center gap-2')}
      >
        <Plus size={16} color="#fff" />
        <Text className="text-sm font-semibold text-white">
          {t('family.add_first')}
        </Text>
      </Pressable>
    </View>
  );
}

/* ==============================================================
 * Permintaan hubungan keluarga (2.4.7): masuk (setujui / tolak) &
 * keluar (menunggu, bisa dibatalkan).
 * ============================================================== */
function FamilyRequests({ incoming, outgoing }: { incoming: FamilyLinkRequestRow[]; outgoing: FamilyLinkRequestRow[] }) {
  const { t } = useTranslation();
  const showToast = useToast((s) => s.show);
  const act = useFamilyRequestAction();
  const busy = act.approve.isPending || act.reject.isPending || act.cancel.isPending;
  if (!incoming.length && !outgoing.length) return null;
  const onErr = (e: unknown) => showToast(e instanceof ApiError ? e.message : t('error.network'), 'error');

  return (
    <View className="mb-4 gap-3">
      {incoming.length ? (
        <View>
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            {t('family.req_incoming', { count: incoming.length })}
          </Text>
          <View className="gap-2">
            {incoming.map((r) => (
              <View key={r.id} className="bg-card rounded-2xl p-4 border border-amber-200">
                <View className="flex-row items-center gap-3">
                  <Avatar name={r.requester.namaLengkap} fotoUrl={r.requester.fotoUrl ?? undefined} size={44} />
                  <View className="flex-1 min-w-0">
                    <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
                      {r.requester.namaLengkap}
                    </Text>
                    <Text className="text-xs text-neutral-500" numberOfLines={1}>
                      {[r.requester.kode, r.requester.cabang].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </View>
                <Text className="text-sm text-neutral-700 mt-3 leading-relaxed">
                  {r.viaGuardian
                    ? t('family.req_body_guardian', { name: r.requester.namaLengkap, target: r.target.namaLengkap, tipe: r.tipeRelasi.nama })
                    : t('family.req_body', { name: r.requester.namaLengkap, tipe: r.tipeRelasi.nama })}
                </Text>
                <Text className="text-[11px] text-neutral-500 mt-1">{t('family.req_warning')}</Text>
                <View className="flex-row gap-2 mt-3">
                  <Pressable
                    disabled={busy}
                    onPress={() =>
                      Alert.alert(t('family.req_reject_title'), t('family.req_reject_msg', { name: r.requester.namaLengkap }), [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('family.req_reject'),
                          style: 'destructive',
                          onPress: () =>
                            act.reject.mutate(
                              { id: r.id },
                              { onSuccess: () => showToast(t('family.req_rejected'), 'success'), onError: onErr },
                            ),
                        },
                      ])
                    }
                    className="flex-1 py-2.5 rounded-xl border border-neutral-200 items-center"
                  >
                    <Text className="text-sm font-semibold text-neutral-700">{t('family.req_reject')}</Text>
                  </Pressable>
                  <Pressable
                    disabled={busy}
                    onPress={() =>
                      act.approve.mutate(r.id, {
                        onSuccess: () => showToast(t('family.req_approved', { name: r.requester.namaLengkap }), 'success'),
                        onError: onErr,
                      })
                    }
                    {...gx('flex-1 py-2.5 rounded-xl bg-brand-500 items-center flex-row justify-center gap-1.5')}
                  >
                    <UserPlus size={15} color="#fff" />
                    <Text className="text-sm font-bold text-white">{t('family.req_approve')}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {outgoing.length ? (
        <View>
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            {t('family.req_outgoing', { count: outgoing.length })}
          </Text>
          <View className="bg-card rounded-2xl border border-neutral-100">
            {outgoing.map((r, idx) => (
              <View key={r.id} className={`p-3 flex-row items-center gap-3 ${idx ? 'border-t border-neutral-100' : ''}`}>
                <Avatar name={r.target.namaLengkap} fotoUrl={r.target.fotoUrl ?? undefined} size={40} />
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                    {r.target.namaLengkap}
                  </Text>
                  <View className="flex-row items-center gap-1 mt-0.5">
                    <Hourglass size={11} color="#B45309" />
                    <Text className="text-xs text-amber-700 flex-1" numberOfLines={1}>
                      {r.tipeRelasi.nama} · {r.viaGuardian ? t('family.req_waiting_guardian') : t('family.req_waiting')}
                    </Text>
                  </View>
                </View>
                <Pressable
                  disabled={busy}
                  onPress={() =>
                    act.cancel.mutate(r.id, { onSuccess: () => showToast(t('family.req_cancelled'), 'success'), onError: onErr })
                  }
                  className="px-3 py-1.5 rounded-full border border-neutral-200"
                >
                  <Text className="text-xs font-semibold text-neutral-700">{t('family.req_cancel')}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
