/**
 * Kartu Universal Form di bawah isi News / Event / Announcement (2.5.1).
 * Event: satu baris per peserta yang saya daftarkan (hanya tampil untuk
 * peserta terdaftar; event berbayar → yang lunas). Hitung mundur batas
 * pengisian & peringatan batal otomatis.
 */
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Ban, Check, ChevronRight, ClipboardList, Clock, Eye, Pencil, ShieldCheck } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { serverNowMs } from '@/utils/serverClock';
import { useFormCards } from '@/hooks/useForms';
import type { FormCard, FormResponseBrief, FormSourceType } from '@/api/forms';

const pad = (n: number) => String(n).padStart(2, '0');

/** "DD:hh:mm:ss" sampai `iso`; null bila sudah lewat. */
export function useCountdown(iso: string | null | undefined): string | null {
  const [now, setNow] = useState(() => serverNowMs());
  useEffect(() => {
    if (!iso) return;
    const h = setInterval(() => setNow(serverNowMs()), 1000);
    return () => clearInterval(h);
  }, [iso]);
  if (!iso) return null;
  const left = new Date(iso).getTime() - now;
  if (!Number.isFinite(left) || left <= 0) return null;
  const s = Math.floor(left / 1000);
  return `${pad(Math.floor(s / 86400))}:${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function fmtDateTime(iso: string | null | undefined, lang: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(lang.startsWith('en') ? 'en-GB' : 'id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StatusPill({ r }: { r: FormResponseBrief | null }) {
  const { t } = useTranslation();
  const cfg = !r
    ? { bg: 'bg-neutral-100', fg: 'text-neutral-600', label: t('uform.not_filled') }
    : r.status === 'SUBMITTED'
      ? { bg: 'bg-emerald-50', fg: 'text-emerald-700', label: t('uform.submitted') }
      : r.status === 'NEEDS_FIX'
        ? { bg: 'bg-amber-50', fg: 'text-amber-700', label: t('uform.needs_fix') }
        : { bg: 'bg-red-50', fg: 'text-red-700', label: t('uform.rejected') };
  return (
    <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${cfg.bg}`}>
      {r?.status === 'SUBMITTED' ? <Check size={10} color="#047857" /> : null}
      <Text className={`text-[10px] font-bold ${cfg.fg}`}>{cfg.label}</Text>
    </View>
  );
}

export function FormCards({ sourceType, sourceId, className = '' }: { sourceType: FormSourceType; sourceId: string | null | undefined; className?: string }) {
  const q = useFormCards(sourceType, sourceId);
  const cards = q.data ?? [];
  if (!cards.length) return null;
  return (
    <View className={`gap-3 ${className}`}>
      {cards.map((c) => (
        <OneCard key={c.formId} c={c} src={`${sourceType}:${sourceId}`} />
      ))}
    </View>
  );
}

