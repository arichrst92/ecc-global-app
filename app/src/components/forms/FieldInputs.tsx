/**
 * Input Universal Form per jenis field (2.5.1). Nilai:
 *   teks/email/link/HP → string · NUMBER → number · BOOLEAN → boolean
 *   DATE → "YYYY-MM-DD" · DATE_RANGE → {from,to} · DATETIME → ISO
 *   SELECT/RADIO → string · CHECKBOX → string[] · FILE → fileId[] · SIGNATURE → fileId
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, Text, View, type TextInput as RNTextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { AlertCircle, Calendar, Camera, Check, FileText, Image as ImageIcon, Info, Link2, Mail, Minus, PenLine, Plus, Trash2, Upload } from 'lucide-react-native';

import { TextInput } from '@/components/ui/ThemedTextInput';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Picker } from '@/components/ui/Picker';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { AnnouncementMarkdown } from '@/components/announcement/AnnouncementMarkdown';
import { useToast } from '@/components/ui/Toast';
import { SignaturePad } from '@/components/forms/SignaturePad';
import { fmtDateTime } from '@/components/forms/FormCards';
import { nc } from '@/theme/ThemeRoot';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/api';
import { deleteFormFile, formFileUrl, uploadFormFile, uploadSignature, type FormField, type FormFile, type PickedFormFile } from '@/api/forms';

export type FieldCtx = {
  formId: string;
  signerName: string;
  files: Map<string, FormFile>;
  addFile: (f: FormFile) => void;
  setBusy: (fieldId: string, busy: boolean) => void;
  readOnly?: boolean;
};

const inputCls = 'bg-card border rounded-xl px-3 py-2.5 text-sm text-neutral-900';
const border = (err?: string) => (err ? 'border-red-400 bg-red-50' : 'border-neutral-200');

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseYmd = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))) : null);
const FAR = new Date(2100, 0, 1);
const PAST = new Date(1900, 0, 1);

export function fmtYmd(s: string | undefined, lang: string) {
  const d = parseYmd(s);
  return d ? d.toLocaleDateString(lang.startsWith('en') ? 'en-GB' : 'id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

function dateBounds(f: FormField) {
  const v = f.validasi ?? {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let min = parseYmd(v.minDate) ?? PAST;
  let max = parseYmd(v.maxDate) ?? FAR;
  if (v.notPast && min < today) min = today;
  if (v.notFuture && max > today) max = today;
  return { min, max };
}

/** Gambar file privat (header Authorization; web lewat blob). */
export function AuthImage({ fileId, style, resizeMode = 'contain' }: { fileId: string; style: object; resizeMode?: 'contain' | 'cover' }) {
  const token = useAuthStore((s) => s.accessToken);
  const [webUri, setWebUri] = useState<string | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let u: string | null = null;
    fetch(formFileUrl(fileId), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((b) => setWebUri((u = URL.createObjectURL(b))))
      .catch(() => {});
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [fileId, token]);
  if (Platform.OS === 'web') return webUri ? <Image source={{ uri: webUri }} style={style} resizeMode={resizeMode} /> : <View style={style} />;
  return <Image source={{ uri: formFileUrl(fileId), headers: { Authorization: `Bearer ${token}` } }} style={style} resizeMode={resizeMode} />;
}

export function InfoBlock({ f }: { f: FormField }) {
  if (f.gaya === 'HEADING')
    return (
      <View className="pt-1">
        {f.label ? <Text className="text-base font-extrabold text-neutral-900">{f.label}</Text> : null}
        {f.isi ? <Text className="text-xs text-neutral-500 mt-0.5 leading-5">{f.isi}</Text> : null}
      </View>
    );
  const tone =
    f.gaya === 'INFO'
      ? { box: 'bg-sky-50 border-sky-200', ic: '#0369A1', title: 'text-sky-900' }
      : f.gaya === 'WARNING'
        ? { box: 'bg-amber-50 border-amber-200', ic: '#B45309', title: 'text-amber-900' }
        : null;
  if (!tone)
    return (
      <View>
        {f.label ? <Text className="text-sm font-bold text-neutral-900 mb-1">{f.label}</Text> : null}
        {f.isi ? <AnnouncementMarkdown source={f.isi} compact /> : null}
      </View>
    );
  return (
    <View className={`rounded-xl border px-3 py-2.5 flex-row gap-2 ${tone.box}`}>
      {f.gaya === 'INFO' ? <Info size={15} color={tone.ic} style={{ marginTop: 2 }} /> : <AlertCircle size={15} color={tone.ic} style={{ marginTop: 2 }} />}
      <View className="flex-1">
        {f.label ? <Text className={`text-[13px] font-bold mb-0.5 ${tone.title}`}>{f.label}</Text> : null}
        {f.isi ? <AnnouncementMarkdown source={f.isi} compact /> : null}
      </View>
    </View>
  );
}

