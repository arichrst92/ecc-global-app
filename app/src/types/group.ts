/**
 * Group (Module 23) types — per BE notice group-endpoints 2026-07-28.
 *
 * Group ≠ Homecell:
 * - Homecell: strict cellgroup pemuridan (module 10)
 * - Group: generic grouping — family / ministry / community / homecell-style / system / lainnya
 *
 * Public vs Private:
 * - Public: visible di listing, self-join tanpa approval
 * - Private: hidden dari listing, join via kode invitation 8-char (QR scan)
 */

/**
 * Enum jenis group (per BE Prisma schema).
 * SYSTEM = system-managed group (auto), user tidak bisa create.
 * LAINNYA = fallback default.
 */
export type GroupJenis =
  | 'FAMILY'
  | 'MINISTRY'
  | 'COMMUNITY'
  | 'HOMECELL_STYLE'
  | 'SYSTEM'
  | 'LAINNYA';

/** Ringkasan cabang untuk nested response. */
export type GroupCabangRef = {
  id: string;
  nama: string;
  kode?: string;
};

/** Ringkasan PIC untuk nested response. */
export type GroupPicRef = {
  id: string;
  namaLengkap: string;
  fotoUrl?: string | null;
};

/** Group summary — dari `GET /admin/group` list endpoint. */
export type Group = {
  id: string;
  cabangId: string;
  parentId: string | null;
  nama: string;
  deskripsi?: string | null;
  jenis: GroupJenis;
  alamat?: string | null;
  gps?: string | null;
  hari?: string | null; // MINGGU/SENIN/... atau custom string
  jam?: string | null; // "19:00"
  picJemaatId: string | null;
  isPublic: boolean;
  /** Kode invitation 8-char alphanumeric. Cuma visible untuk PIC + Fulltimer.
   *  Public group: null.
   *  Private group + non-PIC: null (BE hide). */
  joinCode: string | null;
  isActive: boolean;
  legacyShiftsoftCircleId?: number | null;
  createdAt: string;
  updatedAt: string;
  cabang: GroupCabangRef;
  picJemaat: GroupPicRef | null;
  memberCount: number;
  childrenCount: number;
};

/** Member di group detail — nested di `GET /admin/group/:id`. */
export type GroupMember = {
  id: string; // membership UUID
  groupId: string;
  jemaatId: string;
  tanggalBergabung: string; // ISO date
  tanggalKeluar: string | null;
  isActive: boolean;
  catatan: string | null;
  jemaat: {
    id: string;
    namaLengkap: string;
    fotoUrl?: string | null;
    noHp?: string | null;
  };
};

/** Group children ringkas — untuk hierarchy nav di detail. */
export type GroupChildRef = {
  id: string;
  nama: string;
  jenis: GroupJenis;
  _count: {
    members: number;
  };
};

/** Group parent ringkas untuk breadcrumb. */
export type GroupParentRef = {
  id: string;
  nama: string;
};

/** Group detail response — `GET /admin/group/:id`. */
export type GroupDetail = Group & {
  parent: GroupParentRef | null;
  children: GroupChildRef[];
  members: GroupMember[];
};

/** Membership row untuk My Groups — `GET /admin/me/group-membership`. */
export type GroupMembership = {
  membershipId: string;
  tanggalBergabung: string;
  group: {
    id: string;
    nama: string;
    jenis: GroupJenis;
    isPublic: boolean;
    cabang: GroupCabangRef;
    picJemaat: GroupPicRef | null;
    memberCount: number;
  };
};

/** Query params untuk `GET /admin/group` list. */
export type ListGroupsParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  cabangId?: string;
  jenis?: GroupJenis;
  parentId?: string | 'root' | 'null';
};

/** Paginated wrapper untuk list response. */
export type ListGroupsResponse = {
  data: Group[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/** Payload create group — `POST /admin/group`. */
export type CreateGroupPayload = {
  cabangId: string;
  parentId?: string | null;
  nama: string;
  deskripsi?: string;
  jenis?: GroupJenis;
  alamat?: string;
  gps?: string;
  hari?: string;
  jam?: string;
  picJemaatId?: string;
  isPublic?: boolean;
  isActive?: boolean;
};

/** Payload update group — `PATCH /admin/group/:id`. Semua field optional. */
export type UpdateGroupPayload = Partial<CreateGroupPayload>;

/** Response add member — `POST /admin/group/:id/members/:jemaatId`. */
export type AddMemberResponse = {
  alreadyMember: boolean;
};

/** Response join by code — `POST /admin/group/join-by-code`. */
export type JoinByCodeResponse = {
  groupId: string;
  groupNama: string;
  alreadyMember?: boolean;
};

/** Response regenerate code — `POST /admin/group/:id/regenerate-code`. */
export type RegenerateCodeResponse = {
  id: string;
  joinCode: string;
};

/**
 * Helper — icon + label untuk jenis group (untuk UI).
 * Copy-friendly untuk Indonesian label.
 */
export const GROUP_JENIS_LABELS: Record<GroupJenis, { id: string; en: string; emoji: string }> = {
  FAMILY: { id: 'Keluarga', en: 'Family', emoji: '👨‍👩‍👧‍👦' },
  MINISTRY: { id: 'Pelayanan', en: 'Ministry', emoji: '🤝' },
  COMMUNITY: { id: 'Komunitas', en: 'Community', emoji: '🌟' },
  HOMECELL_STYLE: { id: 'Homecell', en: 'Homecell', emoji: '🏠' },
  SYSTEM: { id: 'Sistem', en: 'System', emoji: '⚙️' },
  LAINNYA: { id: 'Lainnya', en: 'Other', emoji: '📌' },
};
