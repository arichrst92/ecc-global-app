/**
 * Bible 365 — baca Alkitab dari Kejadian sampai Wahyu dalam 365 hari.
 *
 * - Belum mulai → pengantar + popup komitmen (centang komitmen + pilih jam pengingat).
 * - Berjalan → progres, 7 hari terakhir, hari tertinggal, bacaan hari terpilih
 *   (centang per pasal, ketuk untuk membaca), catatan, tandai hari selesai, bagikan.
 * - Selesai / dihentikan → ringkasan + mulai putaran baru.
 */
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  NotebookPen,
  Pencil,
  Share2,
  Trophy,
} from 'lucide-react-native';

import {
  completeBible365Day,
  getBible365,
  getBible365Day,
  markBible365Read,
  setBible365Reminder,
  startBible365,
  stopBible365,
  BIBLE365_KEY,
  type Bible365Plan,
} from '@/api/bible365';
import { cancelBible365Reminder, scheduleBible365Reminder } from '@/features/bible365/reminder';
import { ShareCardModal } from '@/features/share/ShareCardModal';
import { Bible365ShareCard } from '@/features/share/cards';
import { BIBLE_BOOK_BY_ID } from '@/data/bible-books';
import { BIBLE_VERSIONS } from '@/data/bible';
import { useBibleStore } from '@/stores/bible.store';
import { useBookNames } from '@/utils/bibleNames';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

const REMINDER_TIMES = ['05:00', '06:00', '07:00', '12:00', '20:00', '21:00'];

export default function Bible365Screen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const q = useQuery({ queryKey: BIBLE365_KEY, queryFn: getBible365 });
  const plan = q.data?.plan ?? null;
  const [commitOpen, setCommitOpen] = useState(false);

  const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : t('error.generic'));

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router, '/bible')} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">Bible 365</Text>
            <Text className="text-xs text-neutral-500">{t('b365.subtitle')}</Text>
          </View>
          {plan ? (
            <Pressable
              onPress={() => router.push('/bible365/journal' as never)}
              className="w-10 h-10 items-center justify-center"
              accessibilityLabel={t('b365.journal')}
            >
              <NotebookPen size={20} color="#EA580C" />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>

      {q.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F97316" />
        </View>
      ) : q.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-red-600 text-center mb-3">{errMsg(q.error)}</Text>
          <Pressable onPress={() => q.refetch()}>
            <Text className="text-sm font-bold text-brand-600">{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : plan ? (
        <Dashboard plan={plan} onRefresh={() => q.refetch()} refreshing={q.isRefetching} bottom={insets.bottom} />
      ) : (
        <Intro
          finished={q.data?.history.find((h) => h.status === 'SELESAI') != null}
          rounds={q.data?.history.length ?? 0}
          onStart={() => setCommitOpen(true)}
          bottom={insets.bottom}
        />
      )}

      <CommitModal
        visible={commitOpen}
        onClose={() => setCommitOpen(false)}
        onStarted={() => {
          setCommitOpen(false);
          void qc.invalidateQueries({ queryKey: BIBLE365_KEY });
          showToast(t('b365.started'), 'success');
        }}
        onError={(e) => showToast(errMsg(e), 'error')}
      />
    </View>
  );
}

// ------------------------------------------------------------------ intro

