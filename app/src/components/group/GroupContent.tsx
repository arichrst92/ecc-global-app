/**
 * Papan konten: Pengumuman, Voting, File (group saja). Dipakai di detail
 * group dan detail homecell.
 * - Anggota: lihat pengumuman, ikut voting, buka file.
 * - PIC / admin: buat & kelola semuanya.
 */
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  Check,
  Lock,
  Megaphone,
  Paperclip,
  Pin,
  PinOff,
  Plus,
  Trash2,
  Unlock,
  Users,
  X,
} from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { MaterialList, UploadMaterialModal } from '@/components/homecell/ScheduleMaterials';
import {
  useCreateGroupAnnouncement,
  useCreateGroupPoll,
  useDeleteGroupAnnouncement,
  useDeleteGroupFile,
  useDeleteGroupPoll,
  useGroupAnnouncements,
  useGroupFiles,
  useGroupPolls,
  useUpdateGroupAnnouncement,
  useUpdateGroupPoll,
  useUploadGroupFile,
  useVoteGroupPoll,
} from '@/hooks/useGroupContent';
import type { GroupAnnouncement, GroupPoll } from '@/types/groupContent';
import { groupRoot, homecellRoot } from '@/api/groupContent';
import { ApiError } from '@/types/api';
import { gx } from '@/theme/gradient';

type Tab = 'announcements' | 'polls' | 'files';

const fmtDate = (iso: string, lang: string) =>
  new Date(iso).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export function GroupContentSection({ groupId, canManage }: { groupId: string; canManage: boolean }) {
  return <ContentBoard root={groupRoot(groupId)} canManage={canManage} showFiles />;
}

/** Homecell: pengumuman + voting (file materi ada per jadwal). */
export function HomecellBoardSection({
  homecellId,
  canManage,
  className,
}: {
  homecellId: string;
  canManage: boolean;
  className?: string;
}) {
  return <ContentBoard root={homecellRoot(homecellId)} canManage={canManage} showFiles={false} className={className} />;
}

