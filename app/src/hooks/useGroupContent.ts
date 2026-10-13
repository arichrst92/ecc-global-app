/** React-query hooks konten group (file, pengumuman, voting). */
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
} from '@/api/groupContent';
import type { PickedFile } from '@/api/homecellSchedule';
import type { CreateAnnouncementPayload, CreatePollPayload } from '@/types/groupContent';

export const GROUP_CONTENT_KEYS = {
  files: (id: string) => ['group', 'content', id, 'files'] as const,
  announcements: (id: string) => ['group', 'content', id, 'announcements'] as const,
  polls: (id: string) => ['group', 'content', id, 'polls'] as const,
};

export const useGroupFiles = (groupId: string, enabled = true) =>
  useQuery({ queryKey: GROUP_CONTENT_KEYS.files(groupId), queryFn: () => listGroupFiles(groupId), enabled: !!groupId && enabled });

export const useGroupAnnouncements = (groupId: string, enabled = true) =>
  useQuery({
    queryKey: GROUP_CONTENT_KEYS.announcements(groupId),
    queryFn: () => listGroupAnnouncements(groupId),
    enabled: !!groupId && enabled,
  });

export const useGroupPolls = (groupId: string, enabled = true) =>
  useQuery({ queryKey: GROUP_CONTENT_KEYS.polls(groupId), queryFn: () => listGroupPolls(groupId), enabled: !!groupId && enabled });

export function useUploadGroupFile(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { file: PickedFile; nama: string; deskripsi?: string }) =>
      uploadGroupFile(groupId, v.file, { nama: v.nama, deskripsi: v.deskripsi }),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.files(groupId) }),
  });
}

export function useDeleteGroupFile(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => deleteGroupFile(groupId, fileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.files(groupId) }),
  });
}

export function useCreateGroupAnnouncement(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAnnouncementPayload) => createGroupAnnouncement(groupId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.announcements(groupId) }),
  });
}

export function useUpdateGroupAnnouncement(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; body: Partial<CreateAnnouncementPayload> }) => updateGroupAnnouncement(groupId, v.id, v.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.announcements(groupId) }),
  });
}

export function useDeleteGroupAnnouncement(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGroupAnnouncement(groupId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.announcements(groupId) }),
  });
}

export function useCreateGroupPoll(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePollPayload) => createGroupPoll(groupId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.polls(groupId) }),
  });
}

export function useUpdateGroupPoll(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; isClosed: boolean }) => updateGroupPoll(groupId, v.id, { isClosed: v.isClosed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.polls(groupId) }),
  });
}

export function useDeleteGroupPoll(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGroupPoll(groupId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.polls(groupId) }),
  });
}

export function useVoteGroupPoll(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { pollId: string; optionIds: string[] }) => voteGroupPoll(groupId, v.pollId, v.optionIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUP_CONTENT_KEYS.polls(groupId) }),
  });
}