function Intro({ finished, rounds, onStart, bottom }: { finished: boolean; rounds: number; onStart: () => void; bottom: number }) {
  const { t } = useTranslation();
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottom + 32 }}>
      <View {...gx('bg-brand-500 rounded-3xl p-6 items-center')}>
        <View className="w-16 h-16 rounded-2xl bg-white/20 items-center justify-center mb-3">
          {finished ? <Trophy size={32} color="#fff" /> : <BookOpen size={32} color="#fff" />}
        </View>
        <Text className="text-2xl font-bold text-white text-center">
          {finished ? t('b365.finished_title') : t('b365.intro_title')}
        </Text>
        <Text className="text-sm text-white/90 text-center mt-2 leading-relaxed">
          {finished ? t('b365.finished_body') : t('b365.intro_body')}
        </Text>
      </View>
      <View className="bg-card rounded-2xl border border-neutral-100 p-4 mt-4 gap-3">
        {(
          [
            [BookOpen, t('b365.point_1')],
            [Check, t('b365.point_2')],
            [NotebookPen, t('b365.point_3')],
            [Bell, t('b365.point_4')],
          ] as const
        ).map(([Icon, text]) => (
          <View key={text} className="flex-row gap-3">
            <View className="w-8 h-8 rounded-xl bg-brand-50 items-center justify-center">
              <Icon size={16} color="#EA580C" />
            </View>
            <Text className="flex-1 text-sm text-neutral-700 leading-relaxed">{text}</Text>
          </View>
        ))}
      </View>
      <Pressable onPress={onStart} {...gx('mt-5 rounded-2xl py-4 items-center bg-brand-500')}>
        <Text className="text-base font-bold text-white">
          {rounds > 0 ? t('b365.start_again') : t('b365.start')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

// ------------------------------------------------------------------ popup komitmen

function CommitModal({
  visible,
  onClose,
  onStarted,
  onError,
}: {
  visible: boolean;
  onClose: () => void;
  onStarted: () => void;
  onError: (e: unknown) => void;
}) {
  const { t } = useTranslation();
  const [agree, setAgree] = useState(false);
  const [time, setTime] = useState<string | null>('06:00');
  const start = useMutation({
    mutationFn: () => startBible365(time),
    onSuccess: async () => {
      if (time) {
        const ok = await scheduleBible365Reminder(time, t('b365.reminder_title'), t('b365.reminder_body'));
        if (!ok) Alert.alert(t('b365.reminder_off_title'), t('b365.reminder_off_body'));
      }
      setAgree(false);
      onStarted();
    },
    onError,
  });
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-card rounded-3xl p-5 w-full max-w-sm">
          <Text className="text-lg font-bold text-neutral-900">{t('b365.commit_title')}</Text>
          <Text className="text-sm text-neutral-600 mt-2 leading-relaxed">{t('b365.commit_body')}</Text>
          <Pressable onPress={() => setAgree((a) => !a)} className="flex-row items-start gap-3 mt-4 bg-brand-50 rounded-2xl p-3">
            <View
              className={`w-6 h-6 rounded-lg border-2 items-center justify-center ${agree ? 'bg-brand-500 border-brand-500' : 'border-neutral-300 bg-card'}`}
            >
              {agree ? <Check size={16} color="#fff" /> : null}
            </View>
            <Text className="flex-1 text-sm text-neutral-800 leading-relaxed">{t('b365.commit_check')}</Text>
          </Pressable>
          <Text className="text-xs font-bold text-neutral-500 mt-4 mb-2">{t('b365.reminder_pick')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {[...REMINDER_TIMES, null].map((v) => {
              const on = v === time;
              return (
                <Pressable
                  key={v ?? 'none'}
                  onPress={() => setTime(v)}
                  className={`px-3 py-1.5 rounded-full border ${on ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'}`}
                >
                  <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-neutral-700'}`}>{v ?? t('b365.no_reminder')}</Text>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row gap-2 mt-5">
            <Pressable onPress={onClose} className="flex-1 py-3 rounded-xl bg-neutral-100 items-center">
              <Text className="text-sm font-semibold text-neutral-700">{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={() => start.mutate()}
              disabled={!agree || start.isPending}
              {...gx(`flex-1 py-3 rounded-xl items-center ${agree ? 'bg-brand-500' : 'bg-neutral-200'}`)}
            >
              {start.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className={`text-sm font-bold ${agree ? 'text-white' : 'text-neutral-400'}`}>{t('b365.commit_go')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ------------------------------------------------------------------ dashboard

function Dashboard({ plan, onRefresh, refreshing, bottom }: { plan: Bible365Plan; onRefresh: () => void; refreshing: boolean; bottom: number }) {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const names = useBookNames();
  const showToast = useToast((s) => s.show);
  const user = useAuthStore((s) => s.user);
  const [day, setDay] = useState(plan.today);
  const [shareOpen, setShareOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  // Versi Alkitab sama dengan halaman Alkitab (berlaku untuk semua bacaan).
  const versionCode = useBibleStore((s) => s.selectedVersionCode);
  const setVersion = useBibleStore((s) => s.setSelectedVersion);

  const dayQ = useQuery({ queryKey: [...BIBLE365_KEY, 'day', day], queryFn: () => getBible365Day(day) });
  const refreshAll = () => {
    void qc.invalidateQueries({ queryKey: BIBLE365_KEY });
  };

  const toggle = useMutation({
    mutationFn: (c: { bookId: number; bab: number; read: boolean }) => markBible365Read(c.bookId, c.bab, c.read),
    onSuccess: refreshAll,
    onError: (e) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error'),
  });
  const complete = useMutation({
    mutationFn: () => completeBible365Day(day),
    onSuccess: () => {
      refreshAll();
      showToast(t('b365.day_done', { day }), 'success');
    },
    onError: (e) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error'),
  });
  const stop = useMutation({
    mutationFn: stopBible365,
    onSuccess: async () => {
      await cancelBible365Reminder();
      refreshAll();
    },
  });

  const status = (d: number) => plan.dayStatus[d - 1] ?? '0';
  const dayDone = status(day) === '2';
  const week = useMemo(() => {
    const end = Math.max(7, plan.today);
    return Array.from({ length: 7 }, (_, i) => end - 6 + i);
  }, [plan.today]);
  const chapterLabel = (bookId: number, bab: number) => {
    const b = BIBLE_BOOK_BY_ID.get(bookId);
    return b ? `${names.name(b)} ${bab}` : `${bookId}:${bab}`;
  };
  const dayRange = (dayQ.data?.chapters ?? []).map((c) => chapterLabel(c.bookId, c.bab));

  return (
    <>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
      >
        {/* Versi Alkitab */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xs font-semibold text-neutral-500">{t('bible.choose_version')}</Text>
          <View className="flex-row bg-neutral-100 rounded-full p-0.5">
            {BIBLE_VERSIONS.map((v) => {
              const on = v.code === versionCode;
              return (
                <Pressable
                  key={v.code}
                  onPress={() => setVersion(v.code)}
                  className={`px-3 py-1 rounded-full ${on ? 'bg-card' : ''}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text className={`text-xs font-bold ${on ? 'text-brand-700' : 'text-neutral-500'}`}>{v.shortName}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Progres */}
        <View className="bg-card rounded-2xl border border-neutral-100 p-4">
          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-3xl font-bold text-brand-700">
                {plan.today}
                <Text className="text-sm font-medium text-neutral-500"> / 365 {t('b365.days')}</Text>
              </Text>
              <Text className="text-xs text-neutral-500 mt-0.5">
                {t('b365.chapters_read', { n: plan.readCount, total: plan.totalChapters })}
              </Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center gap-1">
                <Flame size={16} color="#EA580C" />
                <Text className="text-sm font-bold text-brand-700">{plan.streak}</Text>
              </View>
              <Text className="text-[11px] text-neutral-500">{t('b365.streak')}</Text>
            </View>
          </View>
          <View className="h-2.5 rounded-full bg-brand-100 mt-3 overflow-hidden">
            <View {...gx('h-full rounded-full bg-brand-500', { width: `${Math.min(100, plan.percent)}%` })} />
          </View>
          <Text className="text-[11px] text-neutral-500 mt-1.5">{t('b365.percent', { p: plan.percent })}</Text>

          <View className="flex-row justify-between mt-4">
            {week.map((d) => {
              const st = status(d);
              const sel = d === day;
              const future = d > plan.today;
              return (
                <Pressable key={d} onPress={() => !future && setDay(d)} className="items-center" disabled={future}>
                  <Text className={`text-[10px] ${sel ? 'text-brand-700 font-bold' : 'text-neutral-400'}`}>{d}</Text>
                  <View
                    className={`w-8 h-8 rounded-full mt-1 items-center justify-center ${
                      st === '2' ? 'bg-emerald-500' : st === '1' ? 'bg-amber-100' : future ? 'bg-neutral-50' : 'bg-neutral-100'
                    } ${sel ? 'border-2 border-brand-500' : ''}`}
                  >
                    {st === '2' ? <Check size={14} color="#fff" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {plan.behindCount > 0 ? (
          <Pressable
            onPress={() => plan.behindDays[0] && setDay(plan.behindDays[0])}
            className="flex-row items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2.5 mt-3"
          >
            <AlertCircle size={16} color={nc('#B45309')} />
            <Text className="flex-1 text-xs text-amber-800">{t('b365.behind', { n: plan.behindCount, day: plan.behindDays[0] })}</Text>
            <Text className="text-xs font-bold text-amber-800">{t('b365.catch_up')}</Text>
          </Pressable>
        ) : null}

        {/* Bacaan hari terpilih */}
        <View className="bg-card rounded-2xl border border-neutral-100 p-4 mt-3">
          <View className="flex-row items-center justify-between mb-2">
            <Pressable onPress={() => setDay((d) => Math.max(1, d - 1))} disabled={day <= 1} className="w-8 h-8 items-center justify-center">
              <ChevronLeft size={18} color={day <= 1 ? nc('#D4D4D4') : nc('#525252')} />
            </Pressable>
            <View className="items-center">
              <Text className="text-base font-bold text-neutral-900">
                {t('b365.day_n', { day })}
                {day === plan.today ? ` · ${t('b365.today')}` : ''}
              </Text>
              {dayRange.length ? (
                <Text className="text-[11px] text-neutral-500">
                  {dayRange[0]}
                  {dayRange.length > 1 ? ` – ${dayRange[dayRange.length - 1]}` : ''}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => setDay((d) => Math.min(plan.today, d + 1))}
              disabled={day >= plan.today}
              className="w-8 h-8 items-center justify-center"
            >
              <ChevronRight size={18} color={day >= plan.today ? nc('#D4D4D4') : nc('#525252')} />
            </Pressable>
          </View>

          {dayQ.isPending ? (
            <ActivityIndicator color="#F97316" style={{ marginVertical: 16 }} />
          ) : dayQ.isError ? (
            <Pressable onPress={() => dayQ.refetch()} className="py-4 items-center">
              <Text className="text-sm text-brand-600 font-bold">{t('common.retry')}</Text>
            </Pressable>
          ) : (
            dayQ.data?.chapters.map((c, i) => (
              <View key={`${c.bookId}:${c.bab}`} className={`flex-row items-center gap-3 py-2.5 ${i ? 'border-t border-neutral-100' : ''}`}>
                <Pressable
                  onPress={() => toggle.mutate({ bookId: c.bookId, bab: c.bab, read: !c.read })}
                  hitSlop={8}
                  className={`w-6 h-6 rounded-lg border-2 items-center justify-center ${c.read ? 'bg-brand-500 border-brand-500' : 'border-neutral-300 bg-card'}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: c.read }}
                >
                  {c.read ? <Check size={14} color="#fff" /> : null}
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/bible/${c.bookId}/${c.bab}?b365=1` as never)}
                  className="flex-1 flex-row items-center"
                >
                  <Text className={`flex-1 text-sm ${c.read ? 'text-neutral-400 line-through' : 'text-neutral-900 font-medium'}`}>
                    {chapterLabel(c.bookId, c.bab)}
                  </Text>
                  <ChevronRight size={16} color={nc('#A3A3A3')} />
                </Pressable>
              </View>
            ))
          )}
        </View>

        <Pressable
          onPress={() => router.push(`/bible365/note?day=${day}` as never)}
          className="flex-row items-center justify-center gap-2 mt-3 py-3 rounded-2xl border border-brand-200 bg-card"
        >
          <Pencil size={16} color="#EA580C" />
          <Text className="text-sm font-bold text-brand-700">
            {dayQ.data?.note ? t('b365.edit_note') : t('b365.write_note')}
          </Text>
        </Pressable>
        {dayQ.data?.note ? (
          <View className="bg-brand-50 rounded-2xl p-3 mt-2">
            <Text className="text-xs text-neutral-700 leading-relaxed" numberOfLines={3}>
              {dayQ.data.note.isi}
            </Text>
          </View>
        ) : null}

        {!dayDone ? (
          <Pressable
            onPress={() => complete.mutate()}
            disabled={complete.isPending}
            {...gx('mt-3 py-3.5 rounded-2xl items-center bg-brand-500')}
          >
            {complete.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-sm font-bold text-white">{t('b365.mark_day', { day })}</Text>
            )}
          </Pressable>
        ) : (
          <View className="mt-3 py-3.5 rounded-2xl items-center bg-emerald-600 flex-row justify-center gap-2">
            <Check size={16} color="#fff" />
            <Text className="text-sm font-bold text-white">{t('b365.day_complete', { day })}</Text>
          </View>
        )}

        <View className="flex-row gap-2 mt-3">
          <Pressable onPress={() => setShareOpen(true)} className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl bg-card border border-neutral-200">
            <Share2 size={16} color="#EA580C" />
            <Text className="text-sm font-semibold text-neutral-800">{t('b365.share')}</Text>
          </Pressable>
          <Pressable onPress={() => setReminderOpen(true)} className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl bg-card border border-neutral-200">
            <Bell size={16} color="#EA580C" />
            <Text className="text-sm font-semibold text-neutral-800">{plan.reminderTime ?? t('b365.reminder')}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() =>
            Alert.alert(t('b365.stop_title'), t('b365.stop_body'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('b365.stop_confirm'), style: 'destructive', onPress: () => stop.mutate() },
            ])
          }
          className="self-center mt-6 px-3 py-1"
        >
          <Text className="text-xs text-neutral-400">{t('b365.stop')}</Text>
        </Pressable>
      </ScrollView>

      <ShareCardModal
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        caption={t('b365.share_caption', { day: plan.today, p: plan.percent })}
        renderCard={(theme) => (
          <Bible365ShareCard
            theme={theme}
            percent={plan.percent}
            day={plan.today}
            streak={plan.streak}
            chapters={plan.readCount}
            name={user?.namaLengkap ?? ''}
          />
        )}
      />

      <ReminderModal
        visible={reminderOpen}
        current={plan.reminderTime}
        onClose={() => setReminderOpen(false)}
        onSaved={() => {
          setReminderOpen(false);
          refreshAll();
        }}
      />
    </>
  );
}

// ------------------------------------------------------------------ pengingat

function ReminderModal({
  visible,
  current,
  onClose,
  onSaved,
}: {
  visible: boolean;
  current: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const showToast = useToast((s) => s.show);
  const save = useMutation({
    mutationFn: async (v: string | null) => {
      if (v) {
        const ok = await scheduleBible365Reminder(v, t('b365.reminder_title'), t('b365.reminder_body'));
        if (!ok) throw new Error(t('b365.reminder_off_body'));
      } else {
        await cancelBible365Reminder();
      }
      return setBible365Reminder(v);
    },
    onSuccess: (r) => {
      showToast(r.reminderTime ? t('b365.reminder_set', { time: r.reminderTime }) : t('b365.reminder_cleared'), 'success');
      onSaved();
    },
    onError: (e) => showToast(e instanceof Error ? e.message : t('error.generic'), 'error'),
  });
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/50 items-center justify-center px-6">
        <Pressable onPress={() => {}} className="bg-card rounded-3xl p-5 w-full max-w-sm">
          <Text className="text-lg font-bold text-neutral-900">{t('b365.reminder')}</Text>
          <Text className="text-sm text-neutral-500 mt-1 mb-3">{t('b365.reminder_hint')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {[...REMINDER_TIMES, null].map((v) => {
              const on = v === current;
              return (
                <Pressable
                  key={v ?? 'none'}
                  onPress={() => save.mutate(v)}
                  disabled={save.isPending}
                  className={`px-3 py-2 rounded-full border ${on ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'}`}
                >
                  <Text className={`text-sm font-semibold ${on ? 'text-white' : 'text-neutral-700'}`}>{v ?? t('b365.no_reminder')}</Text>
                </Pressable>
              );
            })}
          </View>
          {save.isPending ? <ActivityIndicator color="#F97316" style={{ marginTop: 12 }} /> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
