/**
 * Universal Form (2.5.1) — formulir yang disematkan di News / Event /
 * Announcement. Server: /admin/me/forms.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '@/api/client';
import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/api';

export type FormSourceType = 'NEWS' | 'EVENT' | 'ANNOUNCEMENT';
export type FormFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'RICHTEXT'
  | 'FILE'
  | 'EMAIL'
  | 'URL'
  | 'PHONE'
  | 'DATE'
  | 'DATE_RANGE'
  | 'DATETIME'
  | 'SELECT'
  | 'RADIO'
  | 'CHECKBOX'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'SIGNATURE'
  | 'INFO';

export type FormValidasi = {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  minDate?: string;
  maxDate?: string;
  notPast?: boolean;
  notFuture?: boolean;
  maxDays?: number;
  maxFiles?: number;
  maxSizeMb?: number;
  accept?: ('image' | 'pdf' | 'doc' | 'sheet' | 'slide' | 'text')[];
  domains?: string[];
  minSelect?: number;
  maxSelect?: number;
};

export type FormField = {
  id: string;
  tipe: FormFieldType;
  label: string;
  petunjuk: string | null;
  wajib: boolean;
  opsi: string[];
  validasi: FormValidasi;
  autofill: string | null;
  gaya: 'HEADING' | 'TEXT' | 'INFO' | 'WARNING' | null;
  isi: string | null;
};

export type FormResponseStatus = 'SUBMITTED' | 'NEEDS_FIX' | 'REJECTED';
export type FormResponseBrief = {
  id: string;
  status: FormResponseStatus;
  alasan: string | null;
  perbaikiSebelum: string | null;
  submittedAt: string;
  updatedAt: string;
};

export type FormWindowState = 'DRAFT' | 'NOT_OPEN' | 'OPEN' | 'CLOSED';

export type FormCard = {
  formId: string;
  judul: string;
  deskripsi: string | null;
  anonim: boolean;
  questionCount: number;
  state: FormWindowState;
  opensAt: string | null;
  deadline: string | null;
  autoCancel: boolean;
  multiResponse: boolean;
  allowEdit: boolean;
  perPeserta: boolean;
  subjects: { jemaatId: string; namaLengkap: string; fotoUrl: string | null; relasi: string; response: FormResponseBrief | null }[];
};

export type FormFile = { id: string; fieldId: string; kind: 'FILE' | 'SIGNATURE'; originalName: string; mime: string; sizeBytes: number; meta?: Record<string, unknown> | null };

export type FormDetail = {
  formId: string;
  src: string;
  konten: string | null;
  judul: string;
  deskripsi: string | null;
  anonim: boolean;
  pesanTerimaKasih: string | null;
  state: FormWindowState;
  opensAt: string | null;
  deadline: string | null;
  autoCancel: boolean;
  multiResponse: boolean;
  allowEdit: boolean;
  canSubmit: boolean;
  subject: { jemaatId: string; namaLengkap: string; relasi: string };
  subjects: { jemaatId: string; namaLengkap: string; relasi: string }[];
  signerName: string;
  fields: FormField[];
  autofill: Record<string, string>;
  response: (FormResponseBrief & { jawaban: Record<string, unknown>; files: FormFile[] }) | null;
};

export type MyFormResponse = FormResponseBrief & {
  formId: string;
  judul: string;
  src: string | null;
  konten: string | null;
  subjek: { jemaatId: string; namaLengkap: string };
  clientKind: string;
  fields: FormField[];
  jawaban: Record<string, unknown>;
  autofill: Record<string, string>;
  files: FormFile[];
};

const B = '/admin/me/forms';

export const getFormCards = (sourceType: FormSourceType, sourceId: string) => api.get<FormCard[]>(`${B}/by-source/${sourceType}/${sourceId}`);

export const getFormDetail = (formId: string, src: string, subjek?: string | null) =>
  api.get<FormDetail>(`${B}/${formId}?src=${encodeURIComponent(src)}${subjek ? `&subjek=${subjek}` : ''}`);

export const getMyFormResponse = (rid: string) => api.get<MyFormResponse>(`${B}/responses/${rid}`);

export const submitForm = (formId: string, body: { src: string; subjekJemaatId: string; jawaban: Record<string, unknown> }) =>
  api.post<{ id: string; status: FormResponseStatus; pesanTerimaKasih: string | null; edited: boolean }>(`${B}/${formId}/submit`, body);

export const deleteFormFile = (fileId: string) => api.delete<{ deleted: boolean }>(`${B}/files/${fileId}`);

export const uploadSignature = (formId: string, body: { fieldId: string; strokes: number[][]; width: number; height: number }) =>
  api.post<FormFile>(`${B}/${formId}/signature`, body);

/** URL file milik saya (butuh header Authorization). */
export const formFileUrl = (fileId: string) => `${env.apiBaseUrl}${B}/files/${fileId}`;

export type PickedFormFile = { uri: string; name: string; mimeType?: string | null; file?: File | Blob };

/**
 * Unggah satu file dengan progres (XMLHttpRequest — fetch tidak punya progres).
 * 401 → ulangi sekali lewat api.upload (refresh token ditangani di sana).
 */
export function uploadFormFile(formId: string, fieldId: string, f: PickedFormFile, onProgress?: (p: number) => void): Promise<FormFile> {
  const fd = () => {
    const d = new FormData();
    if (f.file) d.append('file', f.file as Blob, f.name);
    else d.append('file', { uri: f.uri, name: f.name, type: f.mimeType ?? 'application/octet-stream' } as unknown as Blob);
    return d;
  };
  const path = `${B}/${formId}/files?fieldId=${fieldId}`;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${env.apiBaseUrl}${path}`);
    const token = useAuthStore.getState().accessToken;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('X-Client', 'mobile');
    xhr.setRequestHeader('X-App-Version', `${Constants.expoConfig?.version ?? '0.0.0'}/${Platform.OS}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status === 401) {
        api.upload<FormFile>(path, fd()).then(resolve, reject);
        return;
      }
      try {
        const json = JSON.parse(xhr.responseText);
        if (json.success) resolve(json.data as FormFile);
        else reject(new ApiError(json.error, xhr.status));
      } catch {
        reject(new ApiError({ code: 'INTERNAL_ERROR', message: `Upload gagal (HTTP ${xhr.status})` }, xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError({ code: 'INTERNAL_ERROR', message: 'Upload gagal. Periksa koneksi internet.' }, 0));
    xhr.send(fd());
  });
}
