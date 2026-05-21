/**
 * Scanner API — mobile-api-guide section 4.3, 5.5, 12.4, 12.5.
 * Volunteer check-in via QR scan kartu jemaat.
 */

import { api } from './client';
import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/api';
import type {
  ScannerEvent,
  ScannerIbadah,
  IbadahCheckinResult,
  EventCheckinResult,
  CheckinMeta,
  IbadahCheckinStats,
  EventCheckinStats,
} from '@/types/scanner';

/** GET /admin/me/scanner-events — events yang user authorized scan */
export function listScannerEvents() {
  return api.get<ScannerEvent[]>('/admin/me/scanner-events');
}

/** GET /admin/me/scanner-ibadah — ibadah yang user authorized scan */
export function listScannerIbadah() {
  return api.get<ScannerIbadah[]>('/admin/me/scanner-ibadah');
}

type IbadahCheckinPayload = {
  kode: string;
  tanggalIbadah?: string; // default = today di BE
  force?: boolean;
};

type IbadahCheckinResponse = {
  data: IbadahCheckinResult;
  meta: CheckinMeta;
};

/**
 * POST /admin/ibadah/:id/checkin — check-in jemaat via kode QR.
 * Custom shape karena perlu akses meta (alreadyCheckedIn + walkIn).
 */
export async function checkinIbadah(
  ibadahId: string,
  payload: IbadahCheckinPayload,
): Promise<IbadahCheckinResponse> {
  const accessToken = useAuthStore.getState().accessToken;
  const res = await fetch(`${env.apiBaseUrl}/admin/ibadah/${ibadahId}/checkin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as
    | { success: true; data: IbadahCheckinResult; meta?: CheckinMeta }
    | { success: false; error: { code: string; message: string } };
  if (!json.success) {
    throw new ApiError(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { code: json.error.code as any, message: json.error.message },
      res.status,
    );
  }
  return {
    data: json.data,
    meta: json.meta ?? { alreadyCheckedIn: false },
  };
}

type EventCheckinPayload = {
  kode: string;
  force?: boolean;
};

type EventCheckinResponse = {
  data: EventCheckinResult;
  meta: CheckinMeta;
};

/** POST /admin/event/:id/checkin — check-in event */
export async function checkinEvent(
  eventId: string,
  payload: EventCheckinPayload,
): Promise<EventCheckinResponse> {
  const accessToken = useAuthStore.getState().accessToken;
  const res = await fetch(`${env.apiBaseUrl}/admin/event/${eventId}/checkin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as
    | { success: true; data: EventCheckinResult; meta?: CheckinMeta }
    | { success: false; error: { code: string; message: string } };
  if (!json.success) {
    throw new ApiError(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { code: json.error.code as any, message: json.error.message },
      res.status,
    );
  }
  return {
    data: json.data,
    meta: json.meta ?? { alreadyCheckedIn: false },
  };
}

/** GET /admin/ibadah/:id/checkin/stats?tanggalIbadah=YYYY-MM-DD */
export function getIbadahCheckinStats(ibadahId: string, tanggalIbadah: string) {
  return api.get<IbadahCheckinStats>(
    `/admin/ibadah/${ibadahId}/checkin/stats?tanggalIbadah=${tanggalIbadah}`,
  );
}

/** GET /admin/event/:id/checkin/stats */
export function getEventCheckinStats(eventId: string) {
  return api.get<EventCheckinStats>(`/admin/event/${eventId}/checkin/stats`);
}
