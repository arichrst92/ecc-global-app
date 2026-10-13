# BE Update: Homecell untuk Semua Jemaat (Lihat, Cari Terdekat, Minta Bergabung, Approve)

**Date**: 2026-10-13
**From**: BE (sudah diimplementasikan juga di repo mobile, mohon review)

## Ringkasan

Menu Homecell sekarang muncul untuk **semua jemaat**, bukan hanya PIC.

| Peran | Yang tampil |
|---|---|
| Pemimpin (PIC) | Daftar homecell yang dipimpin (kelola seperti sebelumnya) + banner **permintaan bergabung** → terima atau tolak dengan alasan |
| Anggota | **Homecell Saya** → detail **read-only**: jadwal berikutnya, daftar anggota, chat pemimpin, buka Google Maps |
| Belum punya homecell | Daftar homecell di **cabang jemaat** (bisa dicari) + tombol **Cari homecell terdekat** (GPS) → popup 3 rekomendasi lengkap dengan detail → **Minta bergabung** |

Aturan:
- 1 jemaat hanya punya 1 homecell aktif dan 1 permintaan PENDING.
- Saat diterima, jemaat otomatis menjadi anggota dan mendapat notifikasi.
- Saat ditolak, jemaat mendapat notifikasi beserta alasannya.

## Endpoint baru — `/admin/me/homecell/*`

| Method | Path | Keterangan |
|---|---|---|
| GET | `/admin/me/homecell` | `{ role: LEADER\|MEMBER\|NONE, cabang, managed[] (+pendingJoinCount), memberships[], pendingRequests[] }` |
| GET | `/admin/me/homecell/browse?q=&lat=&lng=` | Homecell di cabang user. Kalau `lat`/`lng` dikirim → ada `distanceKm`, diurutkan dari yang terdekat |
| GET | `/admin/me/homecell/nearest?lat=&lng=&limit=3` | `{ items[], totalInCabang, withoutLocation }`, hanya homecell yang punya lokasi |
| GET | `/admin/me/homecell/:id` | Detail read-only + `upcomingSchedules`, `members` (hanya untuk anggota/leader), `picJemaat.noHp` (hanya untuk anggota/leader), `myStatus`, `myPendingRequest` |
| POST | `/admin/me/homecell/:id/join-request` | `{ pesan? }` → 201. Error 409: `ALREADY_IN_HOMECELL`, `JOIN_REQUEST_PENDING` |
| DELETE | `/admin/me/homecell/:id/join-request` | Batalkan permintaan sendiri |
| GET | `/admin/me/homecell/join-requests` | [Leader] PENDING di homecell yang dipimpin |
| POST | `/admin/me/homecell/join-requests/:reqId/approve` | [Leader] → otomatis jadi `HomecellMember` |
| POST | `/admin/me/homecell/join-requests/:reqId/reject` | [Leader] `{ reason? }` |
| PATCH | `/admin/me/homecell/:id/lokasi` | [Leader] `{ mapsUrl: string \| null }`. Menerima link Google Maps (termasuk `maps.app.goo.gl`) atau koordinat `-6.2, 106.8` |

Setiap item list memiliki `myStatus` (`MEMBER` / `PENDING` / `LEADER` / `null`), `hasLocation`, `distanceKm`, `memberCount`, `picJemaat`.

## Notifikasi baru

| type | Penerima | actionUrl |
|---|---|---|
| `HOMECELL_JOIN_REQUESTED` | Pemimpin homecell | `/homecell/requests` |
| `HOMECELL_JOIN_APPROVED` | Jemaat | `/homecell/view/{homecellId}` |
| `HOMECELL_JOIN_REJECTED` | Jemaat | `/homecell` |

WhatsApp (opsional, aktif kalau template diisi admin): `HOMECELL_JOIN_REQUESTED`, `HOMECELL_JOIN_APPROVED`, `HOMECELL_JOIN_REJECTED`. Placeholder yang tersedia: `{nama}`, `{pemohon}`, `{homecell_nama}`, `{alasan}`.

## Perubahan di repo mobile

- **Screen:**
  - `app/homecell/index.tsx` (hub, ditulis ulang)
  - `app/homecell/view/[id].tsx` (detail read-only + atur lokasi untuk leader)
  - `app/homecell/requests.tsx` (approval leader)
- **Komponen:** `src/components/homecell/HomecellListCard.tsx`, `NearestHomecellModal.tsx`
- **API & hooks:** tambahan di `src/api/homecell.ts` dan `src/hooks/useHomecell.ts`, plus `src/hooks/useDebounce.ts`
- **Lokasi:** `src/utils/location.ts`. Native memakai `expo-location`, web memakai `navigator.geolocation`.
- **Beranda:** tile Homecell di `QuickAccess` sekarang tampil untuk semua jemaat.
- **Notifikasi & teks:** tipe notifikasi + routing baru, dan i18n namespace `hcj` (id/en).

### Dependency baru: `expo-location` (wajib build baru, tidak bisa lewat OTA)

```bash
cd app
npx expo install expo-location
```

`app.json` sudah berisi plugin `expo-location` dengan teks izin *"Els App menggunakan lokasi Anda untuk mencari homecell terdekat."* Hanya izin **saat aplikasi dipakai** yang diminta, tidak ada lokasi latar belakang.

## Mohon dites

- [ ] Jemaat tanpa homecell: daftar homecell sesuai cabang, pencarian, lalu Cari terdekat. Popup muncul dengan jarak, dan bisa Minta bergabung.
- [ ] Izin lokasi ditolak: muncul pesan, dan daftar tetap bisa dipakai.
- [ ] Leader: banner permintaan → Terima. Jemaat masuk daftar anggota dan menerima notifikasi.
- [ ] Leader: Tolak dengan alasan. Jemaat menerima notifikasi berisi alasan, lalu bisa memilih homecell lain.
- [ ] Anggota: detail read-only, tidak ada tombol kelola, ada chat pemimpin.
- [ ] Leader: Info & lokasi → tempel link Google Maps → homecell muncul di "Cari terdekat".
- [ ] Web (elsapp): lokasi browser berjalan, karena HTTPS.

## Update: ikut cabang aktif

- `browse` dan `nearest` menerima `?cabangId=` (cabang aktif yang dipilih di app, dari `useViewingBranch`). Tanpa parameter ini, yang dipakai cabang asal jemaat. Sudah dipasang di `app/homecell/index.tsx`.
- `GET /admin/ministry?cabangId=` menampilkan ministry yang punya anggota aktif di cabang tersebut, plus ministry yang belum punya anggota sama sekali (supaya tetap bisa di-join). `memberCount` dan `leader` juga dihitung per cabang. Sudah dipasang di `useMinistryList()`, dan nama cabang tampil di header layar Ministry.
