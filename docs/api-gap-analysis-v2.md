# API Gap Analysis v2 — Post-Backend Phase 1

**Per 2026-05-21** — re-audit setelah backend team merilis Phase 1 endpoints sebagai response feedback mobile dev di [`api-gap-analysis.md`](./api-gap-analysis.md) + [`backend-meeting-brief.md`](./backend-meeting-brief.md).

**TL;DR**: 🎉 Hampir semua gap kritis ter-resolve. M1 sampai M9 sekarang **unblocked**. Phase 2 deferrals (push notif, WebSocket, bilingual content) sudah disepakati.

---

## Status berubah

| Milestone | Sebelum (v1) | Sekarang (v2) | Endpoint baru |
|---|---|---|---|
| M1 Auth + Self-register | 🔴 sign-up missing | 🟢 **ready** | `POST /auth/register` |
| M2 Streak hadir | 🔴 missing | 🟢 **ready** | `GET /admin/me/stats` |
| M3 Batch event register | 🔴 missing | 🟢 **ready** | `POST /admin/event/:id/peserta/batch` |
| M4 Bilingual content | 🟡 partial | 🟡 **decided** | UI translated only, konten Indonesia (no BE work) |
| M5 Family management | 🔴 missing | 🟢 **ready** (auto-verify) | 6 endpoint `/admin/me/family/*` |
| M6 Profile self-edit + foto | 🟡 partial | 🟢 **ready** | `GET/PATCH /admin/me`, `POST /admin/me/foto` |
| M6 Branch change | 🔴 missing | 🟢 **ready** | `POST /admin/me/branch-change-request` + admin queue |
| M6 Push notification | 🔴 missing | 🔴 **defer Phase 2** | — |
| M7 Scanner list | 🔴 missing | 🟢 **ready** | `GET /admin/me/scanner-events`, `/scanner-ibadah` |
| M7 Live attendance count | 🔴 missing | 🟢 **ready** (polling) | `GET /admin/{event,ibadah}/:id/checkin/stats` |
| M9 Homecell PIC self-service | 🟡 partial | 🟢 **ready** | `GET /admin/me/homecell-managed`, `/homecell-area-managed`, `POST /admin/homecell/:id/members/by-kode` |
| M11 Face enrollment | 🔴 missing | 🟢 **ready** | `POST /auth/face/enroll` (sudah ada di Swagger, baru di-document) |

### Yang Phase 2 deferred (oke, disepakati)

- Push notification infrastructure (FCM/APNS sender, device token registry, notification model)
- WA confirmation flow untuk family link — current auto-verify cukup
- WebSocket realtime — polling cukup untuk MVP
- Bookmark renungan server-side — local AsyncStorage cukup
- Translation konten id/en — konten tetap Indonesia
- Branch change SLA — admin manual flow, no hard deadline

### Phase 2 patch (2026-05-21b)

- ✅ **Public cabang list endpoint** `GET /auth/cabang` live — solve M1.9 hardcoded list issue.
  Spec lengkap + BE response di [`backend-request-cabang-list.md`](./backend-request-cabang-list.md).
  Bonus: BE include `latitude`/`longitude` untuk future "cabang terdekat" feature.
  Mobile implementation: `src/api/cabang.ts`, `src/hooks/useBranches.ts` dengan 2-layer cache
  (React Query + persistent storage 24 jam TTL).

### Phase 2 patch (2026-05-21c)

- ✅ **Verify OTP ENROLLMENT response shape clarified** — sebelumnya BE bug throw "Data tidak ditemukan" karena coba lookup jemaat after verify. Fixed sekarang.
- New response shape: `{otpVerified, purpose, noHp, pendingRegistration, nextStep, validForSeconds}` — TANPA JWT (jemaat belum ada).
- Window 15 menit (`validForSeconds: 900`) — mobile harus lanjut `/auth/register` dalam batas waktu ini.
- Mobile implementation:
  - `src/api/auth.ts`: split jadi `verifyOtpLogin()` + `verifyOtpEnrollment()` dengan return type berbeda.
  - `src/types/auth.ts`: new `EnrollmentVerifyResponse` type.
  - `src/stores/signup.store.ts`: tambah `otpVerifiedExpiresAt` field.
  - `app/(auth)/signup/otp.tsx`: pakai `verifyOtpEnrollment`, simpan `validForSeconds` ke store.
  - `app/(auth)/signup/data.tsx`: countdown timer banner, auto-redirect kalau expired.

