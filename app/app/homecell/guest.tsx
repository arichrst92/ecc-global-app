/**
 * Cari homecell — MODE TAMU (tanpa akun).
 *
 * - Pilih cabang → daftar homecell (+ jarak kalau lokasi diizinkan) dan
 *   "Cari homecell terdekat".
 * - Ketuk homecell → info + form "Minta bergabung sebagai tamu"
 *   (nama, no HP, jenis kelamin, usia, pesan). PIC homecell menyetujui.
 * - Status permintaan disimpan di perangkat (token); alamat lengkap, link
 *   Maps & kontak pemimpin muncul setelah DITERIMA.
 */
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Hourglass,
  Locate,
  Lock,
  MapPin,
  MessageCircle,
  Navigation,
  Search,
  Users,
  X,
  XCircle,
} from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Picker } from '@/components/ui/Picker';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useToast } from '@/components/ui/Toast';
import { HomecellListCard, SegmenBadges, jadwalLabel } from '@/components/homecell/HomecellListCard';
import { NearestHomecellModal } from '@/components/homecell/NearestHomecellModal';
import { useBranches } from '@/hooks/useBranches';
import { useDebounce } from '@/hooks/useDebounce';
import {
  browsePublicHomecells,
  cancelGuestRequest,
  createGuestRequest,
  guestRequestStatus,
  nearestPublicHomecells,
  toListItem,
  type GuestRequest,
  type PublicHomecellItem,
} from '@/api/publicHomecell';
import { useGuestHomecellStore } from '@/stores/guestHomecell.store';
import { getCurrentCoords, LocationError, type Coords } from '@/utils/location';
import { invalidPhoneMessage, normalizePhone } from '@/utils/phone';
import { ApiError } from '@/types/api';
import type { HomecellNearestResponse } from '@/types/homecell';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