/** Papan konten generik. `root` = prefix API (`/admin/group/:id` / `/admin/homecell/:id`). */
export function ContentBoard({
  root,
  canManage,
  showFiles,
  className = 'mx-4 mt-4',
}: {
  root: string;
  canManage: boolean;
  showFiles: boolean;
  /** Margin container; default untuk layar group. */
  className?: string;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('announcements');
  const tabs: { key: Tab; label: string; Icon: typeof Megaphone }[] = [
    { key: 'announcements', label: t('gc.tab_announcements'), Icon: Megaphone },
    { key: 'polls', label: t('gc.tab_polls'), Icon: BarChart3 },
    ...(showFiles ? [{ key: 'files' as Tab, label: t('gc.tab_files'), Icon: Paperclip }] : []),
  ];
  return (
    <View className={`${className} bg-white rounded-2xl border border-neutral-100 p-4`}>
      <View className="flex-row bg-neutral-100 rounded-xl p-1 mb-3">
        {tabs.map(({ key, label, Icon }) => {
          const active = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${active ? 'bg-white' : ''}`}
            >
              <Icon size={14} color={active ? '#EA580C' : '#737373'} />
              <Text className={`text-xs font-bold ${active ? 'text-brand-600' : 'text-neutral-500'}`}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {tab === 'announcements' && <AnnouncementsTab root={root} canManage={canManage} />}
      {tab === 'polls' && <PollsTab root={root} canManage={canManage} />}
      {tab === 'files' && showFiles && <FilesTab root={root} canManage={canManage} />}
    </View>
  );
}

function useErr() {
  const { t } = useTranslation();
  return (e: unknown) => (e instanceof ApiError ? e.message : t('error.generic'));
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-brand-300 bg-brand-50 mb-3">
      <Plus size={14} color="#EA580C" />
      <Text className="text-sm font-semibold text-brand-600">{label}</Text>
    </Pressable>
  );
}

const Empty = ({ text }: { text: string }) => <Text className="text-sm text-neutral-400 italic text-center py-4">{text}</Text>;

function confirmDelete(t: (k: string, o?: Record<string, unknown>) => string, name: string, onOk: () => void) {
  Alert.alert(t('common.delete'), t('gc.delete_confirm', { name }), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.delete'), style: 'destructive', onPress: onOk },
  ]);
}

// ============================================================ Pengumuman

function AnnouncementsTab({ root, canManage }: { root: string; canManage: boolean }) {
  const { t, i18n } = useTranslation();
  const showToast = useToast((s) => s.show);
  const errMsg = useErr();
  const q = useGroupAnnouncements(root);
  const updateMut = useUpdateGroupAnnouncement(root);
  const deleteMut = useDeleteGroupAnnouncement(root);
  const [creating, setCreating] = useState(false);
  const rows = q.data ?? [];

  return (
    <View>
      {canManage ? <AddButton label={t('gc.ann_create')} onPress={() => setCreating(true)} /> : null}
      {q.isLoading ? (
        <Empty text={t('common.loading')} />
      ) : rows.length === 0 ? (
        <Empty text={t('gc.ann_empty')} />
      ) : (
        <View className="gap-2">
          {rows.map((a: GroupAnnouncement) => (
            <View key={a.id} className={`rounded-xl p-3 border ${a.isPinned ? 'bg-amber-50 border-amber-200' : 'bg-neutral-50 border-neutral-100'}`}>
              <View className="flex-row items-start gap-2">
                {a.isPinned ? <Pin size={14} color="#B45309" style={{ marginTop: 2 }} /> : null}
                <Text className="flex-1 text-sm font-bold text-neutral-900">{a.judul}</Text>
                {canManage ? (
                  <View className="flex-row gap-3">
                    <Pressable
                      hitSlop={8}
                      onPress={() =>
                        updateMut.mutate({ id: a.id, body: { isPinned: !a.isPinned } }, { onError: (e) => showToast(errMsg(e), 'error') })
                      }
                    >
                      {a.isPinned ? <PinOff size={15} color="#737373" /> : <Pin size={15} color="#737373" />}
                    </Pressable>
                    <Pressable
                      hitSlop={8}
                      onPress={() =>
                        confirmDelete(t, a.judul, () =>
                          deleteMut.mutate(a.id, { onError: (e) => showToast(errMsg(e), 'error') }),
                        )
                      }
                    >
                      <Trash2 size={15} color="#DC2626" />
                    </Pressable>
                  </View>
                ) : null}
              </View>
              <Text className="text-sm text-neutral-700 mt-1 leading-relaxed">{a.isi}</Text>
              <Text className="text-[11px] text-neutral-400 mt-1">
                {[a.createdBy?.namaLengkap, fmtDate(a.createdAt, i18n.language)].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ))}
        </View>
      )}
      <CreateAnnouncementModal root={root} visible={creating} onClose={() => setCreating(false)} />
    </View>
  );
}

function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-black/50 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-3xl p-5" style={{ maxHeight: '88%' }}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-neutral-900">{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={18} color="#737373" />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const inputCls = 'bg-neutral-50 rounded-xl px-3 py-3 text-sm text-neutral-900 border border-neutral-200';

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-neutral-800 flex-1 pr-3">{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: '#F97316', false: '#D4D4D4' }} />
    </View>
  );
}

function CreateAnnouncementModal({ root, visible, onClose }: { root: string; visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const showToast = useToast((s) => s.show);
  const errMsg = useErr();
  const mut = useCreateGroupAnnouncement(root);
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [isPinned, setPinned] = useState(false);
  const [notify, setNotify] = useState(true);
  const close = () => {
    setJudul('');
    setIsi('');
    setPinned(false);
    setNotify(true);
    onClose();
  };
  return (
    <Sheet visible={visible} title={t('gc.ann_create')} onClose={close}>
      <Text className="text-sm font-semibold text-neutral-800">{t('gc.ann_title')}</Text>
      <TextInput value={judul} onChangeText={setJudul} maxLength={200} placeholder={t('gc.ann_title_ph')} placeholderTextColor="#A3A3A3" className={inputCls} />
      <Text className="text-sm font-semibold text-neutral-800">{t('gc.ann_body')}</Text>
      <TextInput
        value={isi}
        onChangeText={setIsi}
        maxLength={5000}
        multiline
        placeholderTextColor="#A3A3A3"
        className={inputCls}
        style={{ minHeight: 110, textAlignVertical: 'top' }}
      />
      <ToggleRow label={t('gc.ann_pin')} value={isPinned} onChange={setPinned} />
      <ToggleRow label={t('gc.notify_members')} value={notify} onChange={setNotify} />
      <Button
        label={t('gc.publish')}
        loading={mut.isPending}
        disabled={judul.trim().length < 2 || !isi.trim()}
        onPress={() =>
          mut.mutate(
            { judul: judul.trim(), isi: isi.trim(), isPinned, notify },
            {
              onSuccess: () => {
                showToast(t('gc.ann_created'), 'success');
                close();
              },
              onError: (e) => showToast(errMsg(e), 'error'),
            },
          )
        }
      />
    </Sheet>
  );
}

// ============================================================ Voting

function PollsTab({ root, canManage }: { root: string; canManage: boolean }) {
  const { t } = useTranslation();
  const q = useGroupPolls(root);
  const [creating, setCreating] = useState(false);
  const rows = q.data ?? [];
  return (
    <View>
      {canManage ? <AddButton label={t('gc.poll_create')} onPress={() => setCreating(true)} /> : null}
      {q.isLoading ? (
        <Empty text={t('common.loading')} />
      ) : rows.length === 0 ? (
        <Empty text={t('gc.poll_empty')} />
      ) : (
        <View className="gap-3">
          {rows.map((p) => (
            <PollCard key={p.id} root={root} poll={p} canManage={canManage} />
          ))}
        </View>
      )}
      <CreatePollModal root={root} visible={creating} onClose={() => setCreating(false)} />
    </View>
  );
}

function PollCard({ root, poll, canManage }: { root: string; poll: GroupPoll; canManage: boolean }) {
  const { t, i18n } = useTranslation();
  const showToast = useToast((s) => s.show);
  const errMsg = useErr();
  const voteMut = useVoteGroupPoll(root);
  const updateMut = useUpdateGroupPoll(root);
  const deleteMut = useDeleteGroupPoll(root);
  const hasVoted = poll.myVotes.length > 0;
  const [editing, setEditing] = useState(poll.isOpen && !hasVoted);
  const [selected, setSelected] = useState<string[]>(poll.myVotes);
  const voting = editing && poll.isOpen;
  const max = Math.max(1, ...poll.options.map((o) => o.count ?? 0));

  function toggle(id: string) {
    if (poll.multiple) setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    else setSelected([id]);
  }

  function submit() {
    voteMut.mutate(
      { pollId: poll.id, optionIds: selected },
      {
        onSuccess: () => {
          showToast(t('gc.voted'), 'success');
          setEditing(false);
        },
        onError: (e) => showToast(errMsg(e), 'error'),
      },
    );
  }

  function showVoters() {
    const text = poll.options
      .map((o) => `${o.label} (${o.voters?.length ?? 0})\n${o.voters?.map((v) => `• ${v.namaLengkap}`).join('\n') || '—'}`)
      .join('\n\n');
    Alert.alert(t('gc.voters'), text);
  }

  return (
    <View className="rounded-xl p-3 border border-neutral-100 bg-neutral-50">
      <View className="flex-row items-start gap-2">
        <Text className="flex-1 text-sm font-bold text-neutral-900">{poll.pertanyaan}</Text>
        {canManage ? (
          <View className="flex-row gap-3">
            <Pressable hitSlop={8} onPress={showVoters}>
              <Users size={15} color="#737373" />
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={() =>
                updateMut.mutate({ id: poll.id, isClosed: !poll.isClosed }, { onError: (e) => showToast(errMsg(e), 'error') })
              }
            >
              {poll.isClosed ? <Unlock size={15} color="#737373" /> : <Lock size={15} color="#737373" />}
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={() =>
                confirmDelete(t, poll.pertanyaan, () =>
                  deleteMut.mutate(poll.id, { onError: (e) => showToast(errMsg(e), 'error') }),
                )
              }
            >
              <Trash2 size={15} color="#DC2626" />
            </Pressable>
          </View>
        ) : null}
      </View>
      {poll.deskripsi ? <Text className="text-xs text-neutral-600 mt-1">{poll.deskripsi}</Text> : null}
      <View className="flex-row flex-wrap gap-1.5 mt-2">
        <View className={`px-2 py-0.5 rounded-full ${poll.isOpen ? 'bg-green-100' : 'bg-neutral-200'}`}>
          <Text className={`text-[10px] font-bold ${poll.isOpen ? 'text-green-700' : 'text-neutral-600'}`}>
            {poll.isOpen ? t('gc.poll_open') : t('gc.poll_closed')}
          </Text>
        </View>
        {poll.multiple ? (
          <View className="px-2 py-0.5 rounded-full bg-blue-50">
            <Text className="text-[10px] font-bold text-blue-700">{t('gc.poll_multiple')}</Text>
          </View>
        ) : null}
      </View>

      <View className="gap-2 mt-3">
        {poll.options.map((o) => {
          const mine = poll.myVotes.includes(o.id);
          if (voting) {
            const on = selected.includes(o.id);
            return (
              <Pressable
                key={o.id}
                onPress={() => toggle(o.id)}
                className={`flex-row items-center gap-2 px-3 py-2.5 rounded-xl border ${on ? 'border-brand-500 bg-brand-50' : 'border-neutral-200 bg-white'}`}
              >
                <View
                  {...gx(`w-5 h-5 items-center justify-center border-2 ${poll.multiple ? 'rounded-md' : 'rounded-full'} ${on ? 'border-brand-500 bg-brand-500' : 'border-neutral-300'}`)}
                >
                  {on ? <Check size={12} color="#fff" /> : null}
                </View>
                <Text className="flex-1 text-sm text-neutral-800">{o.label}</Text>
                {o.count != null ? <Text className="text-xs text-neutral-400">{o.count}</Text> : null}
              </Pressable>
            );
          }
          return (
            <View key={o.id}>
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-1 flex-1 pr-2">
                  {mine ? <Check size={13} color="#EA580C" /> : null}
                  <Text className={`text-sm ${mine ? 'font-bold text-brand-700' : 'text-neutral-800'}`}>{o.label}</Text>
                </View>
                <Text className="text-xs font-bold text-neutral-700">{o.count ?? '–'}</Text>
              </View>
              <View className="h-2 bg-neutral-200 rounded-full overflow-hidden mt-1">
                <View {...gx('h-full bg-brand-500 rounded-full', { width: `${((o.count ?? 0) / max) * 100}%` })}  />
              </View>
            </View>
          );
        })}
      </View>

      {voting ? (
        <View className="flex-row gap-2 mt-3">
          {hasVoted ? (
            <View className="flex-1">
              <Button label={t('common.cancel')} variant="secondary" size="sm" onPress={() => { setSelected(poll.myVotes); setEditing(false); }} />
            </View>
          ) : null}
          <View className="flex-1">
            <Button label={t('gc.vote_submit')} size="sm" loading={voteMut.isPending} disabled={selected.length === 0} onPress={submit} />
          </View>
        </View>
      ) : poll.isOpen ? (
        <Pressable onPress={() => setEditing(true)} className="mt-3">
          <Text className="text-xs font-semibold text-brand-600">{hasVoted ? t('gc.vote_change') : t('gc.vote_now')}</Text>
        </Pressable>
      ) : null}

      <Text className="text-[11px] text-neutral-400 mt-2">
        {[
          t('gc.voters_count', { count: poll.totalVoters }),
          poll.closesAt ? t('gc.closes_at', { date: fmtDate(poll.closesAt, i18n.language) }) : null,
          poll.createdBy?.namaLengkap,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
    </View>
  );
}

const DURATIONS: { key: string; days: number | null }[] = [
  { key: 'gc.no_deadline', days: null },
  { key: 'gc.days_1', days: 1 },
  { key: 'gc.days_3', days: 3 },
  { key: 'gc.days_7', days: 7 },
];

function CreatePollModal({ root, visible, onClose }: { root: string; visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const showToast = useToast((s) => s.show);
  const errMsg = useErr();
  const mut = useCreateGroupPoll(root);
  const [pertanyaan, setPertanyaan] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [multiple, setMultiple] = useState(false);
  const [days, setDays] = useState<number | null>(null);
  const [notify, setNotify] = useState(true);
  const filled = options.map((o) => o.trim()).filter(Boolean);
  const close = () => {
    setPertanyaan('');
    setDeskripsi('');
    setOptions(['', '']);
    setMultiple(false);
    setDays(null);
    setNotify(true);
    onClose();
  };

  return (
    <Sheet visible={visible} title={t('gc.poll_create')} onClose={close}>
      <Text className="text-sm font-semibold text-neutral-800">{t('gc.poll_question')}</Text>
      <TextInput value={pertanyaan} onChangeText={setPertanyaan} maxLength={300} placeholder={t('gc.poll_question_ph')} placeholderTextColor="#A3A3A3" className={inputCls} />
      <Text className="text-sm font-semibold text-neutral-800">{t('gc.poll_desc')}</Text>
      <TextInput value={deskripsi} onChangeText={setDeskripsi} maxLength={2000} multiline className={inputCls} style={{ minHeight: 60, textAlignVertical: 'top' }} />
      <Text className="text-sm font-semibold text-neutral-800">{t('gc.poll_options')}</Text>
      {options.map((o, i) => (
        <View key={i} className="flex-row items-center gap-2">
          <TextInput
            value={o}
            onChangeText={(v) => setOptions(options.map((x, j) => (j === i ? v : x)))}
            maxLength={200}
            placeholder={t('gc.option_n', { n: i + 1 })}
            placeholderTextColor="#A3A3A3"
            className={`flex-1 ${inputCls}`}
          />
          {options.length > 2 ? (
            <Pressable hitSlop={8} onPress={() => setOptions(options.filter((_, j) => j !== i))}>
              <X size={16} color="#A3A3A3" />
            </Pressable>
          ) : null}
        </View>
      ))}
      {options.length < 10 ? (
        <Pressable onPress={() => setOptions([...options, ''])} className="flex-row items-center gap-1">
          <Plus size={14} color="#EA580C" />
          <Text className="text-sm font-semibold text-brand-600">{t('gc.add_option')}</Text>
        </Pressable>
      ) : null}
      <ToggleRow label={t('gc.poll_allow_multiple')} value={multiple} onChange={setMultiple} />
      <Text className="text-sm font-semibold text-neutral-800">{t('gc.deadline')}</Text>
      <View className="flex-row flex-wrap gap-2">
        {DURATIONS.map((d) => {
          const on = days === d.days;
          return (
            <Pressable
              key={d.key}
              onPress={() => setDays(d.days)}
              {...gx(`px-3 py-1.5 rounded-full border ${on ? 'bg-brand-500 border-brand-500' : 'bg-white border-neutral-300'}`)}
            >
              <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-neutral-700'}`}>{t(d.key)}</Text>
            </Pressable>
          );
        })}
      </View>
      <ToggleRow label={t('gc.notify_members')} value={notify} onChange={setNotify} />
      <Button
        label={t('gc.publish')}
        loading={mut.isPending}
        disabled={pertanyaan.trim().length < 3 || filled.length < 2}
        onPress={() =>
          mut.mutate(
            {
              pertanyaan: pertanyaan.trim(),
              deskripsi: deskripsi.trim() || null,
              options: filled,
              multiple,
              closesAt: days ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
              notify,
            },
            {
              onSuccess: () => {
                showToast(t('gc.poll_created'), 'success');
                close();
              },
              onError: (e) => showToast(errMsg(e), 'error'),
            },
          )
        }
      />
    </Sheet>
  );
}

