/**
 * Universal Form — jawaban saya (hanya-baca), 2.5.1. /form/response/:id
 * Bila admin meminta perbaikan, alasannya tampil + tombol "Perbaiki jawaban".
 */
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, Ban, Lock } from 'lucide-react-native';

import { useMyFormResponse } from '@/hooks/useForms';
import { FieldInput, InfoBlock, fmtYmd, type FieldCtx } from '@/components/forms/FieldInputs';
import { StatusPill, fmtDateTime } from '@/components/forms/FormCards';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import type { FormField } from '@/api/forms';

function textOf(f: FormField, v: unknown, lang: string): string {
  if (v == null || v === '') return '—';
  switch (f.tipe) {
    case 'BOOLEAN':
      return v ? '✓' : '✕';
    case 'CHECKBOX':
      return (v as string[]).join(', ');
    case 'DATE':
      return fmtYmd(String(v), lang);
    case 'DATE_RANGE': {
      const r = v as { from: string; to: string };
      return `${fmtYmd(r.from, lang)} – ${fmtYmd(r.to, lang)}`;
    }
    case 'DATETIME':
      return fmtDateTime(String(v), lang);
    default:
      return String(v);
  }
}

export default function MyFormResponseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const q = useMyFormResponse(id);
  const d = q.data;
  const fix = d?.status === 'NEEDS_FIX';
  const ctx: FieldCtx | null = d
    ? { formId: d.formId, signerName: '', files: new Map(d.files.map((f) => [f.id, f])), addFile: () => {}, setBusy: () => {}, readOnly: true }
    : null;

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-3 py-2 flex-row items-center gap-1">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center" hitSlop={8}>
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1 min-w-0">
            <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
              {d ? t('uform.answer_title', { name: d.subjek.namaLengkap.split(' ')[0] }) : ' '}
            </Text>
            <Text className="text-xs text-neutral-500" numberOfLines={1}>
              {d?.judul ?? ''}
            </Text>
          </View>
          {d ? <StatusPill r={d} /> : null}
        </View>
      </SafeAreaView>
      {q.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F97316" />
        </View>
      ) : q.isError || !d || !ctx ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-red-600 text-center">{q.error instanceof ApiError ? q.error.message : t('error.generic')}</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
            {fix || d.status === 'REJECTED' ? (
              <View className={`rounded-xl px-3 py-2.5 flex-row gap-2 border ${fix ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-200'}`}>
                {fix ? <AlertCircle size={15} color="#B45309" style={{ marginTop: 1 }} /> : <Ban size={15} color="#B91C1C" style={{ marginTop: 1 }} />}
                <View className="flex-1">
                  <Text className={`text-xs font-bold ${fix ? 'text-amber-900' : 'text-red-800'}`}>{fix ? t('uform.needs_fix') : t('uform.rejected')}</Text>
                  {d.alasan ? <Text className={`text-xs mt-0.5 ${fix ? 'text-amber-900' : 'text-red-800'}`}>{d.alasan}</Text> : null}
                  {fix && d.perbaikiSebelum ? (
                    <Text className="text-[11px] text-amber-800 mt-1">{t('uform.fix_before', { date: fmtDateTime(d.perbaikiSebelum, i18n.language) })}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}
            <View className="bg-card rounded-2xl border border-neutral-100 p-4 gap-3">
              {d.fields.map((f) =>
                f.tipe === 'INFO' ? (
                  <InfoBlock key={f.id} f={f} />
                ) : (
                  <View key={f.id}>
                    <View className="flex-row items-center gap-1">
                      {f.autofill ? <Lock size={10} color={nc('#A3A3A3')} /> : null}
                      <Text className="text-[11px] text-neutral-500">{f.label}</Text>
                    </View>
                    {f.tipe === 'FILE' || f.tipe === 'SIGNATURE' ? (
                      d.jawaban[f.id] ? (
                        <View className="mt-1">
                          <FieldInput f={{ ...f, isi: null }} value={d.jawaban[f.id]} onChange={() => {}} ctx={ctx} />
                        </View>
                      ) : (
                        <Text className="text-sm text-neutral-400">—</Text>
                      )
                    ) : (
                      <Text className="text-sm font-semibold text-neutral-900 mt-0.5">{(f.autofill ? d.autofill?.[f.autofill] : '') || textOf(f, d.jawaban[f.id], i18n.language)}</Text>
                    )}
                  </View>
                ),
              )}
            </View>
            <Text className="text-[11px] text-neutral-400 text-center">
              {t('uform.submitted_at', { date: fmtDateTime(d.updatedAt, i18n.language) })}
              {d.clientKind === 'web' ? ` · ${t('uform.via_web')}` : ''}
            </Text>
          </ScrollView>
          {fix && d.src ? (
            <View className="bg-card border-t border-neutral-100 px-4 pt-2.5" style={{ paddingBottom: insets.bottom + 10 }}>
              <Pressable
                onPress={() => router.replace(`/form/${d.formId}?src=${encodeURIComponent(d.src!)}&subjek=${d.subjek.jemaatId}` as never)}
                {...gx('rounded-xl py-3.5 items-center bg-brand-500')}
              >
                <Text className="text-white font-bold text-[15px]">{t('uform.fix_answer')}</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
