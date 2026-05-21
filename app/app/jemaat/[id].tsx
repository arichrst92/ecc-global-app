/**
 * Jemaat view-only profile page — diakses dari homecell member list,
 * scanner result, area page, dll.
 *
 * BE endpoint `/admin/jemaat/:id` (dengan role + ministry + family) belum
 * tersedia — pending request di docs/backend-request-jemaat-public-profile.md.
 * Untuk sementara, halaman ini lookup dari cached data:
 * - HomecellDetail.members[] (kalau dibuka dari homecell)
 * - FamilyRelation[] (kalau dependent / linked family)
 *
 * Kalau tidak ketemu di cache, tampilkan placeholder "Detail jemaat ini
 * belum tersedia — hubungi pengurus cabang".
 */
import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, MessageCircle } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { useMyFamily } from '@/hooks/useFamily';
import type { HomecellDetail } from '@/types/homecell';
import type { FamilyRelation } from '@/types/family';

type ResolvedJemaat = {
  id: string;
  namaLengkap: string;
  kode?: string | null;
  noHp?: string | null;
  fotoUrl?: string | null;
  cabang?: { id: string; nama: string } | null;
  source: 'family' | 'homecell' | 'unknown';
};

export default function JemaatViewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const familyQuery = useMyFamily();

  const resolved = useMemo<ResolvedJemaat | null>(() => {
    if (!id) return null;

    // 1. Cek family relations
    const familyMatch = (familyQuery.data ?? []).find(
      (r: FamilyRelation) => r.jemaat.id === id,
    );
    if (familyMatch) {
      return {
        id: familyMatch.jemaat.id,
        namaLengkap: familyMatch.jemaat.namaLengkap,
        kode: familyMatch.jemaat.kode,
        noHp: familyMatch.jemaat.noHp,
        fotoUrl: familyMatch.jemaat.fotoUrl,
        cabang: familyMatch.jemaat.cabang,
        source: 'family',
      };
    }

    // 2. Cek semua HomecellDetail di react-query cache
    const cached = qc.getQueriesData<HomecellDetail>({
      queryKey: ['homecell', 'detail'],
    });
    for (const [, data] of cached) {
      if (!data) continue;
      const m = data.members.find((mem) => (mem.jemaat.id ?? mem.jemaatId) === id);
      if (m) {
        return {
          id,
          namaLengkap: m.jemaat.namaLengkap,
          kode: m.jemaat.kode,
          noHp: m.jemaat.noHp,
          fotoUrl: m.jemaat.fotoUrl,
          cabang: null,
          source: 'homecell',
        };
      }
    }

    return null;
  }, [id, familyQuery.data, qc]);

  function openWhatsApp() {
    if (!resolved?.noHp) return;
    const num = resolved.noHp.replace(/^\+/, '');
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
          {resolved ? (
            <View className="items-center pb-6 pt-2">
              <Avatar
                name={resolved.namaLengkap}
                fotoUrl={resolved.fotoUrl ?? undefined}
                size={80}
                className="bg-white/20"
              />
              <Text className="text-white text-xl font-bold mt-3">
                {resolved.namaLengkap}
              </Text>
              {resolved.kode ? (
                <Text className="text-white/80 text-xs mt-0.5 font-mono tracking-widest">
                  {resolved.kode}
                </Text>
              ) : null}
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
        {!resolved ? (
          <View className="bg-white rounded-2xl p-5 border border-neutral-100 items-center">
            <Text className="text-sm text-neutral-700 text-center leading-relaxed">
              {t('jemaat.not_in_cache')}
            </Text>
          </View>
        ) : (
          <>
            {/* Cabang */}
            {resolved.cabang ? (
              <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3 flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
                  <MapPin size={18} color="#EA580C" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-neutral-500">
                    {t('jemaat.branch_label')}
                  </Text>
                  <Text className="text-sm font-semibold text-neutral-900">
                    {resolved.cabang.nama}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* WhatsApp */}
            {resolved.noHp ? (
              <Pressable
                onPress={openWhatsApp}
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

            {/* Notice: BE endpoint belum siap */}
            <View className="bg-amber-50 rounded-2xl p-3 border border-amber-100 mt-2">
              <Text className="text-xs text-amber-800 leading-relaxed">
                {t('jemaat.be_pending_notice')}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
