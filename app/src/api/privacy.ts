/** Pengaturan privasi data pribadi — /admin/me/privacy */
import { api } from './client';

export const PRIVACY_FIELDS = [
  'noHp',
  'email',
  'tanggalLahir',
  'ulangTahun',
  'alamat',
  'pekerjaan',
  'pernikahan',
  'keluarga',
] as const;
export type PrivacyField = (typeof PRIVACY_FIELDS)[number];

export const PRIVACY_AUDIENCES = ['KELUARGA', 'HOMECELL', 'AREA', 'GROUP', 'PELAYANAN', 'CABANG', 'SEMUA'] as const;
export type PrivacyAudience = (typeof PRIVACY_AUDIENCES)[number];

export type PrivacySettings = Record<PrivacyField, PrivacyAudience[]>;

export type MyPrivacy = {
  settings: PrivacySettings;
  discoverableByPhone: boolean;
  defaults?: PrivacySettings;
};

export const getMyPrivacy = () => api.get<MyPrivacy>('/admin/me/privacy');

export const updateMyPrivacy = (body: { settings?: Partial<PrivacySettings>; discoverableByPhone?: boolean }) =>
  api.put<MyPrivacy>('/admin/me/privacy', body);
