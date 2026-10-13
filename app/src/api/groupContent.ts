/**
 * Konten group & homecell: file (group), pengumuman, voting.
 * `root` = prefix API: `/admin/group/:id` atau `/admin/homecell/:id`.
 */
import { api } from './client';
import type { PickedFile } from './homecellSchedule';
import type {
  CreateAnnouncementPayload,
  CreatePollPayload,
  GroupAnnouncement,
  GroupFile,
  GroupPoll,
} from '@/types/groupContent';

export const groupRoot = (groupId: string) => `/admin/group/${groupId}`;
export const homecellRoot = (homecellId: string) => `/admin/homecell/${homecellId}`;

// ---- File
export const listGroupFiles = (root: string) => api.get<GroupFile[]>(`${root}/files`);

export function uploadGroupFile(root: string, file: PickedFile, meta: { nama: string; deskripsi?: string }) {
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
  return api.upload<GroupFile>(`${root}/files`, fd);
}

export const deleteGroupFile = (root: string, fileId: string) =>
  api.delete<{ id: string }>(`${root}/files/${fileId}`);

// ---- Pengumuman
export const listGroupAnnouncements = (root: string) =>
  api.get<GroupAnnouncement[]>(`${root}/announcements`);

export const createGroupAnnouncement = (root: string, body: CreateAnnouncementPayload) =>
  api.post<GroupAnnouncement>(`${root}/announcements`, body);

export const updateGroupAnnouncement = (root: string, annId: string, body: Partial<CreateAnnouncementPayload>) =>
  api.patch<GroupAnnouncement>(`${root}/announcements/${annId}`, body);

export const deleteGroupAnnouncement = (root: string, annId: string) =>
  api.delete<{ id: string }>(`${root}/announcements/${annId}`);

// ---- Voting
export const listGroupPolls = (root: string) => api.get<GroupPoll[]>(`${root}/polls`);

export const createGroupPoll = (root: string, body: CreatePollPayload) =>
  api.post<GroupPoll>(`${root}/polls`, body);

export const updateGroupPoll = (root: string, pollId: string, body: { isClosed?: boolean }) =>
  api.patch<GroupPoll>(`${root}/polls/${pollId}`, body);

export const deleteGroupPoll = (root: string, pollId: string) =>
  api.delete<{ id: string }>(`${root}/polls/${pollId}`);

/** optionIds kosong = tarik suara. */
export const voteGroupPoll = (root: string, pollId: string, optionIds: string[]) =>
  api.post<GroupPoll>(`${root}/polls/${pollId}/vote`, { optionIds });

// ---- Hero image group (PIC)
export function uploadGroupHero(groupId: string, file: PickedFile) {
  const fd = new FormData();
  if (file.file) fd.append('file', file.file);
  else
    fd.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
  return api.upload<{ heroImageUrl: string }>(`/admin/group/${groupId}/hero`, fd);
}

export const deleteGroupHero = (groupId: string) =>
  api.delete<{ heroImageUrl: null }>(`/admin/group/${groupId}/hero`);
