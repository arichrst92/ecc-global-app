/**
 * Universal Form — layar pengisian (2.5.1). /form/:formId?src=TYPE:ID&subjek=ID
 *
 *  - Event: chip peserta di atas (✓ = sudah terkirim); autofill dari data peserta.
 *  - Field autofill dikumpulkan dalam kotak terkunci; sisanya diisi jemaat.
 *  - Draf disimpan otomatis di HP; validasi di HP mengikuti aturan server,
 *    pesan salah dari server dipetakan ke field.
 *  - Pita sisa waktu (merah di 24 jam terakhir) + peringatan batal otomatis.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertCircle, Check, Clock, Lock, ShieldCheck, X } from 'lucide-react-native';

import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { FieldInput, InfoBlock, type FieldCtx } from '@/components/forms/FieldInputs';
import { fmtDateTime, useCountdown } from '@/components/forms/FormCards';
import { useFormCards, useFormDetail, FORMS_KEY } from '@/hooks/useForms';
import { submitForm, type FormField, type FormFile, type FormSourceType } from '@/api/forms';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { serverNowMs } from '@/utils/serverClock';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isEmpty = (v: unknown) => v == null || v === '' || (Array.isArray(v) && v.length === 0);

/** Validasi di HP (aturan sama dengan server; server tetap memeriksa ulang). */
function validate(fields: FormField[], ans: Record<string, unknown>, t: (k: string, o?: Record<string, unknown>) => string) {
  const err: Record<string, string> = {};
  for (const f of fields) {
    if (f.tipe === 'INFO' || f.autofill) continue;
    const v = f.validasi ?? {};
    let x = ans[f.id];
    if (typeof x === 'string') x = x.trim();
    if (isEmpty(x) || (f.tipe === 'DATE_RANGE' && !(x as { from?: string })?.from && !(x as { to?: string })?.to)) {
      if (f.wajib) err[f.id] = f.tipe === 'FILE' ? t('uform.err_file_required') : f.tipe === 'SIGNATURE' ? t('uform.err_sign_required') : t('uform.err_required');
      continue;
    }
    const s = typeof x === 'string' ? x : '';
    if (f.tipe === 'TEXT' || f.tipe === 'TEXTAREA' || f.tipe === 'RICHTEXT') {
      if (v.minLength != null && s.length < v.minLength) err[f.id] = t('uform.err_min_len', { n: v.minLength });
      else if (v.maxLength != null && s.length > v.maxLength) err[f.id] = t('uform.err_max_len', { n: v.maxLength });
    } else if (f.tipe === 'EMAIL' && !EMAIL_RE.test(s)) err[f.id] = t('uform.err_email');
    else if (f.tipe === 'URL' && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(s)) err[f.id] = t('uform.err_url');
    else if (f.tipe === 'NUMBER') {
      const n = Number(x);
      if (!Number.isFinite(n)) err[f.id] = t('uform.err_number');
      else if (v.integer && !Number.isInteger(n)) err[f.id] = t('uform.err_integer');
      else if (v.min != null && n < v.min) err[f.id] = t('uform.err_min', { n: v.min });
      else if (v.max != null && n > v.max) err[f.id] = t('uform.err_max', { n: v.max });
    } else if (f.tipe === 'CHECKBOX') {
      const n = (x as string[]).length;
      if (v.minSelect != null && n < v.minSelect) err[f.id] = t('uform.err_min_select', { n: v.minSelect });
      else if (v.maxSelect != null && n > v.maxSelect) err[f.id] = t('uform.err_max_select', { n: v.maxSelect });
    } else if (f.tipe === 'DATE_RANGE') {
      const r = x as { from?: string; to?: string };
      if (!r.from || !r.to) err[f.id] = t('uform.err_required');
      else if (r.from > r.to) err[f.id] = t('uform.err_date_range');
      else if (v.maxDays != null && (Date.parse(r.to) - Date.parse(r.from)) / 86400000 + 1 > v.maxDays) err[f.id] = t('uform.err_max_days', { n: v.maxDays });
    } else if (f.tipe === 'DATETIME' && Number.isNaN(new Date(String(x)).getTime())) err[f.id] = t('uform.err_time');
  }
  return err;
}

