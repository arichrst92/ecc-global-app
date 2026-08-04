# Backend Notice — In-App Notifications (Modul 30)

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari)
**Tanggal:** 2026-08-03
**Priority:** 🟠 High — parent-side feature critical
**Status:** 🚀 Backend siap deploy (pending git push + VPS)

---

## TL;DR

Setelah audit notif coverage 3 hari terakhir, ditemukan 5 event yang seharusnya notify user tapi silent:

1. **Kids check-in** — parent tidak dapat kode jemput otomatis
2. **Kids pickup** — parent tidak dapat konfirmasi anak dijemput (anti-abduction)
3. **Gift stall redeem** — parent tidak tahu anak redeem apa (anti-fraud)
4. **Point earn/adjust** — silent
5. **Family link** — target jemaat tidak tahu di-link sebagai relasi

Backend deliver **in-app notification feed** — table `notification` + 4 endpoint di `/admin/me/notifications/*`. Mobile poll 30s (per keputusan user).

Fokus mobile: bikin bell icon di header + notification screen. Push notif (FCM) defer ke sprint lain.

---

## Data Model

**Table**: `notification` (baru)

```prisma
model Notification {
  id          String   @id @default(uuid())
  jemaatId    String   // recipient
  type        InAppNotifType
  title       String   // display headline (max 200)
  body        String   // display body (multi-line OK)
  actionUrl   String?  // deep-link route mobile (mis. "/ckids/reservasi/{uuid}")
  metadata    Json?    // context bebas (pickupCode, pointAmount, redeemId, dll)
  readAt      DateTime? // null = unread
  createdAt   DateTime
}
```

**Enum `InAppNotifType`** (13 values total per 2026-08-03 extension):
- Ckids: `CKIDS_CHECKIN`, `CKIDS_PICKUP`, `GIFT_REDEEMED`, `POINT_EARNED`, `POINT_ADJUSTED`
- Family: `FAMILY_LINKED`
- Group: `GROUP_MEMBER_ADDED`, `GROUP_MEMBER_REMOVED`, `GROUP_DISMISSED`
- Event: `EVENT_APPROVED`, `EVENT_CHECKED_IN`
- Branch Change: `BRANCH_CHANGE_APPROVED`, `BRANCH_CHANGE_REJECTED`

Terpisah dari `notification_log` existing (yang untuk queue outbound WA). Kalau nanti mau kirim WA + in-app duplicate, keduanya coexist.

---

## Endpoints

Semua di `/admin/me/notifications/*`, auth Bearer JWT jemaat (siapapun bisa akses feed-nya sendiri).

### 1. `GET /admin/me/notifications`

List notif user, sort by createdAt desc, cursor-based pagination.

