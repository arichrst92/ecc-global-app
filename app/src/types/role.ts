/**
 * Role + sub-role lookups untuk signup picker.
 * Per BE request 2026-05-23 (docs/backend-request-signup-role-assignment.md).
 */

export type FulltimerSubRole = {
  id: string;
  /** Display name, mis. "Administration", "Worship", "Tech", dst */
  nama: string;
  /** Optional description untuk hint di picker */
  deskripsi?: string;
};