export default function FormFillScreen() {
  const { formId, src, subjek } = useLocalSearchParams<{ formId: string; src: string; subjek?: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const q = useFormDetail(formId, src, subjek ?? null);
  const d = q.data;
  const [sourceType, sourceId] = (src ?? '').split(':') as [FormSourceType, string];
  const cards = useFormCards(sourceType, sourceId);

  const draftKey = d ? `uform:draft:${formId}:${src}:${d.subject.jemaatId}` : null;
  const [ans, setAns] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Map<string, FormFile>>(new Map());
  const [busy, setBusyMap] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<null | { msg: string | null; fix: boolean; edited: boolean }>(null);
  const [ready, setReady] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const ys = useRef<Record<string, number>>({});

  // Muat jawaban lama → draf (bila ada) per peserta.
  useEffect(() => {
    if (!d || !draftKey) return;
    setReady(false);
    setErrors({});
    setDone(null);
    const base = (d.response?.jawaban ?? {}) as Record<string, unknown>;
    setFiles(new Map((d.response?.files ?? []).map((f) => [f.id, f])));
    AsyncStorage.getItem(draftKey)
      .then((raw) => {
        const draft = raw ? (JSON.parse(raw) as { ans: Record<string, unknown>; files: FormFile[] }) : null;
        if (draft && d.canSubmit) {
          setAns({ ...base, ...draft.ans });
          setFiles((m) => new Map([...m, ...draft.files.map((f) => [f.id, f] as const)]));
        } else setAns(base);
      })
      .catch(() => setAns(base))
      .finally(() => setReady(true));
  }, [d, draftKey]);

  // Simpan draf otomatis.
  useEffect(() => {
    if (!ready || !draftKey || !d?.canSubmit || done) return;
    const h = setTimeout(() => {
      void AsyncStorage.setItem(draftKey, JSON.stringify({ ans, files: [...files.values()].filter((f) => !d.response?.files.some((x) => x.id === f.id)) })).catch(() => {});
    }, 600);
    return () => clearTimeout(h);
  }, [ans, files, ready, draftKey, d, done]);

  const fields = d?.fields ?? [];
  const inputs = fields.filter((f) => f.tipe !== 'INFO' && !f.autofill);
  const autoFields = d?.anonim ? [] : fields.filter((f) => f.autofill);
  const answered = inputs.filter((f) => !isEmpty(ans[f.id])).length;
  const anyBusy = Object.values(busy).some(Boolean);
  const readOnly = !!d && !d.canSubmit;
  const fix = d?.response?.status === 'NEEDS_FIX';
  const deadline = fix && d?.response?.perbaikiSebelum ? d.response.perbaikiSebelum : d?.deadline ?? null;
  const cd = useCountdown(readOnly ? null : deadline);
  const urgent = !!deadline && new Date(deadline).getTime() - serverNowMs() < 24 * 3600_000;

  const ctx: FieldCtx = useMemo(
    () => ({
      formId: formId!,
      signerName: d?.signerName ?? '',
      files,
      addFile: (f) => setFiles((m) => new Map(m).set(f.id, f)),
      setBusy: (id, b) => setBusyMap((x) => ({ ...x, [id]: b })),
      readOnly,
    }),
    [formId, d?.signerName, files, readOnly],
  );

  const setVal = (id: string, v: unknown) => {
    setAns((a) => ({ ...a, [id]: v }));
    if (errors[id]) setErrors((e) => ({ ...e, [id]: '' }));
  };

  function jumpToFirst(err: Record<string, string>) {
    const first = fields.find((f) => err[f.id]);
    if (first && ys.current[first.id] != null) scroll.current?.scrollTo({ y: Math.max(0, ys.current[first.id]! - 80), animated: true });
  }

  async function submit() {
    if (!d || !formId || !src) return;
    if (anyBusy) return setErrors((e) => ({ ...e, _: t('uform.err_uploading') }));
    const err = validate(fields, ans, t);
    if (Object.keys(err).length) {
      setErrors(err);
      jumpToFirst(err);
      return;
    }
    setSending(true);
    try {
      const jawaban: Record<string, unknown> = {};
      for (const f of inputs) if (!isEmpty(ans[f.id])) jawaban[f.id] = f.tipe === 'NUMBER' ? Number(ans[f.id]) : ans[f.id];
      const r = await submitForm(formId, { src, subjekJemaatId: d.subject.jemaatId, jawaban });
      if (draftKey) void AsyncStorage.removeItem(draftKey).catch(() => {});
      void qc.invalidateQueries({ queryKey: FORMS_KEY });
      setDone({ msg: r.pesanTerimaKasih, fix, edited: r.edited });
    } catch (e) {
      if (e instanceof ApiError && e.details?.fieldErrors) {
        const fe = Object.fromEntries(Object.entries(e.details.fieldErrors).map(([k, v]) => [k, v[0] ?? '']));
        setErrors(fe);
        jumpToFirst(fe);
      } else setErrors({ _: e instanceof ApiError ? e.message : t('error.generic') });
    } finally {
      setSending(false);
    }
  }

  const errCount = Object.entries(errors).filter(([k, v]) => k !== '_' && v).length;
  const nextSubject = useMemo(() => {
    const c = cards.data?.find((x) => x.formId === formId);
    return c?.subjects.find((s) => s.jemaatId !== d?.subject.jemaatId && (!s.response || s.response.status === 'NEEDS_FIX')) ?? null;
  }, [cards.data, formId, d?.subject.jemaatId]);

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-3 py-2 flex-row items-center gap-1">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center" hitSlop={8}>
            <X size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1 min-w-0">
            <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
              {d?.judul ?? ' '}
            </Text>
            <Text className="text-xs text-neutral-500" numberOfLines={1}>
              {d ? (d.subjects.length > 1 || sourceType === 'EVENT' ? t('uform.for', { name: d.subject.namaLengkap }) : d.konten ?? '') : ''}
            </Text>
          </View>
        </View>
        {d && d.subjects.length > 1 && !done ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 10, gap: 6 }}>
            {d.subjects.map((s) => {
              const on = s.jemaatId === d.subject.jemaatId;
              const st = cards.data?.find((x) => x.formId === formId)?.subjects.find((x) => x.jemaatId === s.jemaatId)?.response?.status;
              return (
                <Pressable
                  key={s.jemaatId}
                  onPress={() => router.setParams({ subjek: s.jemaatId })}
                  {...gx(`px-3 py-1.5 rounded-full border ${on ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'}`)}
                >
                  <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-neutral-700'}`}>
                    {s.namaLengkap.split(' ')[0]}
                    {st === 'SUBMITTED' ? ' ✓' : st === 'NEEDS_FIX' ? ' !' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        {cd && !done ? (
          <View className={`px-4 py-2 flex-row items-center gap-2 ${urgent ? 'bg-red-50' : 'bg-brand-50'}`}>
            <Clock size={14} color={urgent ? '#B91C1C' : '#C2410C'} />
            <Text className={`flex-1 text-[11px] ${urgent ? 'text-red-800' : 'text-brand-800'}`}>
              <Text className="font-extrabold" style={{ fontVariant: ['tabular-nums'] }}>
                {t('uform.time_left', { time: cd })}
              </Text>
              {d?.autoCancel ? ` · ${t('uform.time_left_cancel', { name: d.subject.namaLengkap.split(' ')[0] })}` : ''}
            </Text>
          </View>
        ) : null}
      </SafeAreaView>

      {q.isPending || (d && !ready) ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F97316" />
        </View>
      ) : q.isError || !d ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-red-600 text-center">{q.error instanceof ApiError ? q.error.message : t('error.generic')}</Text>
        </View>
      ) : done ? (
        <Done
          title={done.fix ? t('uform.fix_sent_title') : t('uform.sent_title')}
          body={done.msg || t('uform.sent_body')}
          next={nextSubject}
          editUntil={d.allowEdit && d.deadline ? fmtDateTime(d.deadline, i18n.language) : null}
          onNext={(id) => router.setParams({ subjek: id })}
          onClose={() => goBack(router)}
          bottom={insets.bottom}
        />
      ) : (
        <KeyboardSafeView className="flex-1">
          <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 16 }}>
            {errCount ? (
              <Pressable onPress={() => jumpToFirst(errors)} className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 flex-row gap-2">
                <AlertCircle size={15} color="#B91C1C" style={{ marginTop: 1 }} />
                <Text className="flex-1 text-xs text-red-800">{t('uform.errors_summary', { count: errCount })}</Text>
              </Pressable>
            ) : null}
            {fix && d.response?.alasan ? (
              <View className="rounded-xl bg-amber-50 border border-amber-300 px-3 py-2.5 flex-row gap-2">
                <AlertCircle size={15} color="#B45309" style={{ marginTop: 1 }} />
                <View className="flex-1">
                  <Text className="text-xs font-bold text-amber-900">{t('uform.needs_fix')}</Text>
                  <Text className="text-xs text-amber-900 mt-0.5">{d.response.alasan}</Text>
                </View>
              </View>
            ) : null}
            {readOnly ? (
              <View className="rounded-xl bg-neutral-100 px-3 py-2.5">
                <Text className="text-xs text-neutral-700">
                  {d.response?.status === 'REJECTED' ? t('uform.rejected_note') : d.state === 'NOT_OPEN' ? t('uform.not_open_note') : t('uform.closed_note')}
                </Text>
              </View>
            ) : null}
            {d.deskripsi ? <Text className="text-[13px] text-neutral-600 leading-5">{d.deskripsi}</Text> : null}
            {!readOnly ? <Text className="text-xs text-neutral-500 -mt-2">{t('uform.intro')}</Text> : null}
            {d.anonim ? (
              <View className="rounded-xl bg-violet-50 px-3 py-2.5 flex-row gap-2">
                <ShieldCheck size={14} color="#6D28D9" style={{ marginTop: 1 }} />
                <Text className="flex-1 text-xs text-violet-800">{t('uform.anon_note')}</Text>
              </View>
            ) : null}

            {autoFields.length ? (
              <View className="rounded-xl border border-dashed border-neutral-300 bg-neutral-100/60 px-3 py-2.5">
                <View className="flex-row items-center gap-1.5 mb-1.5">
                  <Lock size={12} color={nc('#525252')} />
                  <Text className="text-[11px] font-bold text-neutral-600">{t('uform.autofill_title', { name: d.subject.namaLengkap.split(' ')[0] })}</Text>
                </View>
                {autoFields.map((f) => (
                  <View key={f.id} className="flex-row gap-2 py-0.5">
                    <Text className="text-xs text-neutral-400 w-28" numberOfLines={1}>
                      {f.label}
                    </Text>
                    <Text className="text-xs font-bold text-neutral-900 flex-1">{d.autofill[f.autofill!] || '—'}</Text>
                  </View>
                ))}
                <Text className="text-[10px] text-neutral-400 mt-1.5">{t('uform.autofill_note')}</Text>
              </View>
            ) : null}

            {fields
              .filter((f) => !f.autofill)
              .map((f) => (
                <View key={f.id} onLayout={(e) => (ys.current[f.id] = e.nativeEvent.layout.y)}>
                  {f.tipe === 'INFO' ? (
                    <InfoBlock f={f} />
                  ) : (
                    <>
                      <Text className="text-[13px] font-semibold text-neutral-900 mb-1">
                        {f.label}
                        {f.wajib ? <Text className="text-red-600"> *</Text> : null}
                      </Text>
                      {f.petunjuk ? <Text className="text-[11px] text-neutral-500 mb-1.5 -mt-0.5">{f.petunjuk}</Text> : null}
                      <FieldInput f={f} value={ans[f.id]} onChange={(v) => setVal(f.id, v)} error={errors[f.id]} ctx={ctx} />
                      {errors[f.id] ? (
                        <View className="flex-row items-center gap-1 mt-1">
                          <AlertCircle size={11} color="#DC2626" />
                          <Text className="text-[11px] text-red-600 flex-1">{errors[f.id]}</Text>
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              ))}
          </ScrollView>
          {!readOnly ? (
            <View className="bg-card border-t border-neutral-100 px-4 pt-2.5" style={{ paddingBottom: insets.bottom + 10 }}>
              {errors._ ? <Text className="text-xs text-red-600 mb-1.5 text-center">{errors._}</Text> : null}
              <View className="flex-row justify-between mb-2">
                <Text className="text-[10px] text-neutral-400">{t('uform.draft_saved')}</Text>
                <Text className="text-[10px] text-neutral-400">{t('uform.progress', { done: answered, total: inputs.length })}</Text>
              </View>
              <Pressable onPress={submit} disabled={sending || anyBusy} {...gx(`rounded-xl py-3.5 items-center bg-brand-500 ${sending || anyBusy ? 'opacity-60' : ''}`)}>
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-[15px]">{anyBusy ? t('uform.uploading') : fix ? t('uform.submit_fix') : t('uform.submit')}</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </KeyboardSafeView>
      )}
    </View>
  );
}

function Done({
  title,
  body,
  next,
  editUntil,
  onNext,
  onClose,
  bottom,
}: {
  title: string;
  body: string;
  next: { jemaatId: string; namaLengkap: string } | null;
  editUntil: string | null;
  onNext: (id: string) => void;
  onClose: () => void;
  bottom: number;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-6" style={{ paddingBottom: bottom + 24 }}>
      <View {...gx('w-24 h-24 rounded-full items-center justify-center bg-emerald-500')}>
        <Check size={44} color="#fff" strokeWidth={3} />
      </View>
      <Text className="text-xl font-extrabold text-neutral-900 mt-5 text-center">{title}</Text>
      <Text className="text-sm text-neutral-600 mt-2 text-center leading-5">{body}</Text>
      {next ? (
        <View className="w-full mt-6 bg-card rounded-2xl border border-neutral-100 p-3">
          <Text className="text-[11px] text-neutral-500 mb-2">{t('uform.others_left')}</Text>
          <Pressable onPress={() => onNext(next.jemaatId)} {...gx('bg-brand-500 rounded-xl py-3 items-center')}>
            <Text className="text-white font-bold text-sm">{t('uform.fill_next', { name: next.namaLengkap.split(' ')[0] })}</Text>
          </Pressable>
        </View>
      ) : null}
      <Pressable onPress={onClose} className="w-full mt-3 py-3 rounded-xl border border-neutral-200 items-center bg-card">
        <Text className="text-sm font-semibold text-neutral-800">{t('uform.done')}</Text>
      </Pressable>
      {editUntil ? <Text className="text-[11px] text-neutral-500 mt-3">{t('uform.can_edit_until', { date: editUntil })}</Text> : null}
    </View>
  );
}
