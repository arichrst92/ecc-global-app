# Mobile Update — Sprint 6 Adoption (v1.6.0)

**Dari:** Tim Mobile (Ari)
**Untuk:** Tim Backend ECC (IDEA)
**Tanggal:** 2026-08-24
**Version target:** v1.6.0 (belum submit ke store — sedang build production)
**Related BE docs:**
- [`backend-notice-in-app-notifications.md`](./backend-notice-in-app-notifications.md) (deployed 2026-08-03)
- [`backend-request-ministry-endpoints.md`](./backend-request-ministry-endpoints.md) (item 4 RESOLVED 2026-08-03)

---

## TL;DR

Mobile **fully adopt** dua deliverables terakhir dari BE (in-app notifications + ministry join). Semua 5 endpoint baru wired + tested via typecheck. Commit `4dff265` di `main`. Deploy v1.6.0 ke Play Store + App Store on the way (menunggu screenshots + submit).

Ada **3 flag** untuk BE cek/konfirmasi sebelum production traffic mulai (bukan blocker, tapi worth klarifikasi).

---

## 1. In-App Notifications — Adoption Confirmed

### Endpoints Consumed

| Endpoint | Consumer | Poll Strategy |
|---|---|---|
| `GET /admin/me/notifications?limit=20&before=<cursor>` | `useNotificationsList` (useInfiniteQuery) | Manual pull-to-refresh + on mount, staleTime 30s |
| `GET /admin/me/notifications/unread-count` | `useNotificationBadge` | **Poll 30s + refetch on focus**, staleTime 25s |
| `POST /admin/me/notifications/:id/read` | `useMarkNotificationRead` | On row tap — optimistic badge decrement |
| `POST /admin/me/notifications/mark-all-read` | `useMarkAllNotificationsRead` | Header action — optimistic badge=0 |

**Auth gating:** polling hanya jalan kalau `accessToken` + `!isGuest`. Guest user zero traffic ke notif endpoints.

### Bell Icon Placement

Bell dgn badge unread di **6 tab utama**:
- Home (variant light, di atas orange hero)
- Ibadah, Event, CKids, Persembahan, Profile (variant dark, header putih; Profile variant light di header orange)

Tap bell → navigate ke `/notifications` (single screen, cursor infinite scroll).

### Deep-Link Routing per Type

Mobile prioritas: `actionUrl` dari BE payload > fallback per-type dari `metadata`. Berikut mapping fallback (dipakai kalau BE emit `actionUrl: null`):

| Type | Fallback route | Requires metadata |
|---|---|---|
| `CKIDS_CHECKIN` | `/my-reservasi` | — (PickupCodeCard prominent di list) |
| `CKIDS_PICKUP` | `/my-reservasi` | — |
| `GIFT_REDEEMED` | `/(tabs)/ckids` | — (anak selector auto-follow last) |
| `POINT_EARNED` | `/(tabs)/ckids` | — |
| `POINT_ADJUSTED` | `/(tabs)/ckids` | — |
| `FAMILY_LINKED` | `/family` | — |
| `GROUP_MEMBER_ADDED` | `/group/{groupId}` | `metadata.groupId` |
| `GROUP_MEMBER_REMOVED` | `/group/{groupId}` (fallback `/group`) | `metadata.groupId` |
| `GROUP_DISMISSED` | `/group` | — |
| `EVENT_REGISTERED` | `/event/{eventId}` (fallback `/(tabs)/event`) | `metadata.eventId` |
| `EVENT_APPROVED` | `/event/{eventId}` | `metadata.eventId` |
| `EVENT_CHECKED_IN` | `/event/{eventId}` | `metadata.eventId` |
| `HOMECELL_ATTENDED` | `/homecell/{homecellId}` | `metadata.homecellId` |
| `VISIT_RECORDED` | `/visit` | — |
| `BRANCH_CHANGE_APPROVED` | `/profile` | — |
| `BRANCH_CHANGE_REJECTED` | `/profile` | — |

