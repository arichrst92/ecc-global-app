// Ministry Schedule / Roster types — mobile-side per
// `docs/backend-request-ministry-schedule-roster.md` (2026-09-02), updated
// per `docs/be-update-2026-09-02-event-window-and-ministry-schedule.md`
// (BE delivered dengan beberapa extra field dibanding request original:
// `ibadahJamSelesai`, `catatan` schedule-level, `ibadahId`/`posisiLevel` di
// MyMinistryAssignment, `fotoUrl` di coServants).
//
// BE endpoints sudah delivered (2026-09-02). Hooks (lihat `useMinistry.ts`)
// tetap gracefully fallback ke [] kalau BE balas 404 (defensive, in case
// deploy ke production belum jalan di environment tertentu).

/** Satu assignment (jemaat + posisi) dalam sebuah schedule/roster entry. */
export type ScheduleAssignment = {
  id: string;
  jemaatId: string;
  jemaatNama: string;
  jemaatFotoUrl: string | null;
  posisi: string;
  posisiLevel: number;
  notes: string | null;
};

/** Dari GET /admin/ministry/:id/schedule — satu occurrence ibadah + assignments. */
export type MinistrySchedule = {
  id: string;
  tanggal: string; // "YYYY-MM-DD"
  ibadahId: string | null;
  ibadahNama: string;
  ibadahJamMulai: string; // "HH:mm"
  ibadahJamSelesai: string; // "HH:mm"
  ibadahLokasi: string;
  /** Catatan schedule-level (beda dari per-assignment `notes`). */
  catatan: string | null;
  assignments: ScheduleAssignment[];
};

/** Dari GET /admin/me/ministry-schedule — assignment cross-ministry untuk current user. */
export type MyMinistryAssignment = {
  id: string;
  tanggal: string;
  ibadahId: string;
  ibadahNama: string;
  ibadahJamMulai: string;
  ibadahJamSelesai: string;
  ibadahLokasi: string;
  ministryId: string;
  ministryNama: string;
  posisi: string;
  posisiLevel: number;
  notes: string | null;
  coServants: Array<{
    jemaatId: string;
    namaLengkap: string;
    fotoUrl: string | null;
    posisi: string;
  }>;
};
