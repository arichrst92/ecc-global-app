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

export type User = {
  id: string;
  jemaatId: string;
  namaLengkap: string;
  noHp: string;
  kode: string;
  isFulltimer: boolean;
  canAccessPortal: boolean;
  menuAccess: MenuAccess;
  hasFaceEnrolled: boolean;
  fotoUrl?: string | null;
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
