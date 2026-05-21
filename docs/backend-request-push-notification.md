# Backend Request: Push Notification Service (FCM + APNS)

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-20
**Priority**: 🟡 **MEDIUM** — feature M6, tidak blocker untuk launch tapi penting untuk retention
**Status**: Pending

---

## TL;DR

Mobile butuh BE service untuk **kirim push notification** ke device jemaat:
- Reminder ibadah (Sabtu malam sebelum Minggu pagi)
- Renungan harian baru
- Event registration approved / payment verified
- Branch change request status update
- Family link approval (kalau ke depannya switch ke 2-way confirm)
- News update penting

Mobile sudah siapkan:
- Notifications inbox screen (local-only sekarang, tinggal extend kalau BE ready)
- `notifications.store` di mobile dengan struktur `category` yang match notification types

Yang perlu dari BE:
1. Endpoint untuk **register device token** (FCM Android / APNS iOS / Expo Push Token)
2. Worker/scheduler untuk **send push** ke jemaat sesuai event
3. Endpoint untuk **list/sync notifications** dari server (supaya inbox bisa fetch history dari multiple device)

---

## Architecture proposal

```
[ Mobile (Expo)]
   ├── expo-notifications.getExpoPushTokenAsync()
   ├── POST /admin/me/devices { token, platform } → register
   ├── GET /admin/me/notifications → list inbox
   └── PATCH /admin/me/notifications/:id/read → mark single read
       PATCH /admin/me/notifications/read-all → mark all read

[ Backend]
   ├── Device table: jemaatId, token, platform (ios|android|web), lastSeenAt
   ├── Notification table: jemaatId, category, title, body, deepLink, isRead, createdAt
   ├── Push worker: scheduled (cron) untuk reminder, event-driven untuk approval/status
   └── Provider: Expo Push API (paling simple, free, support FCM+APNS automatic)
```

**Rekomendasi**: pakai **Expo Push API** sebagai provider — tidak perlu setup FCM/APNS sendiri di awal, Expo handle routing ke kedua platform. Free untuk dev. Production migrate ke FCM/APNS direct kalau perlu scale > 100k push/day.

---

## Endpoint specs (proposal)

### 1. Register device token

```
POST /admin/me/devices
Authorization: Bearer <JWT>

{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ios" | "android" | "web",
  "appVersion": "0.1.0",
  "deviceModel": "iPhone 15 Pro" // optional, untuk debug
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "device-uuid",
    "jemaatId": "...",
    "token": "...",
    "platform": "ios",
    "lastSeenAt": "2026-05-20T..."
  }
}
```

**Behavior**:
- Upsert by `token` (kalau token sudah ada, update lastSeenAt + jemaatId)
- 1 jemaat bisa punya multiple devices (HP + iPad + dll)

### 2. Unregister device (saat logout)

```
DELETE /admin/me/devices/:token
Authorization: Bearer <JWT>
```

**Response 200:** `{ "success": true, "data": null }`

Mobile call saat logout supaya push tidak lagi sampai ke device tersebut.

### 3. List notifications

```
GET /admin/me/notifications?limit=50&before=2026-05-20T00:00:00Z
Authorization: Bearer <JWT>
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif-uuid",
      "category": "ibadah" | "event" | "renungan" | "payment" | "family" | "branch_change" | "news" | "system",
      "title": "Ibadah Minggu Pagi besok",
      "body": "Jangan lupa hadir di ibadah pukul 08:00. Tap untuk lihat detail.",
      "deepLink": "/ibadah/abc-uuid",
      "isRead": false,
      "createdAt": "2026-05-20T18:00:00Z",
      "readAt": null
    }
  ],
  "meta": {
    "unreadCount": 5
  }
}
```

### 4. Mark as read

```
PATCH /admin/me/notifications/:id/read
PATCH /admin/me/notifications/read-all
```

Both return updated notification(s) / `{ updated: N }`.

---

## Push notification scenarios (priority order)

