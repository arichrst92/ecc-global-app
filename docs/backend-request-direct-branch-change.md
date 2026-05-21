# Backend Request: Direct branch change (no approval)

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-21
**Priority**: 🟡 **MEDIUM** — UX simplification
**Status**: 🆕 **PROPOSED**

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

- [ ] PATCH /admin/me accept `cabangId` field
- [ ] Validate cabangId exists + active
- [ ] (Optional) Log audit row
- [ ] Confirm via doc atau Slack
