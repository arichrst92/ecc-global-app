// Common API response envelope dari ECC Core API

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'CONSTRAINT_UNIQUE'
  | 'CONSTRAINT_RELATION'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR';

export type ApiErrorBody = {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: {
      formErrors?: string[];
      fieldErrors?: Record<string, string[]>;
    };
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export type Paginated<T> = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
} & { data: T[] };

// Domain types
export type Jemaat = {
  id: string;
  kode: string;
  namaLengkap: string;
  noHp?: string;
  fotoUrl?: string | null;
  isActive: boolean;
  cabang: { id: string; nama: string };
};

export type MenuAccess = Record<
  string,
  { canRead: boolean; canWrite?: boolean; canDelete?: boolean }
>;

/**
 * Onboarding wizard hint per BE notice magic-link 2026-07-28.
 * BE include field ini di login response kalau `needsOnboarding=true`,
 * supaya mobile tau step mana yang mandatory di wizard.
 */
export type OnboardingReason = {
  /** True kalau jemaat belum punya noHp — wizard Step 1 (add noHp via OTP WA). */
  missingNoHp: boolean;
  /** List field profile yang wajib diisi di Step 2 (jenisKelamin, tanggalLahir, dll). */
  missingProfile: string[];
};

export type User = {
  id: string;
  jemaatId: string;
  namaLengkap: string;
  noHp: string;
  kode: string;
  isFulltimer: boolean;
  canAccessPortal: boolean;
  menuAccess: MenuAccess;
  /** BE retain field 90 hari pasca face removal (M33). Mobile tidak baca
   *  — optional supaya tidak break parsing kalau BE drop di response. */
  hasFaceEnrolled?: boolean;
  fotoUrl?: string | null;
  /** Email jemaat — dari BE notice magic-link 2026-07-28. Optional karena
   *  legacy user pre-migration mungkin belum punya. */
  email?: string | null;
  /** Kalau true, mobile wajib route ke onboarding wizard first-login
   *  sebelum masuk main app. Per BE notice magic-link 2026-07-28. */
  needsOnboarding?: boolean;
  /** Hint field yang missing untuk driving wizard step visibility.
   *  Cuma populated kalau needsOnboarding=true. */
  onboardingReason?: OnboardingReason;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  user: User;
};

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  details?: ApiErrorBody['error']['details'];

  constructor(body: ApiErrorBody['error'], status: number) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.status = status;
    this.details = body.details;
  }
}