**Bell hint untuk BE:** kalau ada type di atas yang di production sering emit `actionUrl: null`, mobile fallback route sudah cover. Recommended tetap emit `actionUrl` kalau ada — mobile prefer BE-provided target (single source of truth).

### Icon + Color Mapping

18 icon keys mapped ke lucide-react-native icons + palette color (brand-50, amber-50, emerald-50, blue-50, purple-50, orange-50, cyan-50, green-50, red-50). Full mapping di `src/utils/notifRouting.ts`.

### UX Behavior

- **Unread indicator:** row bg `brand-50` + dot indicator kanan atas
- **Read indicator:** row bg white, no dot
- **Time display:** relative (mis. "5 menit lalu", "3 jam lalu", "2 hari lalu")
- **Group heading:** Today / Yesterday / Earlier
- **Empty state:** icon bell besar + copy generic
- **Error state:** retry button dgn i18n message

---

## 2. Ministry Join Phase 2 — Adoption Confirmed

### Endpoint Consumed

```
POST /admin/ministry/:id/join
Body (optional): { roleId?, motivasi? }
```

Mobile saat ini kirim **empty body `{}`** — BE default assign role level terendah (biasanya "Anggota"). Fitur pick role explicit + motivasi field belum di-expose UI (defer).

### Error Handling

| BE response | Mobile handling |
|---|---|
| 200/201 success | Toast success `join_success` dgn `{ministry, posisi}` interpolation |
| 409 ALREADY_MEMBER | Toast info `join_already_member` (bukan error) |
| 400 `Ministry ini tidak buka untuk join` | Toast error dgn message dari BE |
| Network error | Toast error `join_error` generic |

**Klarifikasi butuh:** BE response 409 sekarang punya `code` `CONFLICT` atau specific string `ALREADY_MEMBER`? Mobile pakai heuristik `status === 409 || /already/i.test(message) || /sudah/i.test(message)` — supaya robust ke bahasa message. Kalau BE bisa emit `code: 'ALREADY_MEMBER'` explicit, mobile bisa switch ke code match yg lebih presisi. **Not blocker** — heuristik sekarang works.

### Cache Invalidation

Setelah join success, mobile invalidate:
- `['ministry', 'detail', id]` — re-fetch dgn `myMembership` populated
- `['ministry', 'list']` — re-fetch memberCount++
- `['me', ...]` — semua query yang start dgn `['me']` (untuk `/admin/me.ministries` update di Profile MinistryCard)

**Klarifikasi butuh:** BE cache `/admin/me` response berapa lama? Kalau ada server-side cache > 5 detik, user bisa lihat stale membership di Profile setelah join. Preferensi mobile: `/admin/me` return fresh data (no cache atau cache < 5s), atau expose invalidation hint header. **Not blocker** — kalau delay ~1-2 detik masih OK UX.

---

## 3. Open Questions untuk BE

### Q1: BE cache untuk `/admin/me/notifications/unread-count`

BE notice mention "cached 10s server-side" — mobile poll 30s + staleTime client 25s. Total worst case delay bell update = `10s BE cache + 30s poll interval + network = ~40s`. Untuk parent yg watching pickup notif, ini acceptable, tapi kalau ada opsi push notif (FCM) future — akan drop ke < 5s.

**Question:** Cache TTL 10s benar-benar hardcoded, atau bisa tuning per user role? (Mis. parent user (has CHILD family) → cache 5s karena high-value; user tanpa CHILD → cache 30s).

### Q2: Notif deduplication policy

**Scenario:** parent punya 2 anak yang check-in di kids ibadah yang sama, back-to-back dalam 30 detik. Apakah BE emit 2 notif terpisah (satu per anak) atau 1 aggregated notif ("2 anak sudah check-in")?

Mobile UI sekarang assume **1 notif per event** — kalau 2 anak = 2 rows di feed. Kalau BE aggregate, `metadata` structure perlu adjustment (mis. `metadata.anakIds: [id1, id2]` array vs single `anakId`).

