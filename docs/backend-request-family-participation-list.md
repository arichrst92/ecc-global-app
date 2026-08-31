# Backend Request — Event Family Participation List + Per-Participation Cancel

**Date**: 2026-08-31
**Requester**: Mobile team (Ari)
**Priority**: MEDIUM (blocker untuk fitur family-multi-register di mobile)
**Related**: `mobile-be-align-event-payment-hybrid-flow.md`, `EventParticipation` schema
**Status BE**: ✅ **DELIVERED 2026-08-31** — reply detail: `be-update-2026-08-31-family-participation-list.md`

---

## Context & Gap

Saat ini flow event mobile support register **satu jemaat per action** (user sendiri, atau salah satu family member via jemaatId picker). BE juga sudah support `POST /admin/event/:eventId/peserta/batch` untuk multi-family sekaligus.

**Problem yang muncul:**

`GET /admin/event/:idOrSlug` mengembalikan field `myParticipation: EventParticipation | null` — **singular**. Ini hanya mewakili participation dari user login sendiri (BE resolve dari JWT).

Setelah user daftarkan istri + anak (via register.tsx berulang atau batch endpoint), BE membuat 2-3 participation rows terpisah dengan `jemaatId` berbeda. Tapi mobile tidak bisa melihat data participation family members — hanya milik user sendiri.

**Consequence untuk UX:**
1. Tracker card di event detail hanya tampil 1 (milik user). Istri/anak invisible.
2. Cancel per-tracker tidak bisa dilakukan karena `DELETE /admin/event/:eventId/peserta/me` self-only (resolve dari JWT, tidak terima `participationId`).
3. Upload bukti transfer untuk peserta family → siapa yang authorized upload?
4. Notification "pembayaran diverifikasi" ke jemaat yang mana?

## Request untuk Backend

### 1. Endpoint baru: List participations untuk user + family

```
GET /admin/event/:idOrSlug/peserta/mine-and-family
```

**Auth**: Bearer token required.

**Behavior**:
- Return semua `EventParticipation` di event tersebut yang jemaatId-nya adalah:
  - User yang login (own JWT jemaatId), OR
  - Family member user (via relasi keluarga — anak, pasangan, orang tua yang ditandai `linkedByUserId = self`)
- Skip yang status = `BATAL` (atau include sebagai read-only)
- Sort by registeredAt DESC

**Response shape**:
```json
{
  "success": true,
  "data": {
    "participations": [
      {
        "id": "uuid",
        "eventId": "uuid",
        "jemaatId": "uuid",
        "status": "MENUNGGU_VERIFIKASI",
        "nominalBayar": "150000",
        "catatan": "Catatan admin: bukti terbaca, tunggu approve",
        "buktiTransferUrl": "/uploads/xxx.jpg",
        "registeredAt": "2026-08-31T10:00:00Z",
        "paidAt": null,
        "attendedAt": null,
        "jemaat": {
          "id": "uuid",
          "namaLengkap": "Ari Christian",
          "fotoUrl": null
        },
        "isSelf": true,
        "relationLabel": "Diri sendiri"
      },
      {
        "id": "uuid",
        "jemaatId": "uuid",
        "status": "DAFTAR",
        "jemaat": {
          "namaLengkap": "Dewi Christian",
          "fotoUrl": "/uploads/dewi.jpg"
        },
        "isSelf": false,
        "relationLabel": "Istri"
      }
    ]
  }
}
```

Tambahan field `isSelf` dan `relationLabel` opsional tapi memudahkan UI mobile menampilkan "Diri sendiri", "Istri", "Anak (Michael)".

### 2. Endpoint baru: Cancel by participationId

```
DELETE /admin/event/:idOrSlug/peserta/:participationId
```

**Auth**: Bearer token required.

**Authorization rule**: allow cancel jika `participationId` merujuk ke row yang jemaatId-nya:
- User sendiri, OR
- Family member yang linked dengan user via `linkedByUserId = self`

Reject dengan 403 kalau bukan.

**Behavior**: sama seperti existing `DELETE /peserta/me`:
- Soft delete → status = `BATAL`
- Idempotent → `meta.alreadyCancelled = true` kalau sudah BATAL
- Reject 400 kalau status = `HADIR`

**Response**:
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "BATAL", ... },
  "meta": { "alreadyCancelled": false }
}
```

### 3. Update `GET /admin/event/:idOrSlug`

Selain existing `myParticipation` (kept for backward-compat), tambahkan optional field:

```typescript
{
  // ...existing fields
  myParticipation: EventParticipation | null,          // kept: user's own only
  familyParticipationsCount?: number,                   // NEW: total termasuk family
}
```

`familyParticipationsCount` supaya mobile bisa tampilkan indicator "3 pendaftaran" tanpa harus panggil endpoint list dulu.

### 4. Upload bukti per participation

Existing `POST /admin/event/:eventId/peserta/:participationId/bukti` sudah accept `participationId` di path. Update authorization guard supaya sama dengan point #2: allow user upload untuk participation family yang linked ke dia.

Sama untuk `POST /donations/:donationId/bukti` dan `DELETE /donations/:donationId`.

## Mobile Side (setelah BE ready)

1. Refactor `useEventDetail` — tambahkan optional query `useMyEventParticipations(eventId)` yang panggil endpoint #1 di atas
2. Render N tracker cards di event detail, satu per participation
3. Setiap tracker card clickable → modal detail dengan tombol cancel per-participation
4. Cancel button di modal panggil `cancelParticipationById(eventId, participationId)` (endpoint #2)
5. Upload bukti flow gunakan `participationId` yang di-select user (bukan asumsi self)

## Non-Goals (out of scope)

- Register untuk non-family member (harus tetap by admin di web)
- Bulk cancel semua family sekaligus (per-tracker saja)
- Delegasi otoritas ke non-linked user

## Timeline

Mobile bisa ship dulu **single-tracker version** (v1.7.4 sekarang, cancel di modal untuk own participation). Family multi-tracker → v1.8.x setelah BE endpoint siap. Tidak block Apple compliance sprint.

## Questions

1. Family relationship di DB — masih pakai skema `linkedByUserId`? Ada helper method `getMyFamilyJemaatIds(userId)` yang bisa di-reuse?
2. Untuk `GET /admin/event/:idOrSlug`, aman tambah field baru `familyParticipationsCount` tanpa version bump API?
3. Kalau family member sudah punya user account sendiri (bukan proxy) — apakah otomatis putuskan linked? Perlu edge case ini di-clarify.

---

Reply via `docs/be-update-*.md` atau langsung chat kalau ada pertanyaan.
