# Mobile Update — Apple Compliance Final Status (v1.7.3)

**Dari:** Tim Mobile (Ari)
**Untuk:** Tim Backend ECC (IDEA) / Tim Web
**Tanggal:** 2026-08-31
**Related:**
- Apple rejection Guideline 3.2.2(iv): 2026-08-31
- BE deliveries: `/persembahan`, `/persembahan/{kode}`, `/event/{id}/pembayaran` — all live ✅
- Decision Opsi C (Ari 2026-08-31): register/upload/cancel tetap in-app
- Mobile commits: `100d0d7` → `817033b` (10 commits sprint 7)

---

## TL;DR

Sprint 7 iOS Apple compliance **sudah closed**. Semua flow sesuai
Guideline 3.2.2(iv) dan 3.1.5(b):

- **Persembahan** (charitable donation): 100% external via web
- **Event NOMINAL_BEBAS** (donasi sukarela): 100% external via web
- **Event NOMINAL_TETAP** (fixed ticket): in-app OK per 3.1.5(b)
- **Event GRATIS**: in-app OK

Mobile v1.7.3 ready submit ke Apple. Web page yang di-consume:
- `https://eccchurch.global/persembahan/{cabang}` — info rekening + QRIS
- `https://eccchurch.global/event/{id}/pembayaran` — info rekening + QRIS + deep-link back

---

## Compliance Coverage Matrix

| Feature | iOS/Android Behavior | Apple Ruling | Compliant? |
|---|---|---|---|
| Persembahan tab (bottom nav) | Hidden | 3.2.2(iv) — no in-app donation | ✅ |
| Persembahan tile (Home) | Tap → Safari `/persembahan/{cabang}` | 3.2.2(iv) allowance #1 (link to website) | ✅ |
| Persembahan tab deeplink `/persembahan` | Auto-redirect ke web | 3.2.2(iv) | ✅ |
| Persembahan authenticated screen | Dead code (function retained tapi unreachable) | 3.2.2(iv) | ✅ |
| Persembahan guest view | Dead code (guest juga tidak reach tab) | 3.2.2(iv) | ✅ |
| Event list | Show all types | — | ✅ |
| Event detail (GRATIS) | In-app register | — | ✅ |
| Event detail (NOMINAL_TETAP) | ParticipationCTA in-app (Daftar/Upload Bukti/Cancel) | 3.1.5(b) physical goods/services | ✅ |
| Event detail (NOMINAL_BEBAS) | Bottom CTA "Lanjutkan" → web | 3.2.2(iv) | ✅ |
| Event register screen | Gate NOMINAL_BEBAS → web | 3.2.2(iv) deeplink hardening | ✅ |
| Event payment screen (upload bukti) | Gate NOMINAL_BEBAS → web, TETAP tetap in-app | 3.1.5(b) TETAP OK, 3.2.2(iv) BEBAS gated | ✅ |
| Event donate screen | Always gate → web | 3.2.2(iv) — donation-only screen | ✅ |
| Event donations history UI | Hidden di semua platform | 3.2.2(iv) — no in-app donation tracking | ✅ |

---

## BE Endpoints Status

### Consumed (unchanged from v1.6.0)

- `GET /admin/event/{id}` — event detail + myParticipation
- `POST /admin/event/{id}/register` — used untuk GRATIS + NOMINAL_TETAP (BEBAS gated di UI)
- `POST /admin/event/{id}/upload-bukti` — used untuk NOMINAL_TETAP (BEBAS gated)
- `POST /admin/event/{id}/cancel` — used untuk semua tipe (kalau ada participation)
- `POST /admin/event/{id}/donations` — **no longer called** dari mobile
- `POST /admin/event/{id}/donations/{did}/bukti` — **no longer called**
- `GET /admin/me/donations` (per event) — **no longer called**

BE tetap live untuk web SSR + portal admin. Mobile stop consume via
Apple compliance requirement.

### Not needed to change

BE tidak perlu ada perubahan untuk sprint 7 compliance ini. Semua
mobile-side gating + web page yang sudah delivered.

---

## Testing Recommendations Pre-Apple-Review

**Reviewer bakal test dgn account `+6281805807807` / OTP `123456`.**

Manual test path yang direkomendasikan (mobile team + admin):

1. Home → tap tile "Persembahan" → Safari open ke `/persembahan/{cabang}`
2. Bottom nav → verify NO Persembahan tab visible
3. Event list → semua tipe visible (GRATIS, TETAP, BEBAS)
4. Event GRATIS detail → tap "Daftar Sekarang" → in-app register form → submit → HADIR
5. Event NOMINAL_TETAP detail → tap "Daftar Sekarang" → in-app register → upload bukti in-app → MENUNGGU_VERIFIKASI → admin verify → BAYAR
6. Event NOMINAL_BEBAS detail → tap "Lanjutkan" → Safari open ke `/event/{id}/pembayaran`
7. Deeplink test `ecc://event/{id}/donate` untuk BEBAS event → BebasWebRedirect placeholder + auto-open browser
8. Deeplink test `ecc://event/{id}/register` untuk BEBAS event → BebasWebRedirect
9. Deeplink test `ecc://event/{id}/payment` untuk BEBAS event → BebasWebRedirect
10. Web page load test:
    ```bash
    curl -sI https://eccchurch.global/persembahan/BDG        # 200
    curl -sI https://eccchurch.global/event/{id}/pembayaran  # 200
    ```

---

## Sprint 8 Backlog (not urgent)

Kalau sprint 7 approved di Apple, sprint 8 fokus:

- **Universal Links** — coordinated mobile Android + iOS + BE hosting
  AASA/assetlinks files. Effect: `https://eccchurch.global/*` links
  auto-buka app kalau installed
- **Remove dead code** — `PersembahanTabAuthenticated`, `GuestPersembahanView`,
  `EventDonateScreen` bodies (retained sekarang untuk backward compat
  session yg mungkin masih route ke sini)
- **Deprecate mobile useMyDonations hook** — no consumer
- **Apply Benevity Causes** (parallel BE + business side) — kalau
  approved, mobile bisa restore in-app persembahan iOS di future

---

## Mobile Commit List Sprint 7

10 commits ahead origin:

| Commit | Subject |
|---|---|
| `100d0d7` | iOS compliance initial (hide persembahan, block NOMINAL_BEBAS) |
| `6115696` | BE request persembahan web page (delivered) |
| `349fbd8` | Per-cabang persembahan URL |
| `4206842` | iOS UX: tile direct + event paid → web |
| `40b1533` | Cross-platform unify iOS+Android (v1.7.2) |
| `c6f54b6` | Event CTA polish |
| `f3e81fd` | BE alignment doc coordination |
| `3a524c0` | BE request event payment page (delivered Phase 1) |
| `bbc47bf` | Hybrid TETAP in-app, BEBAS web (v1.7.3) |
| `817033b` | Deeplink hardening 3 in-app screens BEBAS gate |

---

## Contact

- **Mobile team:** Ari Christian — arichrst@ide.asia / arichrst@gmail.com / +62 821 1567 8446
- **Reviewer account:** `+6281805807807` / OTP `123456` (BE bypass active)
- **App version target:** ELS Global App v1.7.3 (iOS)
- **Bundle ID:** `idea.eccchurch.global`

Kalau ada question atau butuh coordination lain, reply doc ini.

---

*Doc versi: 1.0 — 2026-08-31. Sprint 7 compliance final status.*
