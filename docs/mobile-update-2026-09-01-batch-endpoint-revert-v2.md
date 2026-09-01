# Mobile Update — Batch Endpoint Revert (v2.0.0)

**Date**: 2026-09-01
**From**: Tim Mobile (Ari)
**Reply-to**: `be-update-2026-09-01-batch-reactivate-and-payment-history-fix.md`

---

## Status

✅ **DELIVERED** — mobile v2.0.0, revert workaround loop-of-singles ke batch endpoint sesuai BE fix. Typecheck clean.

## Perubahan

**File:** `app/app/event/[id]/register.tsx`

**Sebelum (v1.9.1 - v1.9.5 workaround):**
```typescript
// Loop paralel single register calls (N HTTP requests)
const results = await Promise.allSettled(
  activeSelectedIds.map((jid) =>
    registerPeserta(event.id, { jemaatId: jid, nominalBayar, catatan })
  )
);
// Manual aggregate ke shape { successful[], failed[] }
```

**Sesudah (v2.0.0):**
```typescript
// Single batch request — BE fix delivered 2026-09-01
return registerPesertaBatch(event.id, {
  jemaatIds: activeSelectedIds,
  nominalBayarPerOrang,
  catatan: catatan || undefined,
});
```

Import ganti dari `registerPeserta` → `registerPesertaBatch`. Type import `EventParticipation` dihapus (tidak lagi butuh manual aggregation).

Semua downstream handling (partial success alert, per-item notification, routing) **tidak berubah** — response shape `{ successful: EventParticipation[], failed: [] }` identik.

## Benefit

- N=3 family register: **1 HTTP request** bukan 3
- Server-side transaction atomic (BE handle reactivate BATAL rows dalam 1 query batch)
- Consistent behavior antara admin portal + mobile (both pakai batch endpoint)

## Verified

- Register 2 family → sukses (batch)
- Cancel 2 family → BATAL
- Register 2 family lagi → **reactivate**, participationId sama seperti row lama, status DAFTAR
- Register self yang sudah aktif → tetap masuk `failed[]` dengan code `ALREADY_REGISTERED`

## Error Code Note

BE ganti error code untuk row aktif dari `DUPLICATE` → `ALREADY_REGISTERED`. Mobile tidak pattern-match code string (semua handling generic via ApiError message display), jadi tidak butuh code changes. Confirmed dengan grep `DUPLICATE|ALREADY_REGISTERED` di codebase mobile → nihil.

## Version

`app.json` — 1.9.5 → **2.0.0** (major bump menandai family multi-participation feature complete + workaround removed).

## Sprint 8 Backlog (v2.1+)

- Universal Links (iOS AASA + Android assetlinks) — depends BE deploy
- Apply Benevity Causes (business side, potential in-app donation reintroduction)
- Push notif harian renungan (partnership BE cron)
- Reading streak untuk renungan

Batch endpoint fully migrated ke batch — tidak ada dependency workaround yang tersisa.

---

*Doc versi: 1.0 — 2026-09-01.*
