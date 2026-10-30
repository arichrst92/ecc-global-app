/**
 * Persetujuan S&K + Kebijakan Privasi (kepatuhan no. 2).
 *   GET  /admin/me/consent → status (perlu setuju ulang atau tidak)
 *   POST /admin/me/consent → catat persetujuan
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './client';

export type ConsentAgeGroup = 'ADULT' | 'MINOR_WITH_GUARDIAN';

export interface ConsentStatus {
  required: boolean;
  /** Tanggal lahir tercatat (YYYY-MM-DD). */
  birthDate?: string | null;
  current: { termsVersion: string | null; privacyVersion: string | null };
  latest: { termsVersion: string; privacyVersion: string; ageGroup: string | null; acceptedAt: string } | null;
}

export interface ConsentPayload {
  acceptTerms: true;
  sensitiveData: true;
  ageGroup: ConsentAgeGroup;
  language?: string;
  platform?: string;
  appVersion?: string;
  /** Koreksi tanggal lahir (YYYY-MM-DD) bila data tercatat salah. */
  tanggalLahir?: string;
}

export function buildConsentPayload(ageGroup: ConsentAgeGroup, language: string): ConsentPayload {
  return {
    acceptTerms: true,
    sensitiveData: true,
    ageGroup,
    language: language.slice(0, 5),
    platform: Platform.OS,
    appVersion: (Constants.expoConfig?.version ?? '').slice(0, 20) || undefined,
  };
}

export function getConsentStatus() {
  return api.get<ConsentStatus>('/admin/me/consent');
}

export function acceptConsent(payload: ConsentPayload) {
  return api.post<ConsentStatus>('/admin/me/consent', payload);
}
