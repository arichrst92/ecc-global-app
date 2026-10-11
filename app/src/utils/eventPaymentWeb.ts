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
import * as WebBrowser from 'expo-web-browser';

import { requestWebActionToken } from '@/api/auth';

export function buildEventPaymentWebUrl(eventId: string, token?: string | null) {
  const base = `https://eccchurch.global/event/${encodeURIComponent(eventId)}/pembayaran`;
  return token ? `${base}?wt=${encodeURIComponent(token)}` : base;
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