### High priority (M6 must-have)

1. **Ibadah reminder** — H-1 (Sabtu malam jam 19:00 untuk Minggu pagi)
   - Trigger: cron weekly, scan IbadahOccurrence di tomorrow per cabang
   - Filter: jemaat dengan `cabang = ibadah.cabang` AND `pref.ibadah = true`
   - Deep link: `/ibadah/:id`

2. **Event registration confirmed (payment verified)** — saat admin approve bukti
   - Trigger: PATCH EventParticipation status → BAYAR
   - Filter: jemaat owner participation
   - Deep link: `/event/:slug`

3. **Branch change request status update** — saat admin approve/reject
   - Trigger: PATCH BranchChangeRequest status → APPROVED/REJECTED
   - Filter: jemaat owner request
   - Deep link: `/settings/change-branch` (history modal)

### Medium priority

4. **Renungan harian baru** — saat admin publish renungan baru
   - Trigger: POST /admin/renungan dengan publish=true
   - Filter: semua jemaat aktif (sinode-wide)
   - Deep link: `/content/renungan/:slug`

5. **Event baru di cabang** — saat admin publish event cabang
   - Trigger: POST /admin/event dengan publish=true
   - Filter: jemaat di cabang itu + jemaat yang viewing branch tersebut (optional)
   - Deep link: `/event/:slug`

### Low priority (nice-to-have)

6. **Family link request** — kalau switch ke 2-way confirm di future
7. **News penting** — admin manual send to all
8. **Event reminder H-1** — untuk event yang sudah register

---

## Mobile-side plan (setelah BE ready)

1. **Install `expo-notifications`** dan request permission saat login
2. **Get Expo Push Token** + POST `/admin/me/devices`
3. **Handle notification tap** — parse deepLink, navigate via expo-router
4. **Background handler** — increment unread badge, simpan ke local store
5. **Foreground handler** — show in-app toast, jangan banner OS
6. **Notification preferences** — toggle per category di settings (sudah ada di `preferences.store.notif`)
7. **DELETE token saat logout** untuk privacy + multi-device cleanliness

Library: `expo-notifications` (sudah official Expo, gratis, support FCM+APNS via Expo Push API)

---

## Decisions needed

1. **Push provider** — Expo Push API (rekomendasi) atau FCM/APNS direct?
2. **Notification storage** — server-side persist (untuk multi-device sync) atau local-only di mobile?
3. **Quiet hours** — apakah perlu rule "tidak kirim push 22:00 - 06:00 WIB" untuk renungan/news non-urgent?
4. **Delivery report** — apakah perlu track delivered/clicked untuk admin analytics?
5. **Rate limit** — admin send-to-all news, perlu throttle (mis. max 1 broadcast/hari)?

---

## Action items untuk BE team

| # | Item | Estimate |
|---|------|----------|
| 1 | Pilih push provider (Expo Push / FCM+APNS direct) | 0.5 hari (decision) |
| 2 | Buat Device + Notification tables | 1 hari |
| 3 | Implement 4 endpoints di atas | 2 hari |
| 4 | Push worker: ibadah reminder cron | 1 hari |
| 5 | Push trigger: event payment verified, branch change status | 1 hari |
| 6 | Push trigger: renungan + event baru | 1 hari |
| 7 | Mobile-api-guide.md update | 0.5 hari |

**Total estimate BE**: ~7 hari (1.5 minggu)
**Mobile adopt setelah BE ready**: 2-3 hari

---

## Reference

- Expo Push API: https://docs.expo.dev/push-notifications/sending-notifications/
- expo-notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- Mobile notifications store: `app/src/stores/notifications.store.ts` (sudah scoped per jemaatId, tinggal extend dengan server sync)
- Mobile notifications inbox: `app/app/notifications.tsx` (UI ready, tinggal swap data source dari local store ke React Query yang call GET /admin/me/notifications)

---

## Kontak

Mobile dev — Ari Christian (`arichrst@ide.asia`)
