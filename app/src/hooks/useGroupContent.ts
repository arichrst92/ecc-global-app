/** React-query hooks konten group/homecell. `root` = prefix API (lihat api/groupContent). */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createGroupAnnouncement,
  createGroupPoll,
  deleteGroupAnnouncement,
  deleteGroupFile,
  deleteGroupPoll,
  listGroupAnnouncements,
  listGroupFiles,
  listGroupPolls,
  updateGroupAnnouncement,
  updateGroupPoll,
  uploadGroupFile,
  voteGroupPoll,
  uploadGroupHero,
  deleteGroupHero,
} from '@/api/groupContent';
import type { PickedFile } from '@/api/homecellSchedule';
import type { CreateAnnouncementPayload, CreatePollPayload } from '@/types/groupContent';

export const GROUP_CONTENT_KEYS = {
  files: (root: string) => ['board', root, 'files'] as const,
  announcements: (root: string) => ['board', root, 'announcements'] as const,
  polls: (root: string) => ['board', root, 'polls'] as const,
};

export const useGroupFiles = (root: string, enabled = true) =>
  useQuery({ queryKey: GROUP_CONTENT_KEYS.files(root), queryFn: () => listGroupFiles(root), enabled: !!root && enabled });

export const useGroupAnnouncements = (root: string, enabled = true) =>
  useQuery({
    queryKey: GROUP_CONTENT_KEYS.announcements(root),
    queryFn: () => listGroupAnnouncements(root),
    enabled: !!root && enabled,
  });

export const useGroupPolls = (root: string, enabled = true) =>
  useQuery({ queryKey: GROUP_CONTENT_KEYS.polls(root), queryFn: () => listGroupPolls(root), enabled: !!root && enabled });

export function useUploadGroupFile(root: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { file: PickedFile; nama: string; deskripsi?: string }) =>
      uploadGroupFile(root, v.file, { nama: v.nama, deskripsi: v.deskripsi }),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.files(root) }),
  });
}

export function useDeleteGroupFile(root: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => deleteGroupFile(root, fileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.files(root) }),
  });
}

export function useCreateGroupAnnouncement(root: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAnnouncementPayload) => createGroupAnnouncement(root, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.announcements(root) }),
  });
}

export function useUpdateGroupAnnouncement(root: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; body: Partial<CreateAnnouncementPayload> }) => updateGroupAnnouncement(root, v.id, v.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.announcements(root) }),
  });
}

export function useDeleteGroupAnnouncement(root: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGroupAnnouncement(root, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.announcements(root) }),
  });
}

export function useCreateGroupPoll(root: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePollPayload) => createGroupPoll(root, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.polls(root) }),
  });
}

export function useUpdateGroupPoll(root: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; isClosed: boolean }) => updateGroupPoll(root, v.id, { isClosed: v.isClosed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.polls(root) }),
  });
}

export function useDeleteGroupPoll(root: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGroupPoll(root, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.polls(root) }),
  });
}

export function useVoteGroupPoll(root: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { pollId: string; optionIds: string[] }) => voteGroupPoll(root, v.pollId, v.optionIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.polls(root) }),
  });
}

// ---- Hero image group (PIC)
export function useUploadGroupHero(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: PickedFile) => uploadGroupHero(groupId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group'] }),
  });
}

export function useDeleteGroupHero(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteGroupHero(groupId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group'] }),
  });
}
