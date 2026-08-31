# BE Update — Family Participation List + Per-Participation Cancel

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari)
**Tanggal:** 2026-08-31
**Reply ke:** `backend-request-family-participation-list.md`

---

## Status

✅ **DELIVERED** — semua 4 item dari request sudah di-implement, tsc clean, ready deploy.

---

## Endpoints Baru & Perubahan

### 1. ✅ `GET /admin/event/:idOrSlug/peserta/mine-and-family`

Auth: Bearer required.

Return participations di event ini untuk self + family (skip BATAL, sort by
registeredAt DESC).

**Response:**

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
        "catatan": "...",
        "buktiTransferUrl": "/uploads/xxx.jpg",
        "registeredAt": "2026-08-31T10:00:00Z",
        "paidAt": null,
        "attendedAt": null,
        "cancelledAt": null,
        "jemaat": { "id": "uuid", "namaLengkap": "Ari Christian", "fotoUrl": null },
        "isSelf": true,
        "relationLabel": "Diri sendiri"
      },
      {
        "id": "uuid",
        "jemaatId": "uuid",
        "status": "DAFTAR",
        "jemaat": { "namaLengkap": "Dewi Christian", "fotoUrl": "/uploads/dewi.jpg" },
        "isSelf": false,
        "relationLabel": "Istri"
      }
    ]
  }
}
```

`relationLabel` diambil dari `TipeRelasiKeluarga.nama` (contoh: "Istri", "Anak Laki-Laki", "Ayah", "Saudara Kandung"). Untuk viaSpouse (anak pasangan), label fallback ke "Keluarga".

### 2. ✅ Cancel by participationId

**Path baru** (BUKAN modifying existing DELETE — existing admin hard-delete
di-preserve untuk backward compat portal admin):

```
POST /admin/event/:idOrSlug/peserta/:participationId/self-cancel
```

Auth: Bearer required.

**Auth rule:** `participation.jemaatId` harus di family set requester (self + JemaatRelasi direct + spouse-transitive). Kalau bukan → **403 Forbidden**.

**Behavior** (sama seperti existing `/peserta/me`):
- Idempotent: kalau sudah BATAL → `{ success:true, data, meta.alreadyCancelled: true }`
- Reject 400 kalau status HADIR
- Set BATAL + cancelledAt

**Response:**
```json
{
  "success": true,
  "data": { "id": "...", "status": "BATAL", "cancelledAt": "...", ... },
  "meta": { "alreadyCancelled": false }
}
```

**Kenapa POST bukan DELETE?** Path `DELETE /peserta/:participationId` sudah dipakai admin (hard delete row). Bikin path baru `self-cancel` supaya tidak ambigu + tidak break portal admin.

### 3. ✅ `GET /admin/event/:idOrSlug` — field baru

Additive, backward-compat safe.

```typescript
{
  // ...existing fields
  myParticipation: EventParticipation | null,    // unchanged
  pesertaCount: number,                           // unchanged
  familyParticipationsCount: number,              // NEW
}
```

`familyParticipationsCount` = count participations di event tsb yg jemaatId
di family set (termasuk self), exclude BATAL. Mobile bisa tampilkan
"3 pendaftaran" indicator tanpa panggil endpoint list dulu.

Kalau requester tidak authenticated → `familyParticipationsCount: 0`.

### 4. ✅ Auth guard `POST /peserta/:participationId/bukti`

Updated untuk allow upload family. Rule:

- `req.user.isFulltimer` (admin) → **allow** (backward compat portal admin)
- Non-admin user → **allow only kalau `participation.jemaatId` di family set**
- Selain itu → 403

Guard sama juga bisa di-extend ke donations endpoint kalau perlu — kabari.

---

## Jawaban Pertanyaan

**Q1. Family model — pakai `linkedByUserId`?**

Tidak. Schema pakai `JemaatRelasi` (`jemaatId` ↔ `jemaatTerkaitId` + `tipeRelasiId`).
Helper baru `getFamilyJemaatIds(selfId)` di `apps/core-api/src/lib/family-relation.ts`
return Set jemaatIds yg boleh di-act on:
- Self (always included)
- All `JemaatRelasi` direct (jemaatId=self) → suami/istri/anak/ayah/ibu/saudara/dst.
- Spouse-transitive: anak/ortu/saudara milik pasangan (sejalan dgn GET /me/family viaSpouse behavior)

Skip: kakek/nenek/cucu extended, suami/istri pasangan (privacy).

**Q2. `familyParticipationsCount` additive tanpa version bump?**

Yes. Field opsional, semua mobile client lama ignore. Aman.

**Q3. Family member punya user account sendiri — putuskan link?**

**Tidak**. Auth berbasis JWT jemaatId, bukan proxy relationship. Kalau family
member login sendiri, mereka lihat participation mereka via `myParticipation`
biasa. Kalau original user (proxy) query `/mine-and-family`, mereka tetap
lihat participation family lewat JemaatRelasi (relationship data tidak
di-delete waktu family member self-register). Both sides work.

**Edge case:** kalau dua-duanya (proxy + family) sama-sama cancel participation
same-time (rare), pertama menang, kedua kena idempotent `alreadyCancelled=true`.

---

## Notification Behavior

Mobile menanyakan siapa yang notified. Answer:

- **Register** (`POST /peserta/batch` atau single) → notif `EVENT_REGISTERED` fire ke
  jemaat yg didaftarkan (`jemaatId` di row participation)
- **Upload bukti** → notif fire ke `jemaatId` di row participation (bukan uploader)
- **Admin verify (approve)** → notif `EVENT_APPROVED` fire ke `jemaatId`
- **Check-in** → notif `EVENT_CHECKED_IN` fire ke `jemaatId`

Kalau user proxy upload bukti untuk istri, istri yg terima notif (bukan user
proxy). Kalau proxy juga mau notified, itu policy change perlu diskusi
terpisah.

---

## Testing Recommendations

```bash
# 1. Setup: register self + istri di event X
curl -X POST https://api.eccchurch.global/admin/event/$EVID/peserta \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jemaatId": "'$SELF'"}'
curl -X POST https://api.eccchurch.global/admin/event/$EVID/peserta \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jemaatId": "'$ISTRI'"}'

