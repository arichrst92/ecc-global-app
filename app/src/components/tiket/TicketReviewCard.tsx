/**
 * Kartu "Beri ulasan" di bawah tiket — terbuka saat ibadah/event sudah dimulai
 * sampai 14 hari setelah selesai. Rating 1–5 bintang + komentar opsional +
 * opsi anonim. Hanya untuk tiket milik sendiri.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MessageSquareHeart, Star } from 'lucide-react-native';

import { getReviewState, saveReview, type ReviewKind } from '@/api/review';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/types/api';
import { nc } from '@/theme/ThemeRoot';

export function TicketReviewCard({ kind, ticketId }: { kind: ReviewKind; ticketId: string }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const key = ['ticket-review', kind, ticketId];
  const q = useQuery({ queryKey: key, queryFn: () => getReviewState(kind, ticketId), staleTime: 60_000 });

  const [rating, setRating] = useState(0);
  const [komentar, setKomentar] = useState('');
  const [anonim, setAnonim] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const r = q.data?.review;
    if (r) {
      setRating(r.rating);
      setKomentar(r.komentar ?? '');
      setAnonim(r.isAnonim);
    }
  }, [q.data?.review]);

  const m = useMutation({
    mutationFn: () => saveReview({ kind, ticketId, rating, komentar: komentar.trim() || null, isAnonim: anonim }),
    onSuccess: (data) => {
      qc.setQueryData(key, data);
      setEditing(false);
      showToast(t('review.thanks'), 'success');
    },
    onError: (err) => showToast(err instanceof ApiError ? err.message : t('error.network'), 'error'),
  });

  const d = q.data;
  if (q.isLoading || !d) return null;
  const w = d.window;
  if (w.reason === 'NOT_OWNER' || w.reason === 'CANCELLED') return null;
  if (!w.open && !d.review) {
    if (w.reason !== 'NOT_STARTED') return null;
    const at = new Date(w.startsAt).toLocaleString(i18n.language?.startsWith('en') ? 'en-GB' : 'id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return (
      <View className="mt-3 rounded-xl px-4 py-3 flex-row items-center gap-2" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
        <MessageSquareHeart size={16} color="#fff" />
        <Text className="text-white text-xs flex-1">{t('review.opens_at', { at })}</Text>
      </View>
    );
  }

  const readOnly = !w.open || (!!d.review && !editing);
  const closes = new Date(w.closesAt).toLocaleDateString(i18n.language?.startsWith('en') ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'short' });

  return (
    <View className="mt-3 bg-card rounded-2xl p-4">
      <View className="flex-row items-center gap-2 mb-1">
        <MessageSquareHeart size={18} color="#EA580C" />
        <Text className="text-sm font-bold text-neutral-900 flex-1">
          {d.review ? t('review.your_review') : t(kind === 'EVENT' ? 'review.title_event' : 'review.title_ibadah')}
        </Text>
      </View>
      {!d.review ? <Text className="text-xs text-neutral-500 mb-2">{t('review.subtitle')}</Text> : null}

      <View className="flex-row gap-1.5 my-2 justify-center">
        {[1, 2, 3, 4, 5].map((k) => (
          <Pressable key={k} disabled={readOnly} onPress={() => setRating(k)} hitSlop={6} accessibilityLabel={`${k}`}>
            <Star size={32} color={k <= rating ? '#F59E0B' : nc('#D4D4D4')} fill={k <= rating ? '#F59E0B' : 'transparent'} />
          </Pressable>
        ))}
      </View>
      {rating ? <Text className="text-center text-xs font-semibold text-amber-600 mb-2">{t(`review.label_${rating}`)}</Text> : null}

      {readOnly ? (
        <>
          {komentar ? <Text className="text-sm text-neutral-700 mt-1">“{komentar}”</Text> : null}
          {anonim ? <Text className="text-[11px] text-neutral-400 mt-1">{t('review.sent_anonymous')}</Text> : null}
          {w.open ? (
            <Pressable onPress={() => setEditing(true)} className="mt-3 self-start">
              <Text className="text-xs font-bold text-brand-600">{t('review.edit', { date: closes })}</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
          <TextInput
            value={komentar}
            onChangeText={setKomentar}
            placeholder={t('review.placeholder')}
            placeholderTextColor={nc('#A3A3A3')}
            multiline
            maxLength={1000}
            className="border border-neutral-200 rounded-xl px-3 py-2 text-sm text-neutral-900 min-h-[72px]"
            style={{ textAlignVertical: 'top' }}
          />
          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-xs text-neutral-600 flex-1">{t('review.anonymous')}</Text>
            <Switch value={anonim} onValueChange={setAnonim} trackColor={{ true: '#F97316' }} />
          </View>
          <Pressable
            disabled={!rating || m.isPending}
            onPress={() => m.mutate()}
            className={`mt-3 rounded-xl py-3 items-center ${rating ? 'bg-brand-500' : 'bg-neutral-200'}`}
          >
            {m.isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-sm font-bold">{d.review ? t('review.update') : t('review.submit')}</Text>}
          </Pressable>
          <Text className="text-[11px] text-neutral-400 mt-2 text-center">{t('review.until', { date: closes })}</Text>
        </>
      )}
    </View>
  );
}
