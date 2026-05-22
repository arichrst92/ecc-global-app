/**
 * Ministry detail page — per BE patch 2026-05-22a.
 *
 * Shows ministry info, leader, members list, and current user's membership.
 * "Join" button → WA leader (Phase 1 — POST /admin/ministry/:id/join deferred
 * to Phase 2).
 */
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CheckCircle2,
  HeartHandshake,
  MessageCircle,
  Users,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useMinistryDetail } from '@/hooks/useMinistry';

export default function MinistryDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showToast = useToast((s) => s.show);

  const query = useMinistryDetail(id);
  const ministry = query.data;

  // Sort members: leader first, then by sinceDate ASC (paling lama dulu)
  const sortedMembers = useMemo(() => {
    if (!ministry) return [];
    return [...ministry.members].sort((a, b) => {
      const aLevel = a.posisi === ministry.leader?.role.nama ? -1 : 0;
      const bLevel = b.posisi === ministry.leader?.role.nama ? -1 : 0;
      if (aLevel !== bLevel) return aLevel - bLevel;
      return a.sinceDate.localeCompare(b.sinceDate);
    });
  }, [ministry]);

  function handleContactLeader() {
    const noHp = ministry?.leader?.jemaat.noHp;
    if (!noHp) {
      showToast(t('ministry.no_leader_contact'), 'info');
      return;
    }
    const num = noHp.replace(/^\+/, '');
    Linking.openURL(`https://wa.me/${num}`).catch(() => {});
  }

  if (query.isPending) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  if (!ministry) {
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
          </View>
        </SafeAreaView>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-neutral-500 text-center">
            {t('ministry.detail_not_found')}
          </Text>
        </View>
      </View>
    );
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
            <Text className="flex-1 text-base font-bold text-white" numberOfLines={1}>
              {t('ministry.title')}
            </Text>
          </View>
          <View className="items-center pb-6 pt-2 px-5">
            <View className="w-16 h-16 rounded-2xl bg-white/20 items-center justify-center mb-2">
              <HeartHandshake size={32} color="#fff" />
            </View>
            <Text className="text-white text-xl font-bold text-center">
              {ministry.nama}
            </Text>
            <View className="flex-row items-center gap-3 mt-2">
              <View className="flex-row items-center gap-1">
                <Users size={12} color="#fff" />
                <Text className="text-xs text-white/80">
                  {ministry.memberCount} {t('ministry.member_label')}
                </Text>
              </View>
              {ministry.myMembership ? (
                <View className="bg-white/20 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                  <CheckCircle2 size={10} color="#fff" />
                  <Text className="text-[10px] font-bold text-white">
                    {t('ministry.youre_member')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        {/* Deskripsi */}
        {ministry.deskripsi ? (
          <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4">
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              {t('ministry.about_section')}
            </Text>
            <Text className="text-sm text-neutral-700 leading-relaxed">
              {ministry.deskripsi}
            </Text>
          </View>
        ) : null}

        {/* My membership info */}
        {ministry.myMembership ? (
          <View className="bg-brand-50 rounded-2xl p-4 border border-brand-100 mb-4 flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-brand-500 items-center justify-center">
              <CheckCircle2 size={20} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-brand-700">
                {t('ministry.my_role_label')}
              </Text>
              <Text className="text-xs text-brand-700/80 mt-0.5">
                {ministry.myMembership.posisi || '—'}
                {' · '}
                {t('ministry.since_label')}{' '}
                {new Date(ministry.myMembership.sinceDate).toLocaleDateString('id-ID')}
              </Text>
            </View>
          </View>
        ) : (
          /* Not member — show "Contact Leader" CTA (Phase 1 — join flow deferred) */
          ministry.leader ? (
            <Pressable
              onPress={handleContactLeader}
              className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4 flex-row items-center gap-3"
            >
              <View className="w-10 h-10 rounded-xl bg-green-50 items-center justify-center">
                <MessageCircle size={20} color="#16A34A" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-neutral-900">
                  {t('ministry.contact_leader_title')}
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  {t('ministry.contact_leader_sub')}
                </Text>
              </View>
            </Pressable>
          ) : null
        )}

        {/* Members list */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('ministry.members_section', { count: sortedMembers.length })}
        </Text>
        {sortedMembers.length === 0 ? (
          <View className="bg-white rounded-2xl p-5 border border-neutral-100 items-center">
            <Text className="text-sm text-neutral-500 text-center">
              {t('ministry.members_empty')}
            </Text>
          </View>
        ) : (
          <View className="bg-white rounded-2xl border border-neutral-100">
            {sortedMembers.map((m, idx) => {
              const isLeader = ministry.leader?.jemaat.id === m.jemaat.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => router.push(`/jemaat/${m.jemaat.id}` as never)}
                  className={`p-3 flex-row items-center gap-3 ${
                    idx > 0 ? 'border-t border-neutral-100' : ''
                  }`}
                >
                  <Avatar
                    name={m.jemaat.namaLengkap}
                    fotoUrl={m.jemaat.fotoUrl ?? undefined}
                    size={40}
                  />
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-semibold text-neutral-900 flex-1" numberOfLines={1}>
                        {m.jemaat.namaLengkap}
                      </Text>
                      {isLeader ? (
                        <View className="bg-brand-100 px-1.5 py-0.5 rounded">
                          <Text className="text-[9px] font-bold text-brand-700">
                            {t('ministry.leader_badge')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {m.posisi ? (
                      <Text className="text-xs text-neutral-500 mt-0.5">
                        {m.posisi}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Join info (Phase 1 — manual via WA leader) */}
        {!ministry.myMembership && ministry.isOpen ? (
          <View className="bg-amber-50 rounded-2xl p-3 border border-amber-100 mt-4">
            <Text className="text-xs text-amber-800 leading-relaxed">
              {t('ministry.join_via_wa_notice')}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
