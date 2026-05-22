# Backend Request: Delete Account (Soft Delete via isActive=false)

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-22
**Priority**: 🔴 **HIGH** — App Store + Play Store compliance requirement (Apple guideline 5.1.1(v))
**Status**: 🆕 **PROPOSED**

## TL;DR

Apple & Google **require** delete-account feature di app yang ada user account creation. Mobile butuh:

1. Button "Hapus Akun" di profile/settings (destructive UI red)
2. Confirmation flow dengan disclosure jelas
3. Endpoint BE yang mark Jemaat `isActive=false` (soft delete) — bukan hard delete
4. Logout otomatis + clear local storage setelah sukses

## Schema impact — NO new field needed

`Jemaat.isActive` field sudah ada. Soft-delete = set `isActive=false`. BE side rules untuk handle inactive jemaat:

- Login (POST /auth/login): reject 403 kalau `jemaat.isActive=false`, message "Akun Anda sudah dinonaktifkan. Hubungi admin untuk reaktivasi."
- All authenticated endpoints: 401 + force logout kalau current user's jemaat inactive (check di JWT middleware)
- QR scanner: jangan return inactive jemaat di lookup
- Family link: reject link ke inactive jemaat
- Local Market: kalau owner inactive, sembunyikan bisnis-bisnisnya dari browse

(Most of these mungkin sudah implemented — yang baru cuma trigger soft-delete dari user-side)

## Endpoint Request

```http
DELETE /admin/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "confirmText": "HAPUS AKUN SAYA",   // wajib match exact text untuk safety
  "reason": "...optional free text..."  // 0-500 chars, untuk admin audit
}

Response 200: {
  "success": true,
  "data": {
    "jemaatId": "...",
    "deactivatedAt": "2026-05-22T10:00:00Z",
    "message": "Akun berhasil dinonaktifkan. Anda akan di-logout dari semua device."
  }
}

Error 400: confirmText mismatch
Error 403: jemaat punya pending obligation (mis. event registered, pending payment)
```

## Side effects BE harus handle

Saat soft-delete:
1. **Set `jemaat.isActive=false`**, set `deactivatedAt = now()`, simpan `deactivationReason` (optional)
2. **Invalidate all sessions** — revoke all `RefreshToken` rows untuk user ini
3. **Audit log** — siapa yang trigger, kapan, reason
4. **Notification** — opsional: kirim WA confirmation ke nomor user "Akun ECC Anda sudah dinonaktifkan tanggal X. Kalau ini bukan Anda, hubungi admin untuk reaktivasi."
5. **Cascade-effect untuk owner relations**:
   - LocalBusiness owned: di-hide dari Local Market browse (sudah di-handle kalau ada filter `WHERE owner.isActive=true`)
   - Family links: tetap exist (relasi tidak dihapus), tapi jemaat tidak bisa login
   - Homecell PIC: kalau user PIC homecell, perlu transfer PIC ke admin lain — atau biarkan kosong dengan flag (admin notification)

## What's preserved

Soft delete TIDAK hapus:
- Historical attendance records (Kehadiran)
- Event participation history
- Visit records (with other jemaat)
- Family relations
- Local Business data (hidden but preserved)
- Donation history

User explanation di confirmation modal: "Data Anda (kehadiran, event, donasi, dll) akan disimpan untuk catatan gereja. Yang dinonaktifkan adalah akses login Anda."

## Reactivation flow

Tidak via mobile — hanya admin portal:
- Admin → Jemaat list → toggle isActive=true
- User bisa login lagi dengan OTP existing

Untuk MVP, mobile cuma show "Hubungi admin cabang untuk reaktivasi" di error message.

## Effort estimate BE

- Endpoint + validation (confirmText check): 1 jam
- Side effects (invalidate refresh tokens, audit log): 1 jam
- Cascade filters audit (cek semua list endpoint filter inactive owner): 2 jam
- Optional WA notification: 1 jam
- Document at mobile-api-guide

Total: **~4-5 jam BE work** (excluding existing isActive filter audit yang mungkin sudah ada).

## Action items BE

- [ ] Implement DELETE /admin/me dengan confirmText validation
- [ ] Invalidate refresh tokens user setelah soft-delete
- [ ] Audit log entry `kind: 'self-deactivate'`
- [ ] Cascade audit: pastikan endpoint list (homecell members, event peserta, scanner lookup, family search) filter `isActive=true` untuk owner/target
- [ ] Optional: WA confirmation notification
- [ ] Document di mobile-api-guide section 12.2 (extend)

## Mobile-side plan (after BE ready)

- `src/api/me.ts` — tambah `deleteMyAccount({ confirmText, reason })`
- `app/settings/delete-account.tsx` — confirmation flow dengan:
  - Disclosure card: apa yang dihapus vs preserved
  - Reason textarea (optional)
  - Type-to-confirm input: harus ketik "HAPUS AKUN SAYA" exact
  - "Hapus Akun" button (red, disabled kalau confirmText mismatch)
  - Loading state saat process
  - Success → logout + redirect ke welcome screen dengan toast "Akun berhasil dinonaktifkan"
- Profile screen: tambah menu row "Hapus Akun" di bawah Pengaturan (warna merah, destructive style)

Mobile-side estimasi: **2-3 jam** setelah BE ready.

## Compliance refs

- Apple App Store Review Guidelines 5.1.1(v): "Apps that support account creation must also offer account deletion within the app"
- Google Play User Data policy: similar requirement
- GDPR Article 17 (Right to Erasure): walaupun pakai soft-delete, secara legal valid karena user akses di-revoke + data only kept untuk legitimate church record. Boleh hard-delete kalau user request explicitly dengan email ke admin (out-of-band process).