# 2. List mine-and-family
curl -H "Authorization: Bearer $TOKEN" \
  https://api.eccchurch.global/admin/event/$EVID/peserta/mine-and-family
# Expected: 2 participations, isSelf=true untuk self, relationLabel="Istri" untuk istri

# 3. Detail event → familyParticipationsCount = 2
curl -H "Authorization: Bearer $TOKEN" \
  https://api.eccchurch.global/admin/event/$EVID

# 4. Self-cancel istri
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://api.eccchurch.global/admin/event/$EVID/peserta/$ISTRI_PID/self-cancel
# Expected: BATAL, cancelledAt set

# 5. Idempotent — cancel ulang
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://api.eccchurch.global/admin/event/$EVID/peserta/$ISTRI_PID/self-cancel
# Expected: 200 { data, meta.alreadyCancelled: true }

# 6. Non-family cancel (curi participationId random) → 403
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://api.eccchurch.global/admin/event/$EVID/peserta/$RANDOM_STRANGER_PID/self-cancel
# Expected: 403 Forbidden

# 7. Upload bukti untuk istri
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -F "bukti=@bukti-transfer.jpg" \
  https://api.eccchurch.global/admin/event/$EVID/peserta/$ISTRI_PID/bukti
# Expected: 200, status naik ke MENUNGGU_VERIFIKASI
```

---

## Files Changed (BE)

- `apps/core-api/src/lib/family-relation.ts` — helper `getFamilyJemaatIds()` baru
- `apps/core-api/src/routes/admin/event.ts`:
  - Import `getFamilyJemaatIds`
  - `GET /:idOrSlug` — tambah `familyParticipationsCount`
  - `GET /:idOrSlug/peserta/mine-and-family` — endpoint baru
  - `POST /:idOrSlug/peserta/:participationId/self-cancel` — endpoint baru
  - `POST /:id/peserta/:participationId/bukti` — tambah auth guard (allow family)

Total: ~150 line addition. tsc clean.

---

## Deploy Steps

```bash
# Mac local
cd ~/Projects/ecc-core-platform
git add apps/core-api/src/lib/family-relation.ts apps/core-api/src/routes/admin/event.ts
git commit -m "feat(event): family participation list + per-id self-cancel + upload guard

Adds:
- GET /admin/event/:idOrSlug/peserta/mine-and-family
- POST /admin/event/:idOrSlug/peserta/:participationId/self-cancel
- GET /admin/event/:idOrSlug now returns familyParticipationsCount
- POST /peserta/:participationId/bukti guarded (allow family jemaatId)

New helper getFamilyJemaatIds() in lib/family-relation.
Per backend-request-family-participation-list.md."
git push origin main

# VPS
ssh root@187.77.118.85
cd /var/www/ecc-core-platform
git pull origin main
pnpm --filter @ecc/core-api build
grep -q "mine-and-family" apps/core-api/dist/routes/admin/event.js && echo "OK"
pm2 restart ecc-core-api --update-env
pm2 logs ecc-core-api --lines 10 --nostream
```

---

## Mobile Next Steps (sesuai brief kalian)

1. Refactor `useEventDetail` — tambah `useMyEventParticipations(eventId)` query pakai endpoint #1
2. Render N tracker cards di event detail, satu per participation
3. Tracker card clickable → modal detail + tombol cancel
4. `cancelParticipationById(eventId, participationId)` → panggil endpoint #2
5. Upload bukti flow pakai `participationId` yg di-select user

Backward compat: mobile v1.7.x lama yg hanya baca `myParticipation` singular
**tetap jalan** — tidak ada breaking change.

---

## Contact

- **Backend:** Tim IDEA
- **Endpoints deploy target:** production `api.eccchurch.global`
- **Availability:** ready after next deploy VPS

Kabari kalau ada follow-up (mis. mau extend guard yg sama ke donations
endpoints, atau perlu notif tambahan ke proxy).

---

*Doc versi: 1.0 — 2026-08-31.*