function Chip({ label, on, onPress, disabled }: { label: string; on: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`px-3.5 py-2 rounded-full border ${on ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'} ${disabled ? 'opacity-60' : ''}`}
    >
      <Text className={`text-[13px] font-semibold ${on ? 'text-white' : 'text-neutral-700'}`}>{label}</Text>
    </Pressable>
  );
}

export function FieldInput({ f, value, onChange, error, ctx }: { f: FormField; value: unknown; onChange: (v: unknown) => void; error?: string; ctx: FieldCtx }) {
  const { t, i18n } = useTranslation();
  const v = f.validasi ?? {};
  const ro = !!ctx.readOnly;

  switch (f.tipe) {
    case 'TEXT':
    case 'EMAIL':
    case 'URL':
      return (
        <View className={`flex-row items-center gap-2 border rounded-xl px-3 bg-card ${border(error)}`}>
          {f.tipe === 'EMAIL' ? <Mail size={15} color={nc('#A3A3A3')} /> : f.tipe === 'URL' ? <Link2 size={15} color={nc('#A3A3A3')} /> : null}
          <TextInput
            value={(value as string) ?? ''}
            onChangeText={onChange}
            editable={!ro}
            maxLength={v.maxLength ?? (f.tipe === 'URL' ? 2000 : 500)}
            keyboardType={f.tipe === 'EMAIL' ? 'email-address' : f.tipe === 'URL' ? 'url' : 'default'}
            autoCapitalize={f.tipe === 'TEXT' ? 'sentences' : 'none'}
            autoCorrect={f.tipe === 'TEXT'}
            placeholder={f.tipe === 'URL' ? 'https://' : f.tipe === 'EMAIL' ? 'nama@email.com' : undefined}
            className="flex-1 py-2.5 text-sm text-neutral-900"
          />
        </View>
      );
    case 'TEXTAREA':
      return (
        <View>
          <TextInput
            value={(value as string) ?? ''}
            onChangeText={onChange}
            editable={!ro}
            multiline
            maxLength={v.maxLength ?? 5000}
            textAlignVertical="top"
            className={`${inputCls} ${border(error)}`}
            style={{ minHeight: 96 }}
          />
          <Text className="text-[10px] text-neutral-400 text-right mt-1">
            {((value as string) ?? '').length}/{v.maxLength ?? 5000}
          </Text>
        </View>
      );
    case 'RICHTEXT':
      return <RichTextInput value={(value as string) ?? ''} onChange={onChange} error={error} max={v.maxLength ?? 10000} readOnly={ro} />;
    case 'PHONE':
      return <PhoneInput value={(value as string) ?? ''} onChangeText={onChange} editable={!ro} error={error} />;
    case 'NUMBER': {
      const n = typeof value === 'number' ? value : value === '' || value == null ? null : Number(value);
      const step = (d: number) => {
        const next = (n ?? v.min ?? 0) + d;
        if (v.min != null && next < v.min) return;
        if (v.max != null && next > v.max) return;
        onChange(next);
      };
      return (
        <View className={`flex-row items-center border rounded-xl bg-card ${border(error)}`}>
          <Pressable onPress={() => step(-1)} disabled={ro} className="px-4 py-2.5" hitSlop={6}>
            <Minus size={16} color="#EA580C" />
          </Pressable>
          <TextInput
            value={value == null ? '' : String(value)}
            onChangeText={(s) => onChange(s === '' ? null : s.replace(',', '.'))}
            keyboardType={v.integer ? 'number-pad' : 'decimal-pad'}
            editable={!ro}
            className="flex-1 text-center text-base font-bold text-neutral-900 py-2"
          />
          <Pressable onPress={() => step(1)} disabled={ro} className="px-4 py-2.5" hitSlop={6}>
            <Plus size={16} color="#EA580C" />
          </Pressable>
        </View>
      );
    }
    case 'BOOLEAN':
      return (
        <View className="flex-row gap-2">
          <Chip label={t('uform.yes')} on={value === true} onPress={() => onChange(true)} disabled={ro} />
          <Chip label={t('uform.no')} on={value === false} onPress={() => onChange(false)} disabled={ro} />
        </View>
      );
    case 'SELECT':
    case 'RADIO': {
      const ops = f.opsi ?? [];
      if (f.tipe === 'SELECT' && ops.length > 6)
        return <Picker label="" placeholder={t('uform.choose')} value={(value as string) ?? ''} options={ops.map((o) => ({ value: o, label: o }))} onChange={onChange} error={error} modalTitle={f.label} />;
      if (f.tipe === 'SELECT')
        return (
          <View className="flex-row flex-wrap gap-2">
            {ops.map((o) => (
              <Chip key={o} label={o} on={value === o} onPress={() => onChange(o)} disabled={ro} />
            ))}
          </View>
        );
      return (
        <View className="gap-2">
          {ops.map((o) => (
            <Pressable key={o} onPress={() => onChange(o)} disabled={ro} className="flex-row items-center gap-2.5">
              <View className={`w-5 h-5 rounded-full items-center justify-center ${value === o ? 'border-[6px] border-brand-500' : 'border-2 border-neutral-300'}`} />
              <Text className="text-sm text-neutral-800 flex-1">{o}</Text>
            </Pressable>
          ))}
        </View>
      );
    }
    case 'CHECKBOX': {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <View className="gap-2">
          {(f.opsi ?? []).map((o) => {
            const on = arr.includes(o);
            return (
              <Pressable key={o} onPress={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])} disabled={ro} className="flex-row items-center gap-2.5">
                <View className={`w-5 h-5 rounded-md items-center justify-center ${on ? 'bg-brand-500' : 'border-2 border-neutral-300'}`}>
                  {on ? <Check size={12} color="#fff" /> : null}
                </View>
                <Text className="text-sm text-neutral-800 flex-1">{o}</Text>
              </Pressable>
            );
          })}
        </View>
      );
    }
    case 'DATE':
      return <DateButton value={value as string} onChange={onChange} f={f} error={error} disabled={ro} />;
    case 'DATE_RANGE': {
      const r = (value ?? {}) as { from?: string; to?: string };
      const days = r.from && r.to ? Math.round((parseYmd(r.to)!.getTime() - parseYmd(r.from)!.getTime()) / 86400000) + 1 : null;
      return (
        <View>
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <DateButton value={r.from} onChange={(d) => onChange({ ...r, from: d })} f={f} error={error} disabled={ro} placeholder={t('uform.from')} />
            </View>
            <Text className="text-neutral-400">–</Text>
            <View className="flex-1">
              <DateButton value={r.to} onChange={(d) => onChange({ ...r, to: d })} f={f} error={error} disabled={ro} placeholder={t('uform.to')} />
            </View>
          </View>
          {days && days > 0 ? <Text className="text-[11px] text-neutral-500 mt-1">{t('uform.days', { n: days })}</Text> : null}
        </View>
      );
    }
    case 'DATETIME':
      return <DateTimeInput value={value as string} onChange={onChange} f={f} error={error} disabled={ro} />;
    case 'FILE':
      return <FileInput f={f} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} error={error} ctx={ctx} />;
    case 'SIGNATURE':
      return <SignatureInput f={f} value={value as string | undefined} onChange={onChange} error={error} ctx={ctx} lang={i18n.language} />;
    default:
      return null;
  }
}

