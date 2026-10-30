// Maintenance mode types per BE handoff 2026-05-23.
// Endpoint: GET /public/maintenance (no auth, polling-friendly)

export type MaintenanceStatus = {
  isEnabled: boolean;
  message: string | null;
  /** Pesan bahasa Inggris (server baru); kosong → teks bawaan English. */
  messageEn?: string | null;
  startedAt: string | null;
  estimatedEndAt: string | null;
};
