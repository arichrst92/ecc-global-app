/**
 * Homecell Schedule + Attendance types.
 * Per docs/backend-request-homecell-schedule-attendance.md.
 *
 * Status: pending BE deploy (2026-05-24). Mobile UI rendered defensive —
 * empty state saat endpoint 404, mutation graceful saat error.
 */

export type HomecellSchedule = {
  id: string;
  homecellId: string;
  /** YYYY-MM-DD */
  tanggal: string;
  lokasi: string;
  catatan: string | null;
  createdBy: string;
  creator: { id: string; namaLengkap: string };
  /** ISO datetime */
  createdAt: string;
  attendanceCount: number;
};

export type HomecellAttendance = {
  id: string;
  jemaatId: string;
  jemaat: {
    id: string;
    namaLengkap: string;
    kode: string;
    fotoUrl?: string | null;
  };
  scannedAt: string;
  scannedBy: string;
  scanner: { namaLengkap: string };
  source: 'QR_SCAN' | 'MANUAL';
};

export type HomecellScheduleDetail = HomecellSchedule & {
  memberCount: number;
  attendances: HomecellAttendance[];
  missingMembers: Array<{
    jemaatId: string;
    namaLengkap: string;
    kode: string;
  }>;
};

export type CreateSchedulePayload = {
  tanggal: string;
  lokasi: string;
  catatan?: string;
};

export type ScanAttendanceResponse = {
  id: string;
  scheduleId: string;
  jemaatId: string;
  jemaat: HomecellAttendance['jemaat'];
  scannedAt: string;
  alreadyAttended: boolean;
  attendanceCount: number;
};
