/**
 * Popup self check-in: "Apakah Anda sudah berada di ruang ibadah?"
 * + pilih siapa saja yang di-check-in (saya & keluarga).
 * Tombol: "Tidak" (tutup) dan "Ya, saya di lokasi ibadah".
 */
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle2, LocateFixed, MapPin, UserPlus } from 'lucide-react-native';
import { formatRadius } from '@/utils/selfCheckinLocation';
import { AddTamuModal } from '@/components/tamu/AddTamuModal';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { SelfCheckinMember } from '@/api/ibadah';

export function SelfCheckinModal({
  visible,
  status,
  question,
  subtitle,
  confirmLabel,
  loading,
  onClose,
  onConfirm,
  onGuestAdded,
}: {
  visible: boolean;
  status:
    | {
        members: SelfCheckinMember[];
        ibadah?: { nama: string; jamMulai: string; jamSelesai: string; lokasi: string | null };
        venue?: { requiresLocation: boolean; radiusM: number | null };
      }
    | undefined;
  /** Default: "Apakah Anda sudah berada di ruang ibadah?" */
  question?: string;
  /** Default: nama · jam · lokasi ibadah */
  subtitle?: string;
  /** Default: "Ya, saya di lokasi ibadah" */
  confirmLabel?: string;
  loading?: boolean;
  /** Kalau diisi: tampil "+ Tambah tamu" (teman non-anggota). Dipanggil setelah tamu ditambahkan. */
  onGuestAdded?: (guestId: string) => void;
  onClose: () => void;
  onConfirm: (jemaatIds: string[]) => void;
}) {
  const { t } = useTranslation();
  const members = status?.members ?? [];
  const [selected, setSelected] = useState<string[]>([]);

  // Default: diri sendiri tercentang (kalau belum check-in).
  useEffect(() => {
    if (!visible) return;
    const self = members.find((m) => m.isSelf && m.status !== 'JOIN' && !m.disabledReason);
    setSelected(self ? [self.id] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const pending = members.filter((m) => m.status !== 'JOIN' && !m.disabledReason);
  const sub =
    subtitle ??
    (status?.ibadah
      ? `${status.ibadah.nama} · ${status.ibadah.jamMulai}–${status.ibadah.jamSelesai}${status.ibadah.lokasi ? ` · ${status.ibadah.lokasi}` : ''}`
      : '');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-white rounded-3xl p-5 w-full max-w-md" style={{ maxHeight: '85%' }}>
          <View className="w-12 h-12 rounded-2xl bg-brand-50 items-center justify-center self-center mb-3">
            <MapPin size={24} color="#EA580C" />
          </View>
          <Text className="text-lg font-bold text-neutral-900 text-center">
            {question ?? t('ibadah.self_checkin_question')}
          </Text>
          {sub ? <Text className="text-xs text-neutral-500 text-center mt-1">{sub}</Text> : null}
          {status?.venue?.requiresLocation && status.venue.radiusM ? (
            <View className="flex-row items-center justify-center gap-1.5 mt-2 bg-blue-50 rounded-full px-3 py-1 self-center">
              <LocateFixed size={12} color="#1D4ED8" />
              <Text className="text-[11px] text-blue-800">
                {t('selfcheckin_geo.radius_note', { radius: formatRadius(status.venue.radiusM) })}
              </Text>
            </View>
          ) : null}

          {members.length > 1 ? (
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-4 mb-2">
              {t('ibadah.self_checkin_who')}
            </Text>
          ) : null}
          <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 8, paddingTop: members.length > 1 ? 0 : 12 }}>
            {members.map((m) => {
              const done = m.status === 'JOIN';
              const blocked = !done && !!m.disabledReason;
              const on = selected.includes(m.id);
              return (
                <Pressable
                  key={m.id}
                  disabled={done || blocked}
                  onPress={() => toggle(m.id)}
                  className={`flex-row items-center gap-3 p-3 rounded-2xl border ${
                    done
                      ? 'bg-green-50 border-green-100'
                      : blocked
                        ? 'bg-neutral-50 border-neutral-200 opacity-60'
                        : on
                          ? 'bg-brand-50 border-brand-300'
                          : 'bg-white border-neutral-200'
                  }`}
                >
                  <Avatar name={m.namaLengkap} fotoUrl={m.fotoUrl} size={36} />
                  <View className="flex-1 min-w-0">
                    <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                      {m.namaLengkap}
                      {m.isSelf ? ` (${t('ibadah.self_checkin_me')})` : ''}
                    </Text>
                    <Text
                      className={`text-xs ${done ? 'text-green-700' : blocked ? 'text-amber-700' : 'text-neutral-500'}`}
                      numberOfLines={1}
                    >
                      {done ? t('ibadah.self_checkin_done') : blocked ? m.disabledReason : (m.relasi ?? '')}
                    </Text>
                  </View>
                  {done ? (
                    <CheckCircle2 size={20} color="#16A34A" />
                  ) : blocked ? null : (
                    <View
                      className={`w-6 h-6 rounded-md border-2 items-center justify-center ${
                        on ? 'bg-brand-500 border-brand-500' : 'border-neutral-300'
                      }`}
                    >
                      {on ? <Check size={14} color="#fff" /> : null}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {onGuestAdded ? (
            <Pressable
              onPress={() => setAddGuestOpen(true)}
              className="flex-row items-center justify-center gap-1.5 py-2.5 mt-2 rounded-xl border border-dashed border-violet-300 bg-violet-50"
            >
              <UserPlus size={15} color="#7C3AED" />
              <Text className="text-sm font-semibold text-violet-700">{t('tamu.add_btn_long')}</Text>
            </Pressable>
          ) : null}

          {pending.length === 0 ? (
            <Text className="text-sm text-green-700 text-center mt-3">{t('ibadah.self_checkin_all_done')}</Text>
          ) : null}

          {/* Tombol bertumpuk (lebar penuh) supaya label panjang tidak terpotong / berantakan. */}
          <View className="gap-2 mt-5">
            <Button
              label={confirmLabel ?? t('ibadah.self_checkin_yes')}
              loading={loading}
              disabled={selected.length === 0}
              onPress={() => onConfirm(selected)}
              leftIcon={<MapPin size={16} color="#fff" />}
              fullWidth
              singleLine
              size="lg"
            />
            <Button label={t('ibadah.self_checkin_no')} variant="ghost" onPress={onClose} fullWidth singleLine />
          </View>
        </View>
      </View>
      {onGuestAdded ? (
        <AddTamuModal
          visible={addGuestOpen}
          onClose={() => setAddGuestOpen(false)}
          onAdded={(g) => {
            setAddGuestOpen(false);
            setSelected((s) => (s.includes(g.id) ? s : [...s, g.id]));
            onGuestAdded(g.id);
          }}
        />
      ) : null}
    </Modal>
  );
}