function DateButton({ value, onChange, f, error, disabled, placeholder }: { value?: string; onChange: (v: string) => void; f: FormField; error?: string; disabled?: boolean; placeholder?: string }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const { min, max } = dateBounds(f);
  const cur = parseYmd(value) ?? (min > new Date() ? min : max < new Date() ? max : new Date());
  return (
    <>
      <Pressable onPress={() => setOpen(true)} disabled={disabled} className={`flex-row items-center gap-2 border rounded-xl px-3 py-2.5 bg-card ${border(error)}`}>
        <Calendar size={15} color="#EA580C" />
        <Text className={`text-sm flex-1 ${value ? 'text-neutral-900' : 'text-neutral-400'}`} numberOfLines={1}>
          {value ? fmtYmd(value, i18n.language) : placeholder ?? t('uform.pick_date')}
        </Text>
      </Pressable>
      {open ? (
        <DatePickerModal
          value={cur}
          minimumDate={min}
          maximumDate={max}
          onChange={(d) => {
            onChange(ymd(d));
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function DateTimeInput({ value, onChange, f, error, disabled }: { value?: string; onChange: (v: string | null) => void; f: FormField; error?: string; disabled?: boolean }) {
  const { t } = useTranslation();
  const d = value ? new Date(value) : null;
  const [date, setDate] = useState(d ? ymd(d) : '');
  const [time, setTime] = useState(d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '');
  const emit = (ds: string, ts: string) => {
    const m = /^([01]?\d|2[0-3])[:.]([0-5]\d)$/.exec(ts.trim());
    const base = parseYmd(ds);
    if (!base || !m) return onChange(null);
    base.setHours(Number(m[1]), Number(m[2]), 0, 0);
    onChange(base.toISOString());
  };
  return (
    <View className="flex-row gap-2">
      <View className="flex-[3]">
        <DateButton
          value={date}
          onChange={(ds) => {
            setDate(ds);
            emit(ds, time);
          }}
          f={f}
          error={error}
          disabled={disabled}
        />
      </View>
      <View className={`flex-[2] border rounded-xl px-3 bg-card justify-center ${border(error)}`}>
        <TextInput
          value={time}
          onChangeText={(s) => {
            const clean = s.replace(/[^0-9:.]/g, '').slice(0, 5);
            setTime(clean);
            emit(date, clean);
          }}
          placeholder={`${t('uform.time')} 19:30`}
          keyboardType="numbers-and-punctuation"
          editable={!disabled}
          className="py-2.5 text-sm text-neutral-900"
        />
      </View>
    </View>
  );
}

/** Rich text sederhana: tebal, miring, daftar, link (Markdown; tanpa gambar). */
function RichTextInput({ value, onChange, error, max, readOnly }: { value: string; onChange: (v: string) => void; error?: string; max: number; readOnly?: boolean }) {
  const { t } = useTranslation();
  const sel = useRef({ start: value.length, end: value.length });
  const ref = useRef<RNTextInput>(null);
  const wrap = (a: string, b = a) => {
    const { start, end } = sel.current;
    const mid = value.slice(start, end) || (a === '[' ? 'teks' : '');
    onChange(value.slice(0, start) + a + mid + b + value.slice(end));
  };
  const prefix = (p: string) => {
    const { start } = sel.current;
    const ls = value.lastIndexOf('\n', start - 1) + 1;
    onChange(value.slice(0, ls) + p + value.slice(ls));
  };
  const btns: [string, () => void, object?][] = [
    ['B', () => wrap('**'), { fontWeight: '800' }],
    ['I', () => wrap('_'), { fontStyle: 'italic' }],
    ['•', () => prefix('- ')],
    ['1.', () => prefix('1. ')],
    ['🔗', () => wrap('[', '](https://)')],
  ];
  return (
    <View className={`border rounded-xl bg-card overflow-hidden ${border(error)}`}>
      {!readOnly ? (
        <View className="flex-row gap-1 px-2 py-1.5 border-b border-neutral-100">
          {btns.map(([l, fn, st]) => (
            <Pressable key={l} onPress={fn} className="w-9 h-8 rounded-lg items-center justify-center active:bg-neutral-100">
              <Text className="text-sm text-neutral-700" style={st}>
                {l}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChange}
        onSelectionChange={(e) => (sel.current = e.nativeEvent.selection)}
        multiline
        editable={!readOnly}
        maxLength={max}
        placeholder={t('uform.richtext_ph')}
        textAlignVertical="top"
        className="px-3 py-2.5 text-sm text-neutral-900"
        style={{ minHeight: 110 }}
      />
    </View>
  );
}

const EXT: Record<string, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'],
  pdf: ['pdf'],
  doc: ['doc', 'docx'],
  sheet: ['xls', 'xlsx', 'csv'],
  slide: ['ppt', 'pptx'],
  text: ['txt'],
};
const extOf = (name: string) => (name.split('.').pop() ?? '').toLowerCase();

type Uploading = { key: string; name: string; progress: number };

function FileInput({ f, value, onChange, error, ctx }: { f: FormField; value: string[]; onChange: (v: string[]) => void; error?: string; ctx: FieldCtx }) {
  const { t } = useTranslation();
  const show = useToast((s) => s.show);
  const v = f.validasi ?? {};
  const max = v.maxFiles ?? 1;
  const maxMb = v.maxSizeMb ?? 10;
  const cats = v.accept?.length ? v.accept : (Object.keys(EXT) as (keyof typeof EXT)[]);
  const allowed = useMemo(() => cats.flatMap((c) => EXT[c] ?? []), [cats]);
  const imagesOk = cats.includes('image');
  const docsOk = cats.some((c) => c !== 'image');
  const [up, setUp] = useState<Uploading[]>([]);
  const latest = useRef(value);
  latest.current = value;
  const left = max - value.length - up.length;

  async function send(list: PickedFormFile[]) {
    const take = list.slice(0, Math.max(0, left));
    if (list.length > take.length) show(t('uform.file_max', { max }), 'error');
    for (const p of take) {
      const ext = extOf(p.name);
      if (!allowed.includes(ext)) {
        show(t('uform.file_type', { types: allowed.join(', ').toUpperCase() }), 'error');
        continue;
      }
      const size = (p.file as Blob | undefined)?.size;
      if (size && size > maxMb * 1024 * 1024) {
        show(t('uform.file_too_big', { mb: maxMb }), 'error');
        continue;
      }
      const key = Math.random().toString(36).slice(2);
      setUp((u) => [...u, { key, name: p.name, progress: 0 }]);
      ctx.setBusy(f.id, true);
      try {
        const saved = await uploadFormFile(ctx.formId, f.id, p, (pr) => setUp((u) => u.map((x) => (x.key === key ? { ...x, progress: pr } : x))));
        ctx.addFile(saved);
        onChange([...latest.current, saved.id]);
      } catch (e) {
        show(e instanceof ApiError ? e.message : t('error.generic'), 'error');
      } finally {
        setUp((u) => {
          const rest = u.filter((x) => x.key !== key);
          if (!rest.length) ctx.setBusy(f.id, false);
          return rest;
        });
      }
    }
  }

  async function camera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return show(t('uform.camera_denied'), 'error');
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (r.canceled) return;
    await send(r.assets.map((a) => ({ uri: a.uri, name: a.fileName ?? `foto-${Date.now()}.jpg`, mimeType: a.mimeType ?? 'image/jpeg', file: (a as { file?: File }).file })));
  }
  async function gallery() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: left > 1, selectionLimit: Math.max(1, left) });
    if (r.canceled) return;
    await send(r.assets.map((a) => ({ uri: a.uri, name: a.fileName ?? `foto-${Date.now()}.jpg`, mimeType: a.mimeType ?? 'image/jpeg', file: (a as { file?: File }).file })));
  }
  async function doc() {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: left > 1 });
    if (r.canceled) return;
    await send(
      r.assets.map((a) => {
        const x = a as DocumentPicker.DocumentPickerAsset & { file?: File };
        return { uri: x.uri, name: x.name, mimeType: x.mimeType, file: x.file ?? undefined };
      }),
    );
  }
  function remove(id: string) {
    onChange(value.filter((x) => x !== id));
    void deleteFormFile(id).catch(() => {});
  }

  return (
    <View className="gap-2">
      {value.map((id) => {
        const meta = ctx.files.get(id);
        const img = meta?.mime.startsWith('image/') && !/heic|heif/.test(meta.mime);
        return (
          <View key={id} className="flex-row items-center gap-2.5 border border-neutral-200 rounded-xl p-2 bg-card">
            {img ? (
              <AuthImage fileId={id} style={{ width: 38, height: 38, borderRadius: 8 }} resizeMode="cover" />
            ) : (
              <View className="w-[38px] h-[38px] rounded-lg bg-brand-50 items-center justify-center">
                <FileText size={16} color="#C2410C" />
              </View>
            )}
            <View className="flex-1 min-w-0">
              <Text className="text-[13px] font-semibold text-neutral-900" numberOfLines={1}>
                {meta?.originalName ?? 'file'}
              </Text>
              {meta ? <Text className="text-[10px] text-neutral-400">{Math.max(1, Math.round(meta.sizeBytes / 1024))} KB</Text> : null}
            </View>
            {!ctx.readOnly ? (
              <Pressable onPress={() => remove(id)} hitSlop={8} className="p-1.5">
                <Trash2 size={15} color={nc('#A3A3A3')} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {up.map((u) => (
        <View key={u.key} className="flex-row items-center gap-2.5 border border-neutral-200 rounded-xl p-2 bg-card">
          <View className="w-[38px] h-[38px] rounded-lg bg-neutral-100 items-center justify-center">
            <ActivityIndicator size="small" color="#F97316" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-[13px] font-semibold text-neutral-900" numberOfLines={1}>
              {u.name}
            </Text>
            <View className="h-1 rounded-full bg-neutral-100 mt-1.5 overflow-hidden">
              <View className="h-1 bg-brand-500" style={{ width: `${Math.round(u.progress * 100)}%` }} />
            </View>
          </View>
          <Text className="text-[11px] text-neutral-500">{Math.round(u.progress * 100)}%</Text>
        </View>
      ))}
      {!ctx.readOnly && left > 0 ? (
        <View className="flex-row gap-2">
          {imagesOk && Platform.OS !== 'web' ? <SrcBtn icon={<Camera size={14} color={nc('#404040')} />} label={t('uform.camera')} onPress={camera} /> : null}
          {imagesOk ? <SrcBtn icon={<ImageIcon size={14} color={nc('#404040')} />} label={t('uform.gallery')} onPress={gallery} /> : null}
          {docsOk ? <SrcBtn icon={<Upload size={14} color={nc('#404040')} />} label={t('uform.file')} onPress={doc} /> : null}
        </View>
      ) : null}
      <Text className="text-[10px] text-neutral-500">
        {t('uform.file_hint', { count: value.length, max, mb: maxMb })} · {allowed.join(', ').toUpperCase()}
      </Text>
    </View>
  );
}

function SrcBtn({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border border-neutral-200 bg-card active:opacity-70">
      {icon}
      <Text className="text-xs font-semibold text-neutral-800">{label}</Text>
    </Pressable>
  );
}

function SignatureInput({ f, value, onChange, error, ctx, lang }: { f: FormField; value?: string; onChange: (v: string | null) => void; error?: string; ctx: FieldCtx; lang: string }) {
  const { t } = useTranslation();
  const show = useToast((s) => s.show);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const meta = value ? ctx.files.get(value) : undefined;
  return (
    <View className="gap-2">
      {f.isi ? (
        <View className="rounded-xl bg-brand-50 border border-brand-200 px-3 py-2.5">
          <AnnouncementMarkdown source={f.isi} compact />
        </View>
      ) : null}
      {value ? (
        <View className="rounded-xl border border-neutral-200 bg-card p-2.5">
          <AuthImage fileId={value} style={{ width: '100%', height: 90 }} />
          <View className="flex-row items-center justify-between border-t border-neutral-100 pt-2 mt-1">
            <View className="flex-1">
              <Text className="text-[13px] font-bold text-neutral-900">{String(meta?.meta?.signerName ?? ctx.signerName)}</Text>
              {meta?.meta?.signedAt ? <Text className="text-[10px] text-neutral-500">{t('uform.signed_at', { date: fmtDateTime(String(meta.meta.signedAt), lang) })}</Text> : null}
            </View>
            {!ctx.readOnly ? (
              <Pressable onPress={() => setOpen(true)} hitSlop={8}>
                <Text className="text-xs font-bold text-brand-600">{t('uform.sign_redo')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setOpen(true)}
          disabled={ctx.readOnly}
          className={`h-28 rounded-2xl border-2 border-dashed items-center justify-center gap-1 ${error ? 'border-red-300 bg-red-50' : 'border-brand-200 bg-card'}`}
        >
          <PenLine size={22} color="#EA580C" />
          <Text className="text-sm font-bold text-brand-600">{t('uform.sign_tap')}</Text>
          <Text className="text-[11px] text-neutral-400">{t('uform.sign_as', { name: ctx.signerName })}</Text>
        </Pressable>
      )}
      {!ctx.readOnly ? <Text className="text-[10px] text-neutral-500 leading-4">{t('uform.sign_bound')}</Text> : null}
      <SignaturePad
        visible={open}
        busy={busy}
        signerName={ctx.signerName}
        onClose={() => setOpen(false)}
        onDone={async (r) => {
          setBusy(true);
          ctx.setBusy(f.id, true);
          try {
            const saved = await uploadSignature(ctx.formId, { fieldId: f.id, ...r });
            ctx.addFile(saved);
            onChange(saved.id);
            setOpen(false);
          } catch (e) {
            show(e instanceof ApiError ? e.message : t('error.generic'), 'error');
          } finally {
            setBusy(false);
            ctx.setBusy(f.id, false);
          }
        }}
      />
    </View>
  );
}
