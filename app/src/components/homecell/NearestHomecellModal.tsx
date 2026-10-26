/**
 * Popup rekomendasi "Cari homecell terdekat" — kartu detail + aksi
 * Lihat detail / Minta bergabung.
 */
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Clock, MapPin, Navigation, User, Users, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { StatusBadge, jadwalLabel } from '@/components/homecell/HomecellListCard';
import type { HomecellNearestResponse } from '@/types/homecell';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

type Props = {
  visible: boolean;
  data: HomecellNearestResponse | null;
  /** Sedang mengirim request join (homecellId) */
  joiningId: string | null;
  /** User sudah punya permintaan pending → tombol join disembunyikan */
  hasPending: boolean;
  onClose: () => void;
  onDetail: (homecellId: string) => void;
  onJoin: (homecellId: string) => void;
};

export function NearestHomecellModal({ visible, data, joiningId, hasPending, onClose, onDetail, onJoin }: Props) {
  const { t } = useTranslation();
  const items = data?.items ?? [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View className="bg-neutral-50 rounded-t-3xl" style={{ maxHeight: '85%' }}>
        <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
          <View>
            <Text className="text-lg font-bold text-neutral-900">{t('hcj.nearest_title')}</Text>
            <Text className="text-xs text-neutral-500">{t('hcj.nearest_sub')}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} className="w-9 h-9 rounded-full bg-card items-center justify-center">
            <X size={18} color={nc('#525252')} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 12 }}>
          {items.length === 0 ? (
            <View className="bg-card rounded-2xl p-5 border border-neutral-100">
              <Text className="text-sm text-neutral-600 text-center">{t('hcj.nearest_empty')}</Text>
            </View>
          ) : (
            items.map((h, i) => {
              const jadwal = jadwalLabel(h);
              return (
                <View key={h.id} className="bg-card rounded-2xl p-4 border border-neutral-100">
                  <View className="flex-row items-start gap-3">
                    <View {...gx('w-9 h-9 rounded-full bg-brand-500 items-center justify-center')}>
                      <Text className="text-white font-bold">{i + 1}</Text>
                    </View>
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-base font-bold text-neutral-900 flex-shrink" numberOfLines={1}>
                          {h.nama}
                        </Text>
                        <StatusBadge status={h.myStatus} />
                      </View>
                      <Text className="text-xs text-neutral-500 mt-0.5">
                        {h.area.nama} · {h.area.cabang.nama}
                      </Text>
                    </View>
                    {h.distanceKm != null ? (
                      <View className="flex-row items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg">
                        <Navigation size={12} color="#2563EB" />
                        <Text className="text-xs font-bold text-blue-700">
                          {t('hcj.km', { km: h.distanceKm.toLocaleString('id-ID') })}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View className="mt-3 gap-1.5">
                    {jadwal ? (
                      <Row icon={<Clock size={13} color={nc('#737373')} />} text={`${t('hcj.schedule_label')}: ${jadwal}`} />
                    ) : null}
                    {h.alamat ? <Row icon={<MapPin size={13} color={nc('#737373')} />} text={h.alamat} /> : null}
                    {h.picJemaat ? (
                      <Row icon={<User size={13} color={nc('#737373')} />} text={t('hcj.leader', { name: h.picJemaat.namaLengkap })} />
                    ) : null}
                    <Row icon={<Users size={13} color={nc('#737373')} />} text={t('hcj.members', { count: h.memberCount })} />
                    {h.deskripsi ? (
                      <Text className="text-xs text-neutral-600 mt-1" numberOfLines={3}>
                        {h.deskripsi}
                      </Text>
                    ) : null}
                  </View>

                  <View className="flex-row gap-2 mt-4">
                    <View className="flex-1">
                      <Button label={t('hcj.detail_btn')} variant="secondary" size="sm" onPress={() => onDetail(h.id)} />
                    </View>
                    {!h.myStatus && !hasPending ? (
                      <View className="flex-1">
                        <Button
                          label={t('hcj.join_btn')}
                          size="sm"
                          loading={joiningId === h.id}
                          onPress={() =>
                            Alert.alert(t('hcj.join_btn'), t('hcj.join_confirm', { name: h.nama }), [
                              { text: t('common.cancel'), style: 'cancel' },
                              { text: t('hcj.join_btn'), onPress: () => onJoin(h.id) },
                            ])
                          }
                        />
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
          {data && data.withoutLocation > 0 && items.length > 0 ? (
            <Text className="text-xs text-neutral-500 text-center">
              {t('hcj.nearest_partial', { count: data.withoutLocation })}
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="flex-row items-start gap-2">
      <View className="mt-0.5">{icon}</View>
      <Text className="text-sm text-neutral-700 flex-1">{text}</Text>
    </View>
  );
}
