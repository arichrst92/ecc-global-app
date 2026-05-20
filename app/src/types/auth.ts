// Auth-specific types untuk endpoints di section 1 + 12.1 mobile-api-guide

import type { User } from './api';

export type OtpPurpose = 'LOGIN' | 'ENROLLMENT' | 'RESET_FACE';

export type RequestOtpPayload = {
  noHp: string; // E.164 format
  purpose?: OtpPurpose; // default LOGIN
};

export type VerifyOtpPayload = {
  noHp: string;
  kode: string; // 6-digit
  purpose?: OtpPurpose;
};

export type RegisterPayload = {
  noHp: string;
  namaLengkap: string;
  tanggalLahir: string; // ISO date "YYYY-MM-DD"
  jenisKelamin: 'L' | 'P';
  alamat: string;
  cabangId: string;
  homecellId?: string | null;
  fotoBase64?: string;
};

export type AuthSuccessData = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
};

export type FaceLoginPayload = {
  noHp: string;
  descriptor: number[]; // 128-dim Float32 array
};

export type LogoutPayload = {
  refreshToken: string;
};
