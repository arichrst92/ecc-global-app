# Mobile ↔ Backend Alignment — Event Paid Flow (Hybrid Mobile+Web)

**Dari:** Tim Mobile (Ari)
**Untuk:** Tim Backend ECC (IDEA) / Tim Web
**Tanggal:** 2026-08-31
**Priority:** 🟠 High — flow event berbayar sekarang partial (register/payment via web), butuh alignment
**Related:**
- Apple rejection: Guideline 3.2.2(iv) — 2026-08-31
- Mobile commit: `40b1533 feat(cross-platform): unify iOS+Android persembahan/paid-event → web (v1.7.2)`
- BE notice: `backend-request-persembahan-per-cabang-url.md` (mention /event/pembayaran/*, /event/:id/register|payment|pembayaran whitelisted)

---

## TL;DR

v1.7.2 mobile split flow event berbayar:
- **View event detail** — in-app (list, hero, deskripsi, tags, participation status)
- **Register + Payment** — di **web** (`eccchurch.global/event/{eventId}/pembayaran`)

Mobile perlu tau BE contract untuk:
1. Web endpoint URL structure yang benar
2. Bagaimana mobile refresh participation status setelah user complete web flow
3. Notification (in-app + push) untuk status updates
4. Cancel flow (mobile atau web-only?)
5. Deep-link kembali ke app setelah selesai web flow

---

## Mobile v1.7.2 Behavior

### Event List (mobile)

- Semua event tetap visible di list (GRATIS, NOMINAL_TETAP, NOMINAL_BEBAS)
- Filter chips: All / Gratis / Berbayar

### Event Detail (mobile)

- Header hero + judul + tanggal + lokasi + peserta count + deskripsi + tags
- Participation status ditampilkan (kalau user sudah daftar): DAFTAR, MENUNGGU_VERIFIKASI, BAYAR, HADIR, BATAL
- Bottom sticky CTA:
  - **GRATIS**: in-app "Daftar Sekarang" → navigate `/event/{id}/register` (in-app form)
  - **PAID (BEBAS + TETAP)**: single "Lanjutkan" button → `Linking.openURL('https://eccchurch.global/event/{id}/pembayaran')`
- **Removed di v1.7.2**: donations history section (hidden untuk hindari borderline Apple 3.2.2)

---

## Alignment Questions

### Q1 — URL Structure Web Event Payment

Mobile hardcode URL:
```
https://eccchurch.global/event/{eventId}/pembayaran
```

BE notice mention 3 variants whitelisted:
- `/event/pembayaran/*`
- `/event/:id/register`
- `/event/:id/payment`
- `/event/:id/pembayaran`

**Confirm:** mana yang **canonical**? Kalau URL berbeda per flow (register vs payment), mobile perlu tau kapan pakai yang mana. Rekomendasi mobile: satu URL bundle semua flow (register + payment + upload bukti) → `/event/{eventId}/pembayaran` cover semua.

**Kalau URL berbeda:** mobile bisa expose route helper kaya `getEventFlowUrl(eventId, tipeBayar)` → BE confirm mapping.

---

### Q2 — Participation Status Sync

**Scenario:** user daftar event via web page → BE update participation record. Mobile buka event detail → apakah `myParticipation` field di-refresh?

**Assumption mobile saat ini:**
- Web menulis ke same DB table (`event_participation` atau similar)
- Mobile call `GET /admin/event/{id}` return `myParticipation` yang synced

**Confirm:**
- Web + mobile share same `event_participation` table? ✓/✗
- Mobile response `myParticipation` refresh dalam berapa lama setelah web action?
- Kalau ada BE cache di `/admin/event/{id}` → berapa lama TTL?

**Rekomendasi:** mobile invalidate cache lokal saat user return dari web (mis. via app foreground event) — akan implement kalau BE confirm shared state.

---

### Q3 — Notification Triggers dari Web

Mobile v1.7.2 masih polling in-app notifications (via `useNotificationBadge` every 30s).

**Scenario:** user register event via web → status DAFTAR → admin verify bukti transfer → status BAYAR.

**Confirm:**
- Web trigger `EVENT_REGISTERED` notif setelah register success? ✓/✗
- Admin verify bukti (dari portal admin) trigger `EVENT_APPROVED` notif? ✓/✗
- Notif ini include `actionUrl` yang mobile bisa handle? (mis. `/event/{eventId}` deeplink)

Kalau BE trigger notif di kedua channel (register via mobile atau web), mobile tetap dapat notif → user tau status update.

---

### Q4 — Cancel Registration

**Existing (v1.6.0):** mobile ada tombol "Batalkan Pendaftaran" di ParticipationCTA yang call `POST /admin/event/{id}/cancel`.

**v1.7.2 issue:** untuk paid events, mobile CTA sekarang "Lanjutkan" → web. **Cancel button jadi hidden**.

**Question:** cancel event registration untuk paid event:
- (a) Mobile tetap support cancel (retain button di UI kalau `myParticipation.status === 'DAFTAR' | 'MENUNGGU_VERIFIKASI'`) — cancel via API call, no web needed
- (b) Move cancel ke web juga — mobile tidak ada cancel button, user cancel di web
- (c) Both — mobile bisa cancel, web juga bisa

**Preference mobile:** (a) — cancel adalah destructive action yang enak di mobile (single tap), tidak butuh redirect. Endpoint `POST /admin/event/{id}/cancel` sudah ada, minimal effort untuk retain.

**Kalau BE prefer web-only cancel:** confirm URL cancel flow (mis. `/event/{id}/cancel` atau UI toggle di halaman `/event/{id}/pembayaran`).

---

### Q5 — Deep-Link Back to App

Ideal UX: user complete payment di web → auto-open app back → landing di event detail dgn status refreshed.

**Options:**
1. **Universal Links** (proper solution) — web page detect app installed, redirect `ecc://event/{id}` atau `https://eccchurch.global/event/{id}` (with AASA)
2. **Simple redirect button** — di akhir web flow, tampil "Kembali ke Els App" button yg trigger `ecc://event/{id}` deeplink
3. **No auto-back** — user manual switch balik ke app (least good UX)

**Preference mobile:** #2 (simple redirect button) sebagai MVP. Universal Links defer ke sprint terpisah (butuh coordinated fix di iOS + Android).

**Ask BE:** di halaman `/event/{id}/pembayaran` setelah success, tampilkan tombol:
```
[Kembali ke Els App]  → onClick: window.location.href = `ecc://event/${eventId}`
```

Kalau app installed → deeplink jalan, user land di event detail (mobile refresh cache → sees updated status).

---

### Q6 — NOMINAL_BEBAS Donations History

Mobile v1.7.2 **hide** section `DonationsHistory` di event detail (borderline Apple 3.2.2 — displaying donation totals in-app).

**Confirm:** BE endpoint `GET /admin/event/{id}/my-donations` tetap live (mobile masih call tapi tidak render UI)? Atau bisa deprecate mobile call?

**Rekomendasi mobile:** stop calling endpoint tsb dari mobile — reduce unnecessary traffic. User lihat donation history via web page.

Kalau BE agree, mobile bisa remove `useMyDonations` hook consumer di next sprint.

---

## Proposed Aligned Flow (untuk konfirmasi BE)

```
┌───────────────────────────────────────────────────────────┐
│ USER JOURNEY: Register + Pay for Event                    │
└───────────────────────────────────────────────────────────┘

[Mobile] User buka event list → tap event detail
[Mobile] GET /admin/event/{id}
[Mobile] Display detail + status participation (kalau ada)

[Mobile] User tap "Lanjutkan" (untuk paid event)
[Mobile] Linking.openURL(https://eccchurch.global/event/{id}/pembayaran)

[Safari/Chrome] Web page load
[Web]    POST /admin/event/{id}/register (kalau belum daftar)
[Web]    Display info rekening + QRIS
[Web]    User transfer external
[Web]    User upload bukti
[Web]    POST /admin/event/{id}/upload-bukti
[Web]    Status → MENUNGGU_VERIFIKASI
[Web]    Trigger notif EVENT_REGISTERED ke mobile (in-app notif)
[Web]    Tampil button "Kembali ke Els App" → ecc://event/{id}

[Mobile] Deep-link handler open event detail
[Mobile] Refresh GET /admin/event/{id} → sees MENUNGGU_VERIFIKASI

[Admin]  Portal admin verify bukti → status BAYAR
[BE]     Trigger notif EVENT_APPROVED ke mobile

[Mobile] User buka event detail → sees BAYAR + ready to attend
[Mobile] Cancel button (kalau status DAFTAR/MENUNGGU) — POST /admin/event/{id}/cancel

[Event day]
[Mobile] Admin scan QR peserta → status HADIR
[BE]     Trigger notif EVENT_CHECKED_IN
```

---

## Action Items

### For Backend Team

- [ ] Confirm canonical URL structure `/event/{id}/pembayaran` (atau specify variants)
- [ ] Confirm web + mobile share same `event_participation` DB state
- [ ] Confirm notification triggers dari web actions (register, upload bukti, admin verify)
- [ ] Add "Kembali ke Els App" button di web page → deep-link `ecc://event/{id}`
- [ ] Confirm cancel endpoint tetap live untuk mobile

### For Mobile Team (after BE confirm)

- [ ] Retain cancel button di paid event kalau BE confirm cancel via mobile OK
- [ ] Remove `useMyDonations` hook consumer kalau BE agree
- [ ] Handle deep-link `ecc://event/{id}` return dari web (via `Linking.addEventListener`)
- [ ] Refresh event detail query on app foreground (kalau user return dari web)
- [ ] Universal Links planned di sprint terpisah (bareng Android App Links)

---

## Contact

- **Mobile team:** Ari Christian — arichrst@ide.asia / arichrst@gmail.com / +62 821 1567 8446
- **Ref commit mobile v1.7.2:** `40b1533` + `c6f54b6`
- **Web page live:** https://eccchurch.global/persembahan (persembahan) — event pembayaran page TBD confirm

Kalau ada design decision atau alternative approach, reply doc ini atau ping via ECC repo issue.

---

*Doc versi: 1.0 — 2026-08-31. Coordination request untuk stabilize hybrid mobile+web event paid flow.*