function OneCard({ c, src }: { c: FormCard; src: string }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const cd = useCountdown(c.state === 'OPEN' ? c.deadline : null);
  const open = (subjek: string) => router.push(`/form/${c.formId}?src=${encodeURIComponent(src)}&subjek=${subjek}` as never);
  const viewResp = (rid: string) => router.push(`/form/response/${rid}` as never);
  const single = !c.perPeserta ? c.subjects[0] : null;
  const allDone = c.subjects.every((s) => s.response?.status === 'SUBMITTED');
  const urgent = !!c.deadline && new Date(c.deadline).getTime() - serverNowMs() < 24 * 3600_000;

  return (
    <View className={`bg-card rounded-2xl p-4 border ${c.subjects.some((s) => s.response?.status === 'NEEDS_FIX') ? 'border-amber-300' : 'border-brand-200'}`}>
      <View className="flex-row items-center gap-3">
        <View {...gx(`w-10 h-10 rounded-xl items-center justify-center ${allDone ? 'bg-emerald-500' : 'bg-brand-500'}`)}>
          {allDone ? <Check size={18} color="#fff" /> : <ClipboardList size={18} color="#fff" />}
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-bold text-neutral-900" numberOfLines={2}>
            {c.judul}
          </Text>
          <Text className="text-[11px] text-neutral-500 mt-0.5">
            {[c.perPeserta ? t('uform.per_peserta') : t('uform.questions', { count: c.questionCount }), c.deadline ? t('uform.closes_at', { date: fmtDateTime(c.deadline, i18n.language) }) : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </View>

      {c.deskripsi ? (
        <Text className="text-xs text-neutral-600 mt-2 leading-5" numberOfLines={3}>
          {c.deskripsi}
        </Text>
      ) : null}

      {cd ? (
        <View className={`mt-3 rounded-xl px-3 py-2 flex-row items-center gap-2 ${urgent ? 'bg-red-50' : 'bg-brand-50'}`}>
          <Clock size={14} color={urgent ? '#B91C1C' : '#EA580C'} />
          <View className="flex-1">
            <Text className="text-[10px] text-neutral-500">{t('uform.deadline')}</Text>
            <Text className={`text-sm font-extrabold ${urgent ? 'text-red-700' : 'text-brand-700'}`} style={{ fontVariant: ['tabular-nums'] }}>
              {cd}
            </Text>
          </View>
        </View>
      ) : null}

      {c.autoCancel && c.state === 'OPEN' && !allDone ? (
        <View className="mt-2 rounded-xl px-3 py-2 bg-red-50 flex-row gap-2">
          <AlertCircle size={13} color="#B91C1C" style={{ marginTop: 1 }} />
          <Text className="flex-1 text-[11px] text-red-800 leading-4">{t('uform.auto_cancel_warn')}</Text>
        </View>
      ) : null}

      {c.anonim ? (
        <View className="mt-2 rounded-xl px-3 py-2 bg-violet-50 flex-row gap-2">
          <ShieldCheck size={13} color="#6D28D9" style={{ marginTop: 1 }} />
          <Text className="flex-1 text-[11px] text-violet-800 leading-4">{t('uform.anon_note')}</Text>
        </View>
      ) : null}

      {c.state === 'NOT_OPEN' ? (
        <Text className="mt-3 text-xs text-neutral-500">{t('uform.opens_at', { date: fmtDateTime(c.opensAt, i18n.language) })}</Text>
      ) : null}

      {single ? (
        <SingleActions c={c} r={single.response} onOpen={() => open(single.jemaatId)} onView={viewResp} />
      ) : (
        <View className="mt-2">
          {c.subjects.map((s) => {
            const r = s.response;
            const fix = r?.status === 'NEEDS_FIX';
            const canOpen = c.state === 'OPEN' || fix;
            return (
              <Pressable
                key={s.jemaatId}
                onPress={() => (r && !fix && !(c.allowEdit && c.state === 'OPEN') ? viewResp(r.id) : canOpen ? open(s.jemaatId) : r ? viewResp(r.id) : undefined)}
                className="flex-row items-center gap-2.5 py-2.5 border-t border-neutral-100 active:opacity-70"
              >
                <Avatar name={s.namaLengkap} fotoUrl={s.fotoUrl} size={30} />
                <View className="flex-1 min-w-0">
                  <Text className="text-[13px] font-semibold text-neutral-900" numberOfLines={1}>
                    {s.namaLengkap}
                  </Text>
                  {fix && r?.perbaikiSebelum ? (
                    <Text className="text-[10px] text-amber-700" numberOfLines={1}>
                      {t('uform.fix_before', { date: fmtDateTime(r.perbaikiSebelum, i18n.language) })}
                    </Text>
                  ) : (
                    <Text className="text-[10px] text-neutral-400">{s.relasi}</Text>
                  )}
                </View>
                <StatusPill r={r} />
                {canOpen || r ? <ChevronRight size={14} color={nc('#A3A3A3')} /> : null}
              </Pressable>
            );
          })}
          {c.state === 'CLOSED' ? <Text className="text-xs text-neutral-500 pt-2">{t('uform.closed')}</Text> : null}
        </View>
      )}
    </View>
  );
}

function SingleActions({ c, r, onOpen, onView }: { c: FormCard; r: FormResponseBrief | null; onOpen: () => void; onView: (id: string) => void }) {
  const { t, i18n } = useTranslation();
  if (r?.status === 'NEEDS_FIX') {
    return (
      <View className="mt-3">
        <View className="rounded-xl bg-amber-50 px-3 py-2 flex-row gap-2">
          <AlertCircle size={13} color="#B45309" style={{ marginTop: 1 }} />
          <Text className="flex-1 text-[11px] text-amber-900 leading-4">
            {r.alasan}
            {r.perbaikiSebelum ? `\n${t('uform.fix_before', { date: fmtDateTime(r.perbaikiSebelum, i18n.language) })}` : ''}
          </Text>
        </View>
        <Pressable onPress={onOpen} {...gx('mt-2 bg-brand-500 rounded-xl py-3 items-center')}>
          <Text className="text-white font-bold text-sm">{t('uform.fix_answer')}</Text>
        </Pressable>
      </View>
    );
  }
  if (r?.status === 'REJECTED') {
    return (
      <View className="mt-3 rounded-xl bg-red-50 px-3 py-2 flex-row gap-2">
        <Ban size={13} color="#B91C1C" style={{ marginTop: 1 }} />
        <Text className="flex-1 text-[11px] text-red-800 leading-4">
          {t('uform.rejected')}
          {r.alasan ? ` — ${r.alasan}` : ''}
        </Text>
      </View>
    );
  }
  if (r) {
    return (
      <View className="mt-3 flex-row gap-2">
        <Pressable onPress={() => onView(r.id)} className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border border-neutral-200 bg-card">
          <Eye size={14} color={nc('#404040')} />
          <Text className="text-xs font-semibold text-neutral-800">{t('uform.view_answer')}</Text>
        </Pressable>
        {c.state === 'OPEN' && (c.allowEdit || c.multiResponse) ? (
          <Pressable onPress={onOpen} className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border border-neutral-200 bg-card">
            <Pencil size={14} color={nc('#404040')} />
            <Text className="text-xs font-semibold text-neutral-800">{c.multiResponse ? t('uform.fill') : t('uform.edit')}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
  if (c.state !== 'OPEN') {
    return (
      <View className="mt-3 py-2.5 rounded-xl border border-neutral-200 items-center">
        <Text className="text-xs font-semibold text-neutral-400">{c.state === 'NOT_OPEN' ? t('uform.not_open') : t('uform.closed')}</Text>
      </View>
    );
  }
  return (
    <Pressable onPress={onOpen} {...gx('mt-3 bg-brand-500 rounded-xl py-3 items-center')}>
      <Text className="text-white font-bold text-sm">{t('uform.fill')}</Text>
    </Pressable>
  );
}