**Query params:**
| Param | Type | Default | Deskripsi |
|---|---|---|---|
| `limit` | int | 20 | Max per page (max 100) |
| `before` | ISO datetime | — | Cursor: return rows `createdAt < before` |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "jemaatId": "uuid-parent",
      "type": "CKIDS_CHECKIN",
      "title": "Budi Jr sudah check-in",
      "body": "Ibadah: Ibadah Anak Minggu Pagi. Kode jemput: 483920. Tunjukkan kode ini ke admin saat menjemput.",
      "actionUrl": "/ckids/reservasi/uuid-reservasi",
      "metadata": {
        "anakId": "uuid-anak",
        "reservasiId": "uuid-reservasi",
        "pickupCode": "483920",
        "ibadahNama": "Ibadah Anak Minggu Pagi"
      },
      "readAt": null,
      "createdAt": "2026-08-04T09:00:00Z"
    }
  ],
  "meta": {
    "limit": 20,
    "hasMore": true,
    "nextCursor": "2026-08-04T08:45:00Z"
  }
}
```

### 2. `GET /admin/me/notifications/unread-count`

Untuk badge di bell icon. Response cached 10s (server-side header) supaya polling 30s tidak hit DB tiap request.

**Response 200:**
```json
{ "success": true, "data": { "count": 3 } }
```

### 3. `POST /admin/me/notifications/:id/read`

Mark 1 notif sebagai read. Idempotent — kalau sudah read, return existing tanpa error. Guard: kalau `jemaatId` bukan requester → 403.

**Response 200:**
```json
{ "success": true, "data": { /* Notification */ } }
```

### 4. `POST /admin/me/notifications/mark-all-read`

Mark semua unread notif user sebagai read.

**Response 200:**
```json
{ "success": true, "data": { "markedRead": 12 } }
```

---

## Type Values + Recommended UI

| Type | Kapan Trigger | actionUrl Example | Icon Suggestion |
|---|---|---|---|
| `CKIDS_CHECKIN` | Admin check-in anak di kids ibadah | `/ckids/reservasi/{uuid}` | User + smile / stopwatch |
| `CKIDS_PICKUP` | Anak dijemput dari kids ibadah | `/ckids/reservasi/{uuid}` | Handshake / door |
| `GIFT_REDEEMED` | Anak redeem hadiah di stall | `/ckids/anak/{uuid}/history` | Gift box |
| `POINT_EARNED` | Anak dapat point (via kehadiran auto atau award manual) | `/ckids/anak/{uuid}` | Plus circle / star |
| `POINT_ADJUSTED` | Admin adjust point manual (+/-) | `/ckids/anak/{uuid}` | Sliders / edit |
| `FAMILY_LINKED` | Jemaat di-add sebagai relasi keluarga | `/family` | Users / heart |
| `GROUP_MEMBER_ADDED` | PIC add jemaat ke group | `/groups/{uuid}` | Users + plus |
| `GROUP_MEMBER_REMOVED` | PIC remove jemaat dari group | `/groups` | Users + x |
| `GROUP_DISMISSED` | Group di-dismiss (soft-delete) — batch notif ke all members | `/groups` | Archive / x-circle |
| `EVENT_APPROVED` | Admin approve peserta event berbayar | `/event/{uuid}` | Ticket + check |
| `EVENT_CHECKED_IN` | Peserta scan QR di hari H event | `/event/{uuid}` | Ticket + qrcode |
| `BRANCH_CHANGE_APPROVED` | Admin approve permohonan pindah cabang | `/profile/branch` | Map + check |
| `BRANCH_CHANGE_REJECTED` | Admin reject permohonan pindah cabang | `/profile/branch` | Map + x |

Metadata JSON konten bervariasi per type — pakai untuk display prominent (mis. `metadata.pickupCode` di card besar untuk CKIDS_CHECKIN).

---

## Recommended Mobile UI Flow

### Bell Icon di Header

- Tampil di semua screen utama (Home, Ibadah, CKids, Event, Profile).
- Badge angka merah kalau `unreadCount > 0`, "99+" kalau > 99.
- Poll `unread-count` every 30s pakai `setInterval` di App root atau `useNotificationBadge` hook.
- Tap bell → navigate ke `/notifications` (Notification screen).

### Notification Screen

- Cursor infinite scroll pakai `nextCursor`.
- Row layout: icon (per type) + title (bold) + body (2-line ellipsis) + relative time ("2 menit lalu").
- Unread rows dengan background subtle brand color + dot indicator.
- Tap row: (a) mark read via POST `/:id/read`, (b) navigate to `actionUrl` kalau ada.
- Header actions: "Tandai semua sudah dibaca" → POST `mark-all-read`.
- Empty state: illustration + copy "Belum ada notifikasi".

### Foreground Behavior

- Saat app di foreground + poll return unread baru → optional in-app toast (mis. `<Toast>Budi Jr check-in — kode 483920</Toast>`).
- Background: no push (FCM defer).

### Sample Hook

```typescript
// hooks/useNotifications.ts
export function useNotificationBadge() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/admin/me/notifications/unread-count').then(r => r.data.data.count),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: ['notifications', 'list'],
    queryFn: ({ pageParam }) =>
      api.get('/admin/me/notifications', { params: { limit: 20, before: pageParam } })
        .then(r => r.data),
    getNextPageParam: (last) => last.meta.hasMore ? last.meta.nextCursor : undefined,
  });
}
```

---

## Backward Compat & Notes

- **Zero mobile-breaking**: mobile lama tanpa notification UI tetap jalan normal. Notif silent tersimpan di DB, effect saat mobile baru update.
- **Guardian resolution**: backend resolve parent via `jemaat.primaryGuardianId` + `JemaatRelasi` tipe (Ayah/Ibu/Wali). Semua guardian anak dapat notif — mis. dua parent, dua notif. Kalau tidak ada guardian tercatat, notif skip silent.
- **Family link notif**: fire-and-forget (bukan approval flow). Kalau ternyata perlu consent workflow, deploy later dgn new schema `FamilyLinkRequest`.
- **Deletion**: user tidak bisa delete notif via GUI (audit). Backend cron potong data > 90 hari (belum implement — TBD kalau butuh).

---

## Rate Limits

- Standard admin-tier (300/menit/user). Mobile poll 30s → 2/menit → jauh di bawah limit.

---

## Deploy Timeline

- **Backend deploy**: 2026-08-03 malam via runbook standard (migrate deploy + core-api restart).
- **Mobile adopt**: recommended Sprint 6 (v1.6.0). Effort estimate: 4-6 jam (bell + screen + hook + navigation wiring).

---

## Contact

- Backend team: IDEA dev
- Ref implementation: `apps/core-api/src/routes/admin/me.ts` (endpoint), `apps/core-api/src/lib/notification.ts` (helper + guardian resolver)
- Backend emit sites: `reservasi.ts` (checkin + pickup + award-point), `gift-stall.ts` (redeem + adjust-point), `family-relation.ts` (upsert)

Kalau ada blocker atau mau discuss UX detail, kirim reply di doc ini atau ping via ECC repo issue.

---

*Doc versi: 1.1 — 2026-08-03. Update log:*
*- v1.0 (2026-08-03) initial spec dgn 6 event kids-family*
*- v1.1 (2026-08-03) extend dgn 7 event tambahan (group add/remove/dismiss, event approve/checkin, branch change approve/reject) → total 13 InAppNotifType. Migration `20260803110000_extend_notif_types` ALTER TYPE ADD VALUE idempotent.*
