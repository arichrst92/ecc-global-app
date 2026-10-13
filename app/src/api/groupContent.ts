/** Konten group: file, pengumuman, voting. */
import { api } from './client';
import type { PickedFile } from './homecellSchedule';
import type {
  CreateAnnouncementPayload,
  CreatePollPayload,
  GroupAnnouncement,
  GroupFile,
  GroupPoll,
} from '@/types/groupContent';

const base = (groupId: string) => `/admin/group/${groupId}`;

// ---- File
export const listGroupFiles = (groupId: string) => api.get<GroupFile[]>(`${base(groupId)}/files`);

export function uploadGroupFile(groupId: string, file: PickedFile, meta: { nama: string; deskripsi?: string }) {
  const fd = new FormData();
  fd.append('nama', meta.nama);
  if (meta.deskripsi) fd.append('deskripsi', meta.deskripsi);
  if (file.file) fd.append('file', file.file);
  else
    fd.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? 'application/octet-stream',
    } as unknown as Blob);
  return api.upload<GroupFile>(`${base(groupId)}/files`, fd);
}

export const deleteGroupFile = (groupId: string, fileId: string) =>
  api.delete<{ id: string }>(`${base(groupId)}/files/${fileId}`);

// ---- Pengumuman
export const listGroupAnnouncements = (groupId: string) =>
  api.get<GroupAnnouncement[]>(`${base(groupId)}/announcements`);

export const createGroupAnnouncement = (groupId: string, body: CreateAnnouncementPayload) =>
  api.post<GroupAnnouncement>(`${base(groupId)}/announcements`, body);

export const updateGroupAnnouncement = (groupId: string, annId: string, body: Partial<CreateAnnouncementPayload>) =>
  api.patch<GroupAnnouncement>(`${base(groupId)}/announcements/${annId}`, body);

export const deleteGroupAnnouncement = (groupId: string, annId: string) =>
  api.delete<{ id: string }>(`${base(groupId)}/announcements/${annId}`);

// ---- Voting
export const listGroupPolls = (groupId: string) => api.get<GroupPoll[]>(`${base(groupId)}/polls`);

export const createGroupPoll = (groupId: string, body: CreatePollPayload) =>
  api.post<GroupPoll>(`${base(groupId)}/polls`, body);

export const updateGroupPoll = (groupId: string, pollId: string, body: { isClosed?: boolean }) =>
  api.patch<GroupPoll>(`${base(groupId)}/polls/${pollId}`, body);

export const deleteGroupPoll = (groupId: string, pollId: string) =>
  api.delete<{ id: string }>(`${base(groupId)}/polls/${pollId}`);

/** optionIds kosong = tarik suara. */
export const voteGroupPoll = (groupId: string, pollId: string, optionIds: string[]) =>
  api.post<GroupPoll>(`${base(groupId)}/polls/${pollId}/vote`, { optionIds });
