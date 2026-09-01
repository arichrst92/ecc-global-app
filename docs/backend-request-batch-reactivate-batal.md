# Backend Request — Batch Register Reactivate BATAL Rows

**Date**: 2026-08-31
**Requester**: Mobile team (Ari)
**Priority**: LOW (mobile sudah workaround, tapi ideal-nya BE consistent)
**Related**: `backend-request-family-participation-list.md`, batch endpoint `POST /peserta/batch`

---

## Bug Report

Discovered saat testing multi-family cancel + re-register flow di v1.9.0 mobile:

**Repro:**
1. Bapak login → daftarkan istri (jemaatA) + anak (jemaatB) via `POST /peserta/batch` — sukses, 2 participation rows CREATED status DAFTAR
2. Bapak buka detail event → tap tracker istri → cancel → BATAL. Ulangi untuk anak.
3. Bapak buka register screen lagi → pilih istri + anak (checkbox), submit
4. **BE reject:** "Jemaat sudah terdaftar di event ini" (batch endpoint throws unique constraint or duplicate check)

**Expected:** BATAL row jemaatA + jemaatB harusnya di-reactivate ke DAFTAR (sama seperti behavior single endpoint `POST /peserta` per BE patch 21g).

## Root Cause (dari analisis mobile)

- `POST /peserta` **single** endpoint: kalau ada existing row BATAL untuk (eventId, jemaatId), reactivate row itu (update status DAFTAR + reset registeredAt). Per BE patch 21g Sprint 6.
- `POST /peserta/batch`: **belum** implement reactivate logic — treat existing row (any status) sebagai duplicate → reject dengan `CONFLICT` / "sudah terdaftar".

Mobile tidak bisa detect ini karena `GET /peserta/mine-and-family` **skip BATAL** (per BE update 2026-08-31 spec) → mobile kira jemaat bisa daftar → submit → 409 dari BE.

## Mobile Workaround (v1.9.1)

Mobile ganti dari batch endpoint ke **loop paralel** single endpoint:

```typescript
const results = await Promise.allSettled(
  jemaatIds.map((jid) =>
    registerPeserta(eventId, { jemaatId: jid, nominalBayar, catatan })
  )
);
```

Trade-off: N HTTP requests bukan 1. Untuk typical family 1-4 orang, latency acceptable. Batch endpoint stays available untuk consumer lain (admin portal?), tidak di-remove dari BE.

Mobile akan kembali ke batch endpoint di v2.x kalau BE fix delivered.

## Request untuk Backend

### Fix `POST /admin/event/:eventId/peserta/batch`

Update handler supaya per-item behavior konsisten dengan single endpoint:

Untuk setiap jemaatId di request:
1. Query existing row `(eventId, jemaatId)`
2. **Kalau ada + status = BATAL** → UPDATE status ke DAFTAR + reset `registeredAt` + set `nominalBayar` + `catatan` per new payload. Include di response `successful[]`.
3. **Kalau ada + status active (DAFTAR/MENUNGGU_VERIFIKASI/BAYAR/HADIR)** → tetap reject, add ke response `failed[]` dengan code `ALREADY_REGISTERED`.
4. **Kalau tidak ada** → INSERT baru. Include di `successful[]`.
5. Continue processing sisa jemaatIds bahkan kalau ada yg fail (partial success).

Return shape existing `BatchRegisterResponse` sudah support partial success:
```json
{
  "success": true,
  "data": {
    "successful": [ ...EventParticipation[] ],
    "failed": [
      { "jemaatId": "...", "error": { "code": "ALREADY_REGISTERED", "message": "..." } }
    ]
  }
}
```

Jadi tidak perlu change API shape — hanya handler internal logic.

## Alternative (kalau reactivate di batch complex)

**Option B**: return BATAL rows di `GET /peserta/mine-and-family` juga (dengan status BATAL), sehingga mobile bisa:
- Tampil BATAL tracker read-only (grey out)
- Detect existing BATAL → show "Reactivate" button di modal → panggil endpoint reactivate dedicated

Kurang bagus UX-wise karena user seharusnya tidak perlu tahu concept "reactivate". Prefer Option A (fix batch behavior).

## Non-Goals

- Tidak perlu ubah single endpoint (sudah correct)
- Tidak perlu ubah `/mine-and-family` filter (skip BATAL tetap correct behavior)
- Tidak perlu bump API version — additive fix

## Timeline

Mobile ship dulu v1.9.1 dengan workaround loop-of-singles. BE bisa deliver fix di sprint berikutnya. Setelah BE fix live, mobile revert ke batch endpoint di v2.0.0.

## Testing setelah BE fix

```bash
# Setup: batch register 2 jemaat
curl -X POST $API/admin/event/$EVID/peserta/batch \
  -H "Auth: Bearer $TOK" \
  -d '{"jemaatIds": ["'$A'","'$B'"], "nominalBayarPerOrang": 50000}'
# Expected: 200, successful=2, failed=0

# Cancel keduanya via self-cancel
curl -X POST $API/admin/event/$EVID/peserta/$PID_A/self-cancel -H "Auth: Bearer $TOK"
curl -X POST $API/admin/event/$EVID/peserta/$PID_B/self-cancel -H "Auth: Bearer $TOK"

# Batch register ulang — HARUSNYA reactivate BATAL
curl -X POST $API/admin/event/$EVID/peserta/batch \
  -H "Auth: Bearer $TOK" \
  -d '{"jemaatIds": ["'$A'","'$B'"], "nominalBayarPerOrang": 50000}'
# Expected: 200, successful=2 (dengan participationId SAMA dgn row lama, status DAFTAR), failed=0
```

---

Reply via `docs/be-update-*.md` atau langsung chat.
