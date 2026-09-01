# BE Update — Batch Reactivate BATAL + Payment History Fix

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari) + Portal admin users
**Tanggal:** 2026-09-01
**Reply ke:**
- `backend-request-batch-reactivate-batal.md` (LOW)
- Portal bug: "data jemaat yang sudah bayar belum tampil di payment history padahal sudah di-approve admin"

---

## Status

✅ **DELIVERED** — 2 fix di satu commit, tsc clean, ready deploy.

---

## Fix #1 — Batch Register Reactivate BATAL

**Endpoint:** `POST /admin/event/:eventId/peserta/batch`

**Before:** existing row (any status) → reject dgn code `DUPLICATE`
**After:** matches single endpoint behavior:
- Existing row **BATAL** → **reactivate**: update ke `DAFTAR`, reset `registeredAt`, clear `cancelledAt`, apply new `nominalBayar` + `catatan`, wipe payment artifacts (`buktiTransferUrl`, `paidAt`, `approvedAt`, `approver`)
- Existing row **active** (DAFTAR/MENUNGGU_VERIFIKASI/BAYAR/HADIR) → reject dgn code baru `ALREADY_REGISTERED` (dari `DUPLICATE`)
- Tidak ada existing → INSERT baru seperti sebelumnya

Continue processing sisa jemaatIds walau ada yang fail (partial success unchanged).

**Response shape unchanged** — cuma error code yg berubah dari `DUPLICATE` → `ALREADY_REGISTERED`. Kalau mobile masih pattern-match `DUPLICATE` di old workaround loop, silakan update ke `ALREADY_REGISTERED`.

Mobile bisa revert workaround `Promise.allSettled` loop-of-singles kembali ke batch endpoint di v2.0.0.

---

## Fix #2 — Payment History Menampilkan Legacy Participation

**Endpoint:** `GET /admin/event/:id/donations`

**Bug:** portal admin approve peserta via section "Peserta" → tombol Approve → panggil `POST /peserta/:pid/approve` → hanya update `EventParticipation` (status BAYAR, paidAt, approvedBy). Tidak create `EventDonation` row.

Payment History section (`DonationsSection`) di portal fetch dari `EventDonation` → row tsb tidak muncul.

**Fix:** endpoint donations sekarang return **merged view**:
1. Real `EventDonation` rows (unchanged)
2. **Synthesized rows** dari `EventParticipation` yang:
   - Punya `buktiTransferUrl` OR `paidAt` OR status ∈ {MENUNGGU_VERIFIKASI, BAYAR}
   - **DAN** belum punya `EventDonation` row (dedup by `participationId`)

Synthesized row struktur mirror donation shape supaya FE tidak perlu berubah:

```json
{
  "id": "virt-{participationId}",   // prefix `virt-` supaya FE bisa distinguish
  "participationId": "...",
  "nominalBayar": "50000",
  "buktiTransferUrl": "/uploads/...",
  "status": "BAYAR",                 // mapped: HADIR→BAYAR, BAYAR→BAYAR, MENUNGGU_VERIFIKASI→MENUNGGU_VERIFIKASI, BATAL→BATAL
  "catatan": null,
  "paidAt": "...",
  "approvedAt": "...",
  "createdAt": "...",
  "participation": { "id": "...", "jemaat": { "id", "namaLengkap", "noHp", "fotoUrl" } },
  "approver": { "id", "namaLengkap" } | null,
  "_synthesized": true               // marker
}
```

**Merge behavior:**
- Combined list di-sort by status priority (MENUNGGU_VERIFIKASI → BAYAR → BATAL) then `createdAt` DESC
- Paginated in-memory (fine untuk typical <100 peserta per event)
- `meta.totalAmountConfirmed` = sum donation BAYAR + participation BAYAR (accurate untuk fundraising progress)
- `meta.realCount` + `meta.synthesizedCount` di-expose untuk debugging (portal bisa show badge kalau mau)

**FE consideration:** kalau portal punya approve/cancel button di donation row, guard supaya row dgn `id.startsWith('virt-')` → fallback ke `/peserta/:participationId/approve` atau `/peserta/:participationId/self-cancel` (bukan `/donations/:donationId/approve`). Kalau row `_synthesized=true`, aksi berlaku ke participation directly.

Sekarang admin approve via section Peserta → Payment History langsung update (synthesized row muncul dgn status BAYAR).

---

## Files Changed

- `apps/core-api/src/routes/admin/event.ts`
  - `POST /:id/peserta/batch` — reactivate BATAL rows
  - `GET /:id/donations` — merged view (real + synthesized)

Total: ~90 line changes. tsc clean.

---

## Deploy Steps

```bash
# Mac local
cd ~/Projects/ecc-core-platform
git add apps/core-api/src/routes/admin/event.ts
git commit -m "fix(event): batch reactivate BATAL + payment history merged view

- POST /peserta/batch: reactivate existing BATAL rows (match single endpoint 21g behavior).
  Change error code DUPLICATE → ALREADY_REGISTERED untuk row aktif.
- GET /:id/donations: merge synthesized rows dari EventParticipation yang punya
  bukti/pembayaran tapi belum ada EventDonation. Fix: peserta approved via
  /peserta/:pid/approve sekarang muncul di Payment History portal.

Per backend-request-batch-reactivate-batal.md + bug report portal."
git push origin main

# VPS
ssh root@187.77.118.85
cd /var/www/ecc-core-platform
git pull origin main
pnpm --filter @ecc/core-api build
grep -q "virt-" apps/core-api/dist/routes/admin/event.js && echo "OK"
pm2 restart ecc-core-api --update-env
pm2 logs ecc-core-api --lines 10 --nostream
```

---

## Verify

**Payment History fix (portal):**
1. Login portal → buka event yang punya peserta yg sudah di-approve tapi tidak muncul di Payment History sebelumnya
2. Refresh section Payment History → row peserta tsb harus muncul dgn status BAYAR + nominal + bukti transfer
3. `meta.synthesizedCount > 0` di response (bisa cek DevTools Network tab)

**Batch reactivate (mobile v2.x):**
```bash
# Setup: register 2 jemaat via batch
curl -X POST $API/admin/event/$EVID/peserta/batch -H "Auth: Bearer $TOK" \
  -d '{"jemaatIds": ["'$A'","'$B'"], "nominalBayarPerOrang": 50000}'
# → successful=2

# Cancel keduanya
curl -X POST $API/admin/event/$EVID/peserta/$PID_A/self-cancel -H "Auth: Bearer $TOK"
curl -X POST $API/admin/event/$EVID/peserta/$PID_B/self-cancel -H "Auth: Bearer $TOK"

# Batch register ulang → HARUSNYA reactivate
curl -X POST $API/admin/event/$EVID/peserta/batch -H "Auth: Bearer $TOK" \
  -d '{"jemaatIds": ["'$A'","'$B'"], "nominalBayarPerOrang": 50000}'
# → successful=2 (participationId SAMA dgn row lama, status DAFTAR, cancelledAt=null)
```

---

## Contact

- **BE:** Tim IDEA
- **Deploy target:** production `api.eccchurch.global`

---

*Doc versi: 1.0 — 2026-09-01.*