**Recommend:** untuk MVP tetap 1 notif per event (simple + explicit per anak). Aggregation defer sampai user feedback justify.

### Q3: Timezone consistency untuk `createdAt`

BE emit `createdAt` sebagai ISO string. Mobile parse via `new Date(iso).getTime()` untuk time-ago calculation. Assume BE emit dalam UTC (ISO dgn Z suffix atau offset explicit).

**Confirm:** BE emit UTC atau server-local (WIB)? Kalau WIB tanpa offset marker, `new Date()` parse bisa incorrect di device dgn locale berbeda.

---

## 4. Not Adopted (Deferred)

**Push notifications (FCM):** deferred sesuai BE recommendation. Polling 30s sudah cover MVP. Push adoption planned sprint berikutnya kalau BE deliver FCM setup + registration endpoint.

**In-app toast saat notif baru muncul:** planned tapi tidak masuk v1.6.0. User harus explicitly tap bell untuk lihat notif baru. Future: auto-toast kalau app di foreground + poll dapat unread baru.

**Notification preferences (mute per type):** deferred. BE belum expose endpoint preference. Semua user dapat semua 16 types default.

**Delete notif dari UI:** deferred per BE spec (audit trail — user tidak boleh delete). BE cron potong > 90 hari (TBD implement).

**Ministry join dgn `roleId` explicit + `motivasi`:** UI belum expose form untuk pilih role atau tulis motivasi. Default empty body → BE assign role terendah. Follow-up sprint kalau ada demand.

---

## 5. Testing Notes

**Manual test yang direkomendasikan sebelum production:**

1. **Notif routing round-trip:** trigger tiap 16 type via BE admin tool (mis. admin kirim adjust point ke anak → parent dapat POINT_ADJUSTED notif → tap → confirm navigate ke correct screen)
2. **Badge accuracy:** unread-count sync dgn actual unread rows setelah mark-read + mark-all-read
3. **Cursor pagination:** scroll melewati page 1 (> 20 notif) → confirm `hasMore` + `nextCursor` behavior benar
4. **Ministry join fresh + already-member flow:** first join → success toast, join lagi → info toast (bukan crash)
5. **`me.ministries` update:** join ministry → langsung buka Profile → MinistryCard tampil ministry baru (test cache invalidation reach)

Kalau BE test staging ada dashboard untuk simulate/emit notif events, please share URL — mobile bisa smoke test end-to-end tanpa nunggu real event.

---

## 6. Files Changed (v1.6.0)

**New files (5):**
- `app/src/types/notification.ts`
- `app/src/api/notification.ts`
- `app/src/hooks/useNotifications.ts`
- `app/src/components/NotificationBell.tsx`
- `app/src/utils/notifRouting.ts`

**Modified:**
- `app/app.json` (version bump 1.5.0 → 1.6.0)
- `app/app/notifications.tsx` (rewrite dari zustand local → real BE feed)
- `app/app/(tabs)/{index,ibadah,event,ckids,persembahan,profile}.tsx` (bell placement)
- `app/app/ministry/[id].tsx` (join button replace WA notice)
- `app/src/api/ministry.ts` (add joinMinistry + JoinMinistryPayload)
- `app/src/hooks/useMinistry.ts` (add useJoinMinistry + MINISTRY_KEYS export)
- `app/src/i18n/locales/{id,en}.json` (ministry.join_* + closed_notice keys)

**Ref commit:** `4dff265 feat(sprint6): in-app notifications + ministry join (v1.6.0)`

---

## Contact

- Mobile team: Ari (arichrst@ide.asia)
- Deploy target: v1.6.0 replace v1.5.0 sebagai first launch bundle
- Timeline: production submit dalam 3-7 hari (menunggu screenshots + Play Console + App Store Connect app entry setup)

Kalau ada blocker atau butuh iterate response BE, reply di doc ini atau ping via ECC repo issue.

---

*Doc versi: 1.0 — 2026-08-24.*