### Phase 2 patch (2026-05-21d)

- ✅ **`tanggalLahir` & `alamat` di `/auth/register` jadi optional** — solve simplified signup form issue.
- BE update: Zod schema + register handler, **no DB migration** (kolom sudah nullable).
- Spec final endpoint: minimal 4 field wajib (`noHp`, `namaLengkap`, `jenisKelamin`, `cabangId`), rest optional.
- Mobile implementation:
  - `src/types/auth.ts`: `RegisterPayload` — 4 field required, rest optional dengan `?`.
  - `app/(auth)/signup/data.tsx`: hapus placeholder values, mutationFn kirim minimal payload.
  - Detail di [`backend-request-optional-signup-fields.md`](./backend-request-optional-signup-fields.md) BE response.
- M6 todo: Profile screen handle null untuk `tanggalLahir` / `alamat` → "Belum diisi" placeholder dengan tap-to-edit.

### Phase 2 patch (2026-05-21g)

- ✅ **Cancel event participation endpoint** — `DELETE /admin/event/:id/peserta/me` live.
- Idempotent: status BATAL no-op + `meta.alreadyCancelled: true`.
- Soft cancel (status=BATAL, row kept untuk audit). Slot kuota auto kembali.
- Reject 400 kalau status=HADIR; 404 kalau belum daftar.
- Re-register setelah cancel: BE auto-reactivate BATAL row dengan `meta.reactivated: true`.
- Mobile implementation:
  - `src/api/event.ts`: `cancelMyParticipation(eventId)` — direct fetch karena perlu akses `meta.alreadyCancelled` (api.delete wrapper strip meta).
  - `app/event/[id].tsx`: button "Batalkan Pendaftaran" muncul di bawah ParticipationCTA untuk status cancellable (DAFTAR/MENUNGGU_VERIFIKASI/BAYAR + DAFTAR-gratis). Confirm modal dengan AlertTriangle. Submit → removeParticipation di store + refetch event detail untuk update pesertaCount.
  - Handle 4 response paths: success/alreadyCancelled/HADIR-blocked/not-registered.

### Phase 2 patch (2026-05-21f)

- ✅ **flexImageUpload helper** — BE upload endpoints sekarang lenient.
- Field name fleksibel: `foto`, `bukti`, `file`, `image` semua OK (pakai yang paling semantic per context).
- MIME accepted: jpeg/png/webp/heic/heif/gif + octet-stream. iOS HEIC Live Photo auto-convert ke WebP di server. Android camera yang tidak set MIME tetap accepted (octet-stream).
- Endpoint affected: `POST /admin/me/foto`, `/admin/event/:id/peserta/:pid/bukti`, `/admin/event/:id/hero`, `/admin/event/:id/qris`, `/admin/cabang/:id/rekening/:rkId/qris`, `/admin/news|renungan/:id/hero`.
- Mobile implementation:
  - `src/api/event.ts`: `uploadBukti` ganti field name `foto` → `bukti` (semantic).
  - `app/event/[id]/payment.tsx`: passthrough mimeType dari ImagePicker (gak filter, biarkan BE convert).
  - `src/api/me.ts`: `uploadMyFoto` tetap pakai `foto` (semantic untuk profile).

---

## Detail implementasi penting per endpoint

Hal-hal yang **mobile dev perlu perhatikan** saat integrasi:

### 1. Self-registration flow — perhatikan flow OTP enrollment

API guide Section 12.1 Step 2 mention:
> "BE belum return user data — flow dilanjut ke /auth/register"
> "sementara mobile app bisa abaikan auth response dari verify ENROLLMENT (atau backend di-tweak untuk return marker `pendingRegistration: true`)"

**Implikasi**:
- Saat verify OTP `purpose=ENROLLMENT`, response mungkin kosong / error / placeholder. Mobile harus handle dengan tidak gantungkan flow ke response itu.
- Mobile call `POST /auth/register` setelah verify — BE check OtpVerification.usedAt + purpose + age (≤ 15 menit) untuk authorize.
- **Action item**: konfirmasi exact behavior `verify OTP ENROLLMENT` response — apakah ada error 200/404, atau ada marker `pendingRegistration: true`? Test dulu di staging.

### 2. Family register-new — dependent jemaat

Untuk register anak balita tanpa HP:
```json
POST /admin/me/family/register-new
{ "namaLengkap": "Yosua", "role": "CHILD", "tanggalLahir": "2022-03-10",
  "jenisKelamin": "L", "noHp": null }
```

