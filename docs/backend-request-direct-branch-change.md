# Backend Request: Direct branch change (no approval)

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-21
**Priority**: 🟡 **MEDIUM** — UX simplification
**Status**: ✅ **RESOLVED** (BE patch 2026-05-22a)

## TL;DR

UX decision: jemaat bisa ganti cabang home **langsung** tanpa admin approval. Saat ini flow pakai `branch-change-request` (POST + admin approve).

## Request

Accept `cabangId` field di **`PATCH /admin/me`** payload, langsung update `Jemaat.cabangId`. Validasi: `cabangId` harus valid (exist + active).

```typescript
// Mobile sekarang call
PATCH /admin/me
{ "cabangId": "<uuid-cabang-baru>" }

// Expected response: updated MeProfile (200 OK)
```

## Mobile-side changes (done)

- `src/api/me.ts` `updateMyProfile` accept `cabangId` field
- `app/settings/change-branch.tsx` simplified — no more reason text + history modal, langsung tap → confirm → PATCH → done

## Yang bisa di-deprecate di BE (post-confirm)

- `POST /admin/me/branch-change-request` — bisa keep untuk audit log, atau hapus
- `GET /admin/me/branch-change-requests` (list history) — same
- Admin portal approval queue — bisa hide / remove dari sidebar

## Audit trail (recommended keep)

Worth log `BranchChangeAudit { jemaatId, fromCabangId, toCabangId, changedAt }` setelah PATCH supaya ops bisa trace perpindahan. Trivial vs full approval flow.

## Action items BE

- [x] PATCH /admin/me accept `cabangId` field
- [x] Validate cabangId exists + active
- [x] Log audit row (`resource: 'jemaat_cabang'` untuk filterability)
- [x] Confirm via doc

---

## ✅ Backend Response — 2026-05-22 (patch 2026-05-22a)

Diapproved & implemented.

### Implementasi

1. **`selfEditJemaatSchema`** (shared-types/auth.ts) — tambah `cabangId: uuidSchema.optional()`. Comment di-update jelaskan ini bukan lagi "tidak boleh", patch 21h legacy comment diganti.

2. **PATCH /admin/me handler** (routes/admin/me.ts) — kalau `input.cabangId` beda dari `before.cabangId`:
   - Validate target cabang exists + isActive (400 kalau invalid)
   - Update via `cabang: { connect: { id } }` (proper Prisma relation update)
   - Skip kalau cabangId sama (no-op)

3. **Audit log** — separate row `resource: 'jemaat_cabang'` dengan `metadata: { kind: 'direct-branch-change-mobile', fromCabangId, toCabangId }` supaya ops bisa filter di /admin/audit-log. Self-edit umum tetap capture full before/after.

### Legacy endpoint

`POST /admin/me/branch-change-request` + admin queue **tetap ada** — TIDAK di-deprecate. Reason:
- Backward compat dengan portal admin queue (kalau ada PR yang submit reason untuk audit reason)
- Existing pending requests harus tetap bisa di-resolve admin
- Mobile boleh hapus tombol "Ajukan" + history modal, tapi BE endpoint tetap stay

Kalau mau dekonstruksi total nanti, file terkait:
- `apps/core-api/src/routes/admin/branch-change.ts` (admin queue)
- `apps/core-api/src/routes/admin/me.ts` line ~688+ (user submit + history endpoints)
- `apps/portal/src/app/dashboard/branch-change/page.tsx` (admin UI)

### Mobile call shape (langsung)

```typescript
PATCH /admin/me
Authorization: Bearer <JWT>

{ "cabangId": "<uuid-cabang-baru>" }

// → 200 OK with updated Jemaat
// → 400 "Cabang tujuan tidak ditemukan." kalau ID invalid
// → 400 "Cabang tujuan nonaktif." kalau isActive=false
```

### Git

```bash
cd /Users/idea/Projects/ecc-core-platform
git add packages/shared-types/src/schemas/auth.ts \
        apps/core-api/src/routes/admin/me.ts \
        docs/mobile-api-guide.md \
        knowledge-base.md
git commit -m "feat(profile): direct branch change via PATCH /admin/me { cabangId }

Mobile request backend-request-direct-branch-change.md — trust-based
direct cabang change tanpa admin approval. Audit log keep untuk
traceability (resource: 'jemaat_cabang'). Legacy branch-change-request
flow tetap ada untuk backward compat.

Refs: ecc-mobile-app/docs/backend-request-direct-branch-change.md"
git push
```

Combined push commands ada di response file lain (`ministry-endpoints.md`) — boleh sekalian satu push kalau mau bundle semua patch hari ini.
