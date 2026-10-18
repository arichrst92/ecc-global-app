/**
 * Buka halaman web pembayaran event (NOMINAL_BEBAS) dengan web action token.
 *
 * Flow (Opsi A, docs/backend-request-event-bebas-web-action-token.md):
 * 1. Minta token sekali pakai ke BE (terikat jemaat + event)
 * 2. Buka `https://eccchurch.global/event/{id}/pembayaran?wt={token}` →
 *    web exchange token jadi session → user bisa daftar + upload bukti di web
 * 3. Web tombol "Kembali ke Els App" → `ecc://payment-done` → browser auto-dismiss
 *
 * Fallback: kalau token gagal (endpoint belum di-deploy, offline, dll) → buka
 * web TANPA token (mode read-only seperti sebelumnya). Tidak ada regresi.
 *
 * openAuthSessionAsync (Custom Tabs / ASWebAuthenticationSession) dipakai
 * supaya URL /event/* tidak di-intercept App Links intent filter app sendiri
 * dan supaya redirect `ecc://payment-done` menutup browser.
 */
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { requestWebActionToken } from '@/api/auth';

export function buildEventPaymentWebUrl(
  eventId: string,
  token?: string | null,
  returnUrl?: string | null,
) {
  // String builder (bukan URL.searchParams — belum lengkap di Hermes) supaya
  // URL native identik dengan sebelumnya.
  // /bayar/event/{id} (bukan /event/{id}/pembayaran): path /event/* di Android
  // ditangkap App Link app sendiri → browser pembayaran kembali ke app dan
  // tampil "Unmatched Route". /bayar/* bukan App Link / Universal Link.
  const base = `https://eccchurch.global/bayar/event/${encodeURIComponent(eventId)}`;
  const params: string[] = [];
  if (token) params.push(`wt=${encodeURIComponent(token)}`);
  // Hanya Els App web: landing menampilkan tombol kembali ke URL ini
  // (origin di-whitelist di landing). Native tidak mengirim `return`.
  if (returnUrl) params.push(`return=${encodeURIComponent(returnUrl)}`);
  return params.length ? `${base}?${params.join('&')}` : base;
}

/** Resolve setelah browser tertutup (user selesai / tutup manual). */
export async function openEventPaymentWeb(eventId: string): Promise<void> {
  let token: string | null = null;
  try {
    const res = await requestWebActionToken({ purpose: 'event-payment', eventId });
    token = res.token;
  } catch {
    // Fallback read-only — lihat doc di atas
  }
  // Web: ecc:// tidak bisa dipakai di browser → buka di tab yang sama, landing
  // menampilkan tombol "Kembali ke Els App" ke halaman ini. Sesi app tetap
  // tersimpan (localStorage), jadi kembali ke sini tidak perlu login ulang.
  if (Platform.OS === 'web') {
    window.location.assign(buildEventPaymentWebUrl(eventId, token, window.location.href));
    return;
  }
  try {
    await WebBrowser.openAuthSessionAsync(
      buildEventPaymentWebUrl(eventId, token),
      'ecc://payment-done',
      // iOS: skip alert "wants to use ... to Sign In" — session web pakai
      // cookie dari token exchange, tidak butuh cookie Safari.
      { preferEphemeralSession: true },
    );
  } catch {
    // Silent — caller tetap refresh status
  }
}