Backend create jemaat dengan `primaryGuardianId = parent's jemaatId`. Field `isDependent: true` di response family list.

**Implikasi UI**:
- Family list: tampil badge "Dependent" / icon untuk anggota yang `isDependent=true`
- QR Card carousel untuk dependent: tetap tampil (anak punya kode jemaat sendiri untuk check-in)
- Tidak ada login flow untuk dependent — anak balita tidak punya akses app sendiri sampai punya HP
- Saat anak punya HP di kemudian hari, **belum jelas migration path** — kemungkinan admin add `noHp` via portal lalu un-set `primaryGuardianId`. **Action**: tanya BE.

### 3. Family auto-verify (no confirmation)

API guide Section 13 explicit: link langsung verified, **tidak ada notif WA ke jemaat B untuk confirm**.

**Implikasi UX**:
- Saat user link family member existing: success immediate, tidak perlu "menunggu konfirmasi"
- Mockup wording yang sudah ada ("Anggota akan dikirimi notifikasi WA untuk konfirmasi tautan keluarga") — **perlu di-update** menjadi info implisit (no notif, link langsung jadi)
- Reciprocal create otomatis — A link B as CHILD, B otomatis dapat A as PARENT
- Risk abuse: A salah link B → A bisa unlink sendiri (delete endpoint). B juga bisa unlink. Trust-based.
- Phase 2 bisa switch ke confirmation flow tanpa breaking schema (`isVerified` field sudah ada).

### 4. Batch event registration — max 20 per request

API guide Section 15: max 20 jemaatIds per call. Partial success pattern:
```json
{
  "successful": [{...}, {...}],
  "failed": [{ "jemaatId": "...", "error": { "code": "DUPLICATE", "message": "..." } }]
}
```

**Failure codes**: `QUOTA_FULL`, `DUPLICATE`, `NOT_FOUND`, `INTERNAL`.

**Implikasi UI**:
- Family selector di event-daftar: limit 20 selection. Realistis untuk family besar masih cukup.
- Result screen: "✓ 3 berhasil, ✗ 1 gagal" + expandable detail "Yosua Christian — sudah terdaftar"
- Untuk single jemaat (user daftarkan dirinya sendiri), pakai endpoint lama `POST /admin/event/:id/peserta` — lebih ringkas, validation lebih ketat

### 5. Branch change — 1 PENDING per jemaat

API guide Section 14: max 1 PENDING per jemaat. Submit baru saat sudah ada PENDING → 409 CONFLICT.

**Implikasi UI**:
- Change-branch screen: cek status terakhir via `GET /admin/me/branch-change-requests` saat mount
- Kalau ada PENDING: disable form + tampil card "Permohonan ke ECC Bandung sedang menunggu approval (sejak 5 hari lalu)"
- Tombol cancel? — BE tidak documented cancel endpoint. **Action**: tanya kalau user mau batal permohonan
- Tidak ada notifikasi otomatis saat approved — mobile poll `GET /admin/me/branch-change-requests` saat user buka Settings page

### 6. Scanner endpoints — list lengkap di response

`GET /admin/me/scanner-events`:
```json
{ "eventId": "...", "judul": "...", "pelayananNama": "Usher", "role": "Leader", "level": 10 }
```

`GET /admin/me/scanner-ibadah`: de-duped by ibadahId (kalau user di banyak pelayanan untuk 1 ibadah, muncul 1x).

**Implikasi**:
- Tombol "Scanner Mode" di Ibadah/Event Detail: visible kalau `id` ada di response scanner list
- Bisa tampil context: "Anda authorized scanner via Tim Usher (Leader)"
- Reactive pattern (try scan → 403) tetap bisa sebagai fallback

### 7. Stats polling — rate limit aman

Stats endpoints aman di-poll 10-15 detik. Rate limit `/admin/*` sekarang **300/menit/user** (vs 100/menit di v1 docs) — jadi 4-6 poll/menit cukup longgar.

**Implikasi**:
- Scanner mode: useEffect dengan setInterval 12 detik untuk fetch stats
- Cancel polling saat scanner mode di-close

### 8. Profile self-edit — field allowlist

`PATCH /admin/me` allow: `namaLengkap`, `email`, `tanggalLahir`, `jenisKelamin`, `alamat`.

**Tidak boleh**: `noHp` (perlu OTP — endpoint terpisah belum ada?), `cabangId` (pakai branch change), `kode` (immutable).