export default function GuestHomecellScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const qc = useQueryClient();

  // ---- cabang
  const branchesQuery = useBranches();
  const [cabangId, setCabangId] = useState('');
  const effectiveCabangId = cabangId || branchesQuery.data?.[0]?.id || '';
  const branchOptions = (branchesQuery.data ?? []).map((b) => ({ value: b.id, label: b.nama, sub: b.alamat }));

  // ---- permintaan saya (token di perangkat)
  const tokens = useGuestHomecellStore((s) => s.items);
  const removeToken = useGuestHomecellStore((s) => s.remove);
  const addToken = useGuestHomecellStore((s) => s.add);
  const statusQuery = useQuery({
    queryKey: ['guest-homecell', 'status', tokens.map((x) => x.token)],
    queryFn: () => guestRequestStatus(tokens.map((x) => x.token)),
    enabled: tokens.length > 0,
  });
  const myRequests = useMemo(
    () =>
      (statusQuery.data ?? [])
        .map((r) => ({ token: r.token, req: r.request }))
        .filter((x): x is { token: string; req: GuestRequest } => !!x.req && x.req.status !== 'CANCELLED'),
    [statusQuery.data],
  );
  const pendingIds = new Set(myRequests.filter((r) => r.req.status === 'PENDING').map((r) => r.req.homecell.id));
  const hasPending = pendingIds.size > 0;

  // ---- daftar
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState<'SINGLE' | 'COUPLE' | null>(null);
  const q = useDebounce(search.trim(), 300);
  const [coords, setCoords] = useState<Coords | null>(null);
  const browse = useQuery({
    queryKey: ['guest-homecell', 'browse', effectiveCabangId, q, kategori, coords?.lat, coords?.lng],
    queryFn: () => browsePublicHomecells({ cabangId: effectiveCabangId, q, kategori, lat: coords?.lat, lng: coords?.lng }),
    enabled: !!effectiveCabangId,
  });

  // ---- terdekat
  const [locating, setLocating] = useState(false);
  const [nearest, setNearest] = useState<{ raw: PublicHomecellItem[]; data: HomecellNearestResponse } | null>(null);
  const [nearestOpen, setNearestOpen] = useState(false);
  async function findNearest() {
    if (!effectiveCabangId) return;
    setLocating(true);
    try {
      const c = await getCurrentCoords();
      setCoords(c);
      const res = await nearestPublicHomecells({ cabangId: effectiveCabangId, lat: c.lat, lng: c.lng, limit: 3 });
      setNearest({
        raw: res.items,
        data: { ...res, items: res.items.map((h) => toListItem(h, pendingIds.has(h.id))) },
      });
      setNearestOpen(true);
    } catch (e) {
      if (e instanceof LocationError) showToast(e.reason === 'DENIED' ? t('hcj.loc_denied') : t('hcj.loc_unavailable'), 'error');
      else showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error');
    } finally {
      setLocating(false);
    }
  }

  // ---- sheet detail + form
  const [selected, setSelected] = useState<PublicHomecellItem | null>(null);
  const openById = (id: string) => {
    const h = nearest?.raw.find((x) => x.id === id) ?? (browse.data ?? []).find((x) => x.id === id);
    if (!h) return;
    if (nearestOpen) {
      // Tutup popup terdekat dulu — dua Modal berganti bersamaan bisa macet di iOS.
      setNearestOpen(false);
      setTimeout(() => setSelected(h), 350);
    } else {
      setSelected(h);
    }
  };

  const cancelMut = useMutation({
    mutationFn: (token: string) => cancelGuestRequest(token),
    onSuccess: (_d, token) => {
      removeToken(token);
      showToast(t('hcg.cancelled'), 'success');
    },
    onError: (e) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error'),
  });

  function refresh() {
    void browse.refetch();
    if (tokens.length) void statusQuery.refetch();
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">{t('hcg.title')}</Text>
            <Text className="text-xs text-neutral-500">{t('hcg.subtitle')}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={browse.isRefetching || statusQuery.isRefetching} onRefresh={refresh} tintColor="#F97316" />}
      >
        {/* Permintaan saya */}
        {myRequests.length > 0 ? (
          <View className="mb-5 gap-2">
            <SectionTitle text={t('hcg.my_requests')} />
            {myRequests.map(({ token, req }) => (
              <RequestCard
                key={token}
                req={req}
                cancelling={cancelMut.isPending && cancelMut.variables === token}
                onCancel={() =>
                  Alert.alert(t('hcj.cancel_request'), t('hcj.cancel_confirm', { name: req.homecell.nama }), [
                    { text: t('common.back'), style: 'cancel' },
                    { text: t('hcj.cancel_request'), style: 'destructive', onPress: () => cancelMut.mutate(token) },
                  ])
                }
                onDismiss={() => removeToken(token)}
              />
            ))}
          </View>
        ) : null}

        <Text className="text-sm text-neutral-600 mb-3">{t('hcg.intro')}</Text>

        <View className="bg-card rounded-2xl p-3 border border-neutral-100 mb-3">
          <Picker
            label={t('signup.branch')}
            placeholder={branchesQuery.isPending ? t('common.loading') : t('signup.branch_placeholder')}
            value={effectiveCabangId}
            options={branchOptions}
            onChange={(v) => {
              setCabangId(v);
              setNearest(null);
            }}
            modalTitle={t('signup.branch_modal_title')}
          />
        </View>

        <Button
          label={locating ? t('hcj.locating') : t('hcj.nearest_btn')}
          loading={locating}
          disabled={!effectiveCabangId}
          onPress={findNearest}
          leftIcon={<Locate size={18} color="#fff" />}
        />

        <View className="flex-row items-center bg-card border border-neutral-200 rounded-xl px-3 mt-5 mb-3">
          <Search size={16} color={nc('#A3A3A3')} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('hcg.search_placeholder')}
            placeholderTextColor={nc('#A3A3A3')}
            className="flex-1 px-2 py-3 text-sm text-neutral-900"
          />
        </View>
        <View className="flex-row gap-2 mb-3">
          {([null, 'SINGLE', 'COUPLE'] as const).map((k) => {
            const on = kategori === k;
            return (
              <Pressable
                key={k ?? 'all'}
                onPress={() => setKategori(k)}
                className={`px-3 py-1.5 rounded-full border ${on ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'}`}
              >
                <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-neutral-700'}`}>
                  {k === null ? t('hcj.kategori_all') : k === 'SINGLE' ? t('hcj.kategori_single') : t('hcj.kategori_couple')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {browse.isPending && !!effectiveCabangId ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : (browse.data ?? []).length === 0 ? (
          <View className="items-center py-10 px-6">
            <MapPin size={28} color={nc('#A3A3A3')} />
            <Text className="text-sm text-neutral-500 text-center mt-2">{t('hcj.list_empty')}</Text>
          </View>
        ) : (
          <View className="gap-2">
            {(browse.data ?? []).map((h) => (
              <HomecellListCard key={h.id} item={toListItem(h, pendingIds.has(h.id))} onPress={() => setSelected(h)} />
            ))}
          </View>
        )}
      </ScrollView>

      <NearestHomecellModal
        visible={nearestOpen}
        data={nearest?.data ?? null}
        joiningId={null}
        hasPending={hasPending}
        onClose={() => setNearestOpen(false)}
        onDetail={openById}
        onJoin={openById}
      />

      <JoinSheet
        homecell={selected}
        pendingHere={!!selected && pendingIds.has(selected.id)}
        pendingElsewhere={hasPending && !!selected && !pendingIds.has(selected.id)}
        onClose={() => setSelected(null)}
        onSent={(token, req) => {
          addToken({ token, homecellId: req.homecell.id, homecellNama: req.homecell.nama, createdAt: Date.now() });
          void qc.invalidateQueries({ queryKey: ['guest-homecell', 'status'] });
          setSelected(null);
          showToast(t('hcg.sent', { name: req.homecell.nama }), 'success');
        }}
      />
    </View>
  );
}

function SectionTitle({ text }: { text: string }) {
  return <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{text}</Text>;
}

function RequestCard({
  req,
  cancelling,
  onCancel,
  onDismiss,
}: {
  req: GuestRequest;
  cancelling: boolean;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const h = req.homecell;
  const jadwal = jadwalLabel(h);

  if (req.status === 'PENDING') {
    return (
      <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <View className="flex-row items-center gap-3">
          <Hourglass size={18} color={nc('#B45309')} />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-amber-900">{t('hcg.pending', { name: h.nama })}</Text>
            <Text className="text-xs text-amber-800 mt-0.5">{t('hcg.pending_sub')}</Text>
          </View>
        </View>
        <Pressable onPress={onCancel} disabled={cancelling} className="self-end mt-2" hitSlop={8}>
          <Text className="text-xs font-semibold text-red-600">{cancelling ? t('common.loading') : t('hcj.cancel_request')}</Text>
        </Pressable>
      </View>
    );
  }

  if (req.status === 'REJECTED') {
    return (
      <View className="bg-card border border-neutral-200 rounded-2xl p-4">
        <View className="flex-row items-start gap-3">
          <XCircle size={18} color={nc('#737373')} />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-neutral-800">{t('hcg.rejected', { name: h.nama })}</Text>
            {req.rejectReason ? <Text className="text-xs text-neutral-600 mt-1">“{req.rejectReason}”</Text> : null}
            <Text className="text-xs text-neutral-500 mt-1">{t('hcg.rejected_sub')}</Text>
          </View>
          <Pressable onPress={onDismiss} hitSlop={10}>
            <X size={16} color={nc('#A3A3A3')} />
          </Pressable>
        </View>
      </View>
    );
  }

  // APPROVED — detail lokasi & kontak pemimpin terbuka.
  const mapsLink =
    h.mapsUrl || (h.latitude != null && h.longitude != null ? `https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}` : null);
  return (
    <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
      <View className="flex-row items-center gap-3">
        <CheckCircle2 size={20} color="#059669" />
        <View className="flex-1">
          <Text className="text-sm font-bold text-emerald-900">{t('hcg.approved', { name: h.nama })}</Text>
          <Text className="text-xs text-emerald-800 mt-0.5">
            {h.area} · {h.cabang}
          </Text>
        </View>
      </View>
      <View className="mt-3 gap-1.5">
        {jadwal ? (
          <View className="flex-row items-center gap-2">
            <Clock size={13} color="#047857" />
            <Text className="text-sm text-emerald-900">{jadwal}</Text>
          </View>
        ) : null}
        {h.alamat ? (
          <View className="flex-row items-start gap-2">
            <MapPin size={13} color="#047857" style={{ marginTop: 2 }} />
            <Text className="text-sm text-emerald-900 flex-1">{h.alamat}</Text>
          </View>
        ) : null}
        {h.pic ? <Text className="text-sm text-emerald-900">{t('hcj.leader', { name: h.pic.nama })}</Text> : null}
      </View>
      <View className="flex-row gap-2 mt-3">
        {mapsLink ? (
          <Pressable
            onPress={() => Linking.openURL(mapsLink).catch(() => {})}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-card border border-emerald-200"
          >
            <Navigation size={14} color="#047857" />
            <Text className="text-xs font-bold text-emerald-800">{t('hcg.open_maps')}</Text>
          </Pressable>
        ) : null}
        {h.pic?.noHp ? (
          <Pressable
            onPress={() => Linking.openURL(`https://wa.me/${h.pic!.noHp!.replace(/^\+/, '')}`).catch(() => {})}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600"
          >
            <MessageCircle size={14} color="#fff" />
            <Text className="text-xs font-bold text-white">{t('hcg.chat_leader')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function JoinSheet({
  homecell,
  pendingHere,
  pendingElsewhere,
  onClose,
  onSent,
}: {
  homecell: PublicHomecellItem | null;
  pendingHere: boolean;
  pendingElsewhere: boolean;
  onClose: () => void;
  onSent: (token: string, req: GuestRequest) => void;
}) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [jk, setJk] = useState<'L' | 'P' | null>(null);
  const [usia, setUsia] = useState('');
  const [pesan, setPesan] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const e164 = normalizePhone(noHp);
  const usiaNum = usia.trim() ? Number(usia) : undefined;
  const usiaValid = usiaNum === undefined || (Number.isInteger(usiaNum) && usiaNum >= 5 && usiaNum <= 110);
  const phoneErr = noHp.trim() && !e164 ? invalidPhoneMessage(noHp, i18n.language === 'en' ? 'en' : 'id') : undefined;

  const mut = useMutation({
    mutationFn: () =>
      createGuestRequest(homecell!.id, {
        nama: nama.trim(),
        noHp: e164!,
        jenisKelamin: jk ?? undefined,
        usia: usiaNum,
        pesan: pesan.trim() || undefined,
      }),
    onSuccess: (d) => {
      setPesan('');
      setErr(null);
      onSent(d.token, d.request);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : t('error.generic')),
  });

  const h = homecell;
  const jadwal = h ? jadwalLabel(h) : null;
  const canSubmit = nama.trim().length >= 2 && !!e164 && usiaValid && !pendingHere && !pendingElsewhere;

  return (
    <Modal visible={!!h} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-black/50 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-card rounded-t-3xl" style={{ maxHeight: '90%' }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 10 }}
          >
            {h ? (
              <>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-neutral-900">{h.nama}</Text>
                    <Text className="text-xs text-neutral-500 mt-0.5">
                      {h.area.nama} · {h.area.cabang.nama}
                    </Text>
                    <SegmenBadges kategori={h.kategori} usiaMin={h.usiaMin} usiaMax={h.usiaMax} />
                  </View>
                  <Pressable onPress={onClose} hitSlop={10} className="w-9 h-9 rounded-full bg-neutral-100 items-center justify-center">
                    <X size={18} color={nc('#525252')} />
                  </Pressable>
                </View>
                <View className="gap-1.5">
                  {jadwal ? (
                    <View className="flex-row items-center gap-2">
                      <Clock size={13} color={nc('#737373')} />
                      <Text className="text-sm text-neutral-700">{jadwal}</Text>
                    </View>
                  ) : null}
                  {h.distanceKm != null ? (
                    <View className="flex-row items-center gap-2">
                      <Navigation size={13} color="#2563EB" />
                      <Text className="text-sm text-blue-700">{t('hcj.km', { km: h.distanceKm.toLocaleString('id-ID') })}</Text>
                    </View>
                  ) : null}
                  <View className="flex-row items-center gap-2">
                    <Users size={13} color="#EA580C" />
                    <Text className="text-sm text-neutral-700">{t('hcj.members', { count: h.memberCount })}</Text>
                  </View>
                  {h.deskripsi ? <Text className="text-sm text-neutral-600 mt-1">{h.deskripsi}</Text> : null}
                </View>
                <View className="flex-row items-start gap-2 bg-neutral-50 rounded-xl p-3">
                  <Lock size={13} color={nc('#737373')} style={{ marginTop: 2 }} />
                  <Text className="text-xs text-neutral-600 flex-1 leading-5">{t('hcg.privacy_note')}</Text>
                </View>

                {pendingHere ? (
                  <View className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <Text className="text-sm text-amber-900">{t('hcg.pending_here')}</Text>
                  </View>
                ) : pendingElsewhere ? (
                  <View className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <Text className="text-sm text-amber-900">{t('hcg.pending_elsewhere')}</Text>
                  </View>
                ) : (
                  <>
                    <Text className="text-base font-bold text-neutral-900 mt-2">{t('hcg.form_title')}</Text>
                    <Text className="text-sm font-semibold text-neutral-800">{t('tamu.nama')}</Text>
                    <TextInput
                      value={nama}
                      onChangeText={(v) => {
                        setNama(v);
                        setErr(null);
                      }}
                      placeholder={t('hcg.nama_ph')}
                      placeholderTextColor={nc('#A3A3A3')}
                      maxLength={255}
                      className="bg-neutral-50 rounded-xl px-3 py-3 text-sm text-neutral-900 border border-neutral-200"
                    />
                    <PhoneInput
                      label={t('tamu.no_hp')}
                      value={noHp}
                      onChangeText={(v) => {
                        setNoHp(v);
                        setErr(null);
                      }}
                      error={phoneErr}
                    />
                    <View className="flex-row gap-3">
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-neutral-800 mb-1.5">{t('hcg.gender')}</Text>
                        <View className="flex-row gap-2">
                          {(['L', 'P'] as const).map((g) => {
                            const on = jk === g;
                            return (
                              <Pressable
                                key={g}
                                onPress={() => setJk(on ? null : g)}
                                className={`flex-1 py-2.5 rounded-xl border items-center ${on ? 'bg-brand-500 border-brand-500' : 'bg-neutral-50 border-neutral-200'}`}
                              >
                                <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-neutral-700'}`}>
                                  {g === 'L' ? t('hcg.male') : t('hcg.female')}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                      <View style={{ width: 96 }}>
                        <Text className="text-sm font-semibold text-neutral-800 mb-1.5">{t('hcg.age')}</Text>
                        <TextInput
                          value={usia}
                          onChangeText={(v) => setUsia(v.replace(/\D/g, '').slice(0, 3))}
                          keyboardType="number-pad"
                          placeholder="25"
                          placeholderTextColor={nc('#A3A3A3')}
                          className={`bg-neutral-50 rounded-xl px-3 py-2.5 text-sm text-neutral-900 border ${usiaValid ? 'border-neutral-200' : 'border-red-400'}`}
                        />
                      </View>
                    </View>
                    <TextInput
                      value={pesan}
                      onChangeText={setPesan}
                      placeholder={t('hcg.pesan_ph')}
                      placeholderTextColor={nc('#A3A3A3')}
                      maxLength={500}
                      multiline
                      className="bg-neutral-50 rounded-xl px-3 py-3 text-sm text-neutral-900 border border-neutral-200"
                      style={{ minHeight: 64, textAlignVertical: 'top' }}
                    />
                    {err ? <Text className="text-xs text-red-600">{err}</Text> : null}
                    <Button label={t('hcg.submit')} loading={mut.isPending} disabled={!canSubmit} onPress={() => mut.mutate()} />
                    <Text className="text-[11px] text-neutral-400 text-center">{t('hcg.submit_note')}</Text>
                  </>
                )}
              </>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
