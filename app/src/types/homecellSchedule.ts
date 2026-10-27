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
  /** "HH:MM" — null untuk jadwal lama. */
  jamMulai?: string | null;
  jamSelesai?: string | null;
  lokasi: string;
  catatan: string | null;
  createdBy: string;
  creator: { id: string; namaLengkap: string };
  /** ISO datetime */
  createdAt: string;
  attendanceCount: number;
  /** Tamu hadir — dicatat terpisah, tidak masuk % kehadiran anggota. */
  tamuCount?: number;
};

/** Tamu yang hadir di satu pertemuan homecell. */
export type HomecellTamuAttendance = {
  id: string;
  createdAt: string;
  tamu: { id: string; namaLengkap: string; noHp: string | null };
  markedBy: { id: string; namaLengkap: string } | null;
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

/** File materi pertemuan (PDF/gambar/dokumen) — diupload PIC/admin. */
export type HomecellScheduleFile = {
  id: string;
  nama: string;
  deskripsi: string | null;
  fileUrl: string;
  fileMime: string;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
  uploadedBy: { id: string; namaLengkap: string } | null;
};

export type HomecellScheduleDetail = HomecellSchedule & {
  files?: HomecellScheduleFile[];
  memberCount: number;
  attendances: HomecellAttendance[];
  missingMembers: Array<{
    jemaatId: string;
    namaLengkap: string;
    /** Bisa null — jemaat lama yang belum punya kode. */
    kode: string | null;
  }>;
  tamuAttendances?: HomecellTamuAttendance[];
  /** Tamu homecell yang belum ditandai hadir di pertemuan ini. */
  tamuBelumHadir?: Array<{ id: string; namaLengkap: string; noHp: string | null }>;
};

export type CreateSchedulePayload = {
  tanggal: string;
  jamMulai?: string | null;
  jamSelesai?: string | null;
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

/** Per-row result dari bulk endpoint. Per BE delivery 2026-10-09. */
export type BulkAttendanceRowResult =
  | {
      kode: string;
      status: 'recorded' | 'already_attended';
      attendance: {
        id: string;
        jemaat: HomecellAttendance['jemaat'];
        scannedAt: string;
      };
    }
  | {
      kode: string;
      jemaatId?: string | null;
      status: 'error';
      error: { code: string; message: string };
    };

export type BulkAttendanceResponse = {
  scheduleId: string;
  /** Total setelah bulk (termasuk yang already_attended + newly recorded) */
  attendanceCount: number;
  /** Baru di-record di call ini (exclude already_attended) */
  newlyRecordedCount: number;
  results: BulkAttendanceRowResult[];
};