**Action item**: kalau user mau ganti no HP, ada flow-nya? Belum di-document. Mungkin pakai OTP request lagi → verify → endpoint baru? **Tanya BE**.

### 9. Homecell endpoints — pattern dual

API guide Section 12.6:
- `POST /admin/homecell/:id/members/by-kode` — mobile-friendly (scan QR)
- `POST /admin/homecell/:id/members` (lama, by jemaatId) — admin portal pakai

Mobile gunakan yang `by-kode`. Errors: 404 kode tidak ada, 400 sudah jadi member.

### 10. Face enrollment — sudah ada di Swagger

API guide section 19 mention `POST /auth/face/enroll` "already existed" — tapi endpoint tidak detailed di guide ini. **Action**: cek Swagger `{BASE_URL}/docs` untuk detail body + auth.

---

## Yang masih perlu klarifikasi (action items)

| # | Item | Priority |
|---|---|---|
| 1 | Behavior `verify OTP purpose=ENROLLMENT` response — kosong / error / marker? | High (M1) |
| 2 | Cancel pending branch change request — endpoint? | Medium (M6) |
| 3 | Update no HP jemaat — flow & endpoint? | Medium (M6) |
| 4 | Dependent jemaat → activate akun saat punya HP — flow? | Low (Phase 2) |
| 5 | Face enrollment endpoint detail (request body, auth state) | Low (M11 opsional) |
| 6 | API key untuk `/api/v1/*` — apakah mobile butuh ini, atau JWT cukup? | Medium |
| 7 | Webhooks/notification API kalau ada family invitation di Phase 2 | Low (Phase 2) |

Bisa di-clarify via Swagger UI atau follow-up DM ke BE team.

---

## Mockup adjustments needed

Beberapa wording / flow di mockup HTML perlu di-update sesuai realitas BE:

1. **Family Add screen** — hapus banner "Anggota akan dikirimi notif WA untuk konfirmasi tautan keluarga". Ganti ke wording yang reflect auto-verify.

2. **Branch Change screen** — banner "Perubahan cabang menunggu persetujuan admin" tetap valid. Tambah handling existing PENDING state.

3. **Family List** — tampilkan badge "Dependent" / icon khusus untuk anak balita yang `isDependent=true`.

4. **Event Daftar** — limit family selector ke max 20 (saat ini bebas, mockup tampil 5 — cukup).

5. **Scanner mockup** — hint bahwa polling stats setiap 12 detik akan jalan saat mode active.

Action: update mockup sebelum / saat M5 implementation.

---

## Roadmap unblocked

**Bisa langsung mulai (no BE blocker):**

| Milestone | Sebelum | Sekarang |
|---|---|---|
| M1 Auth Flow (full, incl. sign-up) | 🔴 sign-up blocked | 🟢 GO |
| M2 Home + Ibadah + QR Card + Streak | 🟡 streak blocked | 🟢 GO |
| M3 Event Flow + Family batch | 🔴 batch blocked | 🟢 GO |
| M4 Content (News, Renungan, Persembahan) | 🟢 | 🟢 GO |
| M5 Family Management (full) | 🔴 totally blocked | 🟢 GO |
| M6 Notifications (local) + Settings + Branch change | 🔴 mostly blocked | 🟢 GO (push notif defer) |
| M7 Scanner Volunteer + live count | 🟡 workaround | 🟢 GO (proaktif pattern) |
| M8 Bluetooth Printer | 🟢 | 🟢 GO |
| M9 PIC Homecell + Area | 🟡 partial | 🟢 GO |
| M10 Bible | 🟢 client-only | 🟢 GO |
| M11 Face Login + Enrollment | 🟡 partial | 🟢 GO (opsional) |
| M12 Polish + Beta | 🟢 | 🟢 GO |

**Effectively all milestones unblocked.** Bisa start M1 implementation langsung.

---

## Next steps

1. ✅ Update reference docs di project (sudah di-pull)
2. ✅ Tulis gap report v2 (ini)
3. 🎯 Commit + push
4. 🎯 Clarify 7 action items via Swagger inspection atau follow-up DM BE
5. 🎯 Adjust mockup wording (auto-verify family, branch pending state)
6. 🚀 Mulai **M1 implementation** dengan endpoint dari Section 12.1

---

*v2 dibuat 2026-05-20 oleh mobile team. v1 di `api-gap-analysis.md`. v2 = post-BE Phase 1 response.*
