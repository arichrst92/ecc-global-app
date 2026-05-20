# Backend Request: Cancel Event Participation Endpoint

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-21
**Priority**: Low-Medium (UX completion, ada workaround manual via admin)

## Problem statement

Mobile app sekarang persist participation state per event di local storage. Saat user buka event detail dan ada participation aktif → tampil CTA "Lanjut Pembayaran" atau status "Menunggu Verifikasi".

Yang kurang: **user tidak bisa batalkan registrasi sendiri**. Use cases:

1. **Salah pilih event** — user iseng tap Daftar, ternyata tidak jadi
2. **Tidak jadi bayar** — user daftar tapi tidak punya budget
3. **Konflik jadwal** — daftar dulu, ternyata bentrok dengan agenda lain
4. **Belum upload bukti dalam waktu lama** — accumulate "dangling" registrations

Tanpa endpoint cancel: user harus hubungi admin manual via WhatsApp untuk batalkan. Friction tinggi.

## Permintaan endpoint

Mobile prefer **DELETE pattern** dengan auto-handle status BATAL di BE side:

```
DELETE /admin/event/{eventId}/peserta/me
Authorization: Bearer <JWT>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "part-uuid-...",
    "eventId": "evt-uuid-...",
    "jemaatId": "jemaat-uuid-...",
    "status": "BATAL",
    "cancelledAt": "2026-05-21T10:00:00.000Z"
  }
}
```

BE handle:
- Update `EventParticipation.status` → `BATAL`
- Set `cancelledAt` timestamp
- **JANGAN delete row** — keep untuk audit + cegah re-register dengan participationId yang sama
- Decrement `event.pesertaCount` (kalau di-cache) supaya quota slot kembali available

## Batasan & validation

Mobile harapkan BE enforce:

- ✅ Hanya owner participation yang bisa cancel (jemaatId match Bearer token)
- ✅ Tidak bisa cancel kalau status sudah `HADIR` (sudah scan/hadir di event) — return 400
- ❌ Boleh cancel di semua status: `DAFTAR`, `MENUNGGU_VERIFIKASI`, `BAYAR` (refund handling manual)
- ⚠ Edge case: user sudah `BAYAR` tapi cancel → app refund? **Out-of-scope** — refund flow manual via admin via WhatsApp dengan attached bukti tertentu

## Error responses

| Status | Code | Penyebab |
|---|---|---|
| 404 | `NOT_FOUND` | User belum daftar event ini |
| 400 | `BAD_REQUEST` | Status sudah HADIR (sudah hadir di event, tidak bisa di-cancel) |
| 403 | `FORBIDDEN` | Bukan owner participation (defensive — sebenarnya 404 by jemaatId scope sudah cukup) |

## Alternative spec (kalau DELETE tidak preferred)

PATCH dengan body `{ status: "BATAL" }`:

```
PATCH /admin/event/{eventId}/peserta/me
{ "status": "BATAL", "reason": "Optional cancellation reason" }
```

BE prefer mana? DELETE lebih semantic untuk "I want to undo my registration", PATCH lebih explicit untuk state machine + bisa kasih reason.

## Acceptance criteria

- [ ] User bisa cancel registrasi yang status `DAFTAR`, `MENUNGGU_VERIFIKASI`, `BAYAR`
- [ ] Cancel sukses → `EventParticipation.status = BATAL`, `cancelledAt` di-set
- [ ] Event pesertaCount decrement (slot quota tersedia kembali)
- [ ] Status `HADIR` reject 400
- [ ] Audit log: siapa cancel kapan
- [ ] Admin notification (opsional): "Jemaat X cancel dari event Y"
- [ ] OpenAPI spec di Swagger

## Mobile implementation plan (saat endpoint live)

```typescript
// src/api/event.ts
export function cancelMyParticipation(eventId: string) {
  return api.delete<EventParticipation>(`/admin/event/${eventId}/peserta/me`);
}
```

UI di event detail screen (saat ada `participation` di store):
- Tombol secondary di bawah "Lanjut Pembayaran": **"Batalkan Pendaftaran"**
- Tap → confirm modal "Yakin batalkan? Slot Anda akan kembali available"
- Submit → DELETE endpoint → `removeParticipation(eventId)` di store → toast success
- Refetch event detail untuk update pesertaCount

## Catatan

Saat ini mobile sudah punya state machine lengkap di client side
(`useEventFlowStore.participations`), jadi UX-nya tinggal nunggu endpoint.

Workaround sementara: button "Batalkan" disabled atau redirect ke help center.

---

*Saat endpoint live, paste link Swagger di sini dan close ticket.*