// ============================================================ File

function FilesTab({ root, canManage }: { root: string; canManage: boolean }) {
  const { t } = useTranslation();
  const showToast = useToast((s) => s.show);
  const errMsg = useErr();
  const q = useGroupFiles(root);
  const uploadMut = useUploadGroupFile(root);
  const deleteMut = useDeleteGroupFile(root);
  const [uploading, setUploading] = useState(false);
  const rows = q.data ?? [];
  return (
    <View>
      {canManage ? <AddButton label={t('gc.file_upload')} onPress={() => setUploading(true)} /> : null}
      {q.isLoading ? (
        <Empty text={t('common.loading')} />
      ) : rows.length === 0 ? (
        <Empty text={t('gc.file_empty')} />
      ) : (
        <MaterialList
          files={rows}
          onDelete={canManage ? (f) => deleteMut.mutate(f.id, { onError: (e) => showToast(errMsg(e), 'error') }) : undefined}
        />
      )}
      <UploadMaterialModal
        visible={uploading}
        loading={uploadMut.isPending}
        onClose={() => setUploading(false)}
        onSubmit={(v) =>
          uploadMut.mutate(v, {
            onSuccess: () => {
              showToast(t('gc.file_uploaded'), 'success');
              setUploading(false);
            },
            onError: (e) => showToast(errMsg(e), 'error'),
          })
        }
      />
    </View>
  );
}
