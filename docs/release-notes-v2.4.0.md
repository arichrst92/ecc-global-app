# Els App v2.4.0 — Release Notes (iOS & Android)

Rilis produksi **iOS & Android**. Versi sebelumnya: **2.3.1** (live di App Store & Google Play).
Build baru wajib (modul audio native `expo-audio`, izin background audio) — **bukan OTA**.

> Teks App Store tidak menyebut Android / Google Play (Apple Guideline 2.3.10).

## Isi rilis (ringkas)
- **ECC Worship** — album & single lagu original ECC: putar (background + lock screen), lirik (tersinkron bila tersedia), mode karaoke, Disukai, unduh offline, bagikan, kartu "Sedang diputar" di Beranda & mini-player. Tile muncul otomatis setelah ada lagu terpublikasi.
- **Doa (Prayer Request)** — kirim pokok doa (bisa anonim), dapat notifikasi + catatan saat sudah didoakan, tandai terjawab + kesaksian. Petugas doa: tab "Ditugaskan ke Saya".
- **Resolusi Tahunan** — *disembunyikan di 2.4.0* (`FEATURES.RESOLUSI = false` di `src/config/features.ts`; layar & API tetap ada).
- **Beranda baru** — Akses Cepat dikelompokkan per tema, kolom menyesuaikan layar; Scanner pindah ke header Beranda, Kalender ke header Profil; tile Doa, Tamu, Group.
- **Event sukarela** — memberi berkali-kali (tombol "Beri lagi"), total & riwayat pemberian di kartu peserta; label biaya tetap "Nominal sukarela".
- **Event** — tarik untuk refresh, data selalu terbaru, event yang dihapus tidak tampil lagi.
- **Popup update** (wajib) bisa di-scroll; laporan error pemutar ke Diagnostics.

---

## Google Play — "Yang baru" (maks. 500 karakter)

**Bahasa Indonesia (id-ID)** — 372 karakter
```
Els App 2.4.0:
• ECC Worship: dengar lagu original ECC, lirik & mode karaoke, unduh offline
• Doa: kirim pokok doa & dapat kabar saat sudah didoakan
• Beranda baru: akses cepat lebih rapi, Scanner di atas
• Event sukarela: bisa memberi berkali-kali, total & riwayat tampil
• Info event selalu terbaru & tarik untuk refresh
• Popup update bisa di-scroll & perbaikan lainnya
```

**English (en-US)** — 351 karakter
```
Els App 2.4.0:
• ECC Worship: listen to ECC original songs, lyrics & karaoke, offline downloads
• Prayer: send prayer requests & get notified when prayed for
• New home: tidier quick access, Scanner on top
• Voluntary events: give more than once, see total & history
• Always up-to-date events & pull to refresh
• Scrollable update popup & other fixes
```

## App Store — "What's New"

**Bahasa Indonesia**
```
Els App 2.4.0 — ibadah, doa, dan pujian dalam satu aplikasi.

ECC WORSHIP (BARU)
• Dengarkan album & single lagu original ECC, tetap berbunyi saat layar terkunci
• Lirik mengikuti lagu, plus mode karaoke (musik tanpa vokal) dengan lirik besar
• Putar semua, acak, ulang, antrian, dan lagu favorit
• Unduh lagu untuk didengar tanpa internet
• Bagikan lagu ke teman

DOA (BARU)
• Kirim pokok doa ke tim ECC (bisa anonim) dan dapat kabar saat sudah didoakan
• Tandai doa yang sudah terjawab dan tulis kesaksian singkat

BERANDA BARU
• Akses Cepat dikelompokkan per tema dan menyesuaikan lebar layar
• Scanner di header Beranda, Kalender di header Profil
• Kartu "Sedang diputar" saat lagu ECC Worship diputar

EVENT
• Event sukarela: bisa memberi lebih dari sekali, total & riwayat pemberian tampil
• Tarik layar untuk memuat ulang; info event selalu terbaru

PERBAIKAN
• Pemberitahuan update bisa di-scroll
• Berbagai perbaikan & peningkatan stabilitas
```

**English**
```
Els App 2.4.0 — worship, prayer, and church life in one app.

ECC WORSHIP (NEW)
• Listen to ECC original albums & singles, even with the screen locked
• Lyrics that follow the song, plus karaoke mode (instrumental) with large lyrics
• Play all, shuffle, repeat, queue, and liked songs
• Download songs to listen offline
• Share songs with friends

PRAYER (NEW)
• Send prayer requests to the ECC team (anonymously if you like) and get notified when prayed for
• Mark answered prayers and share a short testimony

NEW HOME
• Quick Access grouped by theme and adapts to your screen
• Scanner in the Home header, Calendar in the Profile header
• "Now playing" card while ECC Worship is playing

EVENTS
• Voluntary-giving events: give more than once, with total & history
• Pull to refresh; event info always up to date

FIXES
• Scrollable update notice
• Many other improvements & stability fixes
```

## App Store — App Review notes (tambahan untuk 2.4.0)
Gabungkan ke `docs/app-review-notes-v2.3.1.md` (total ≤ 4000 karakter). Tambahkan di COMPLIANCE NOTES:
```
8. Background audio (UIBackgroundModes: audio): used only by "ECC Worship" to keep playing the church's own songs when the screen is locked, with lock-screen controls. All songs are original works owned by El Shaddai Creative Community (ECC). Streaming requires login; downloaded songs are stored inside the app only. No microphone access is requested.
```
Dan di KEY FLOWS:
```
7. ECC Worship: Home → "Worship" tile (appears once songs are published) → album → Play. Lock the screen to verify background playback. Prayer: Home → "Doa".
```

---

## Portal → App Versions (setelah 2.4.0 LIVE)

| Field | iOS | Android |
|---|---|---|
| Latest version | 2.4.0 | 2.4.0 |
| Min supported version | 2.2.6 (tidak wajib update) | 2.2.6 |
| Download URL | https://apps.apple.com/id/app/els-app/id6804400672 | https://play.google.com/store/apps/details?id=idea.eccchurch.global |
| Release notes | ringkas 3–5 baris (popup lama 2.3.x belum bisa di-scroll) | sama |

Saran release notes singkat untuk popup:
```
• ECC Worship: lagu original ECC, lirik & karaoke
• Doa: kirim pokok doa & dapat kabar saat didoakan
• Beranda baru & event sukarela bisa memberi berkali-kali
```

## Checklist sebelum submit
- [ ] Core-api, portal, landing ECC Worship & Prayer/Resolusi sudah **di-deploy** + migration jalan.
- [ ] Minimal **1 lagu terpublikasi** (supaya tile Worship muncul untuk reviewer & jemaat), atau sampaikan di review notes.
- [ ] Role petugas doa sudah diatur (Portal → Prayer Request → Konfigurasi Petugas).
- [ ] Google Play: isi deklarasi **foreground service — media playback** bila diminta Play Console.

## Smoke test (build 2.4.0, iOS & Android)
- Beranda: tile tersusun per tema; Scanner di header (akun petugas); Kalender di header Profil
- Worship: putar album → kunci layar → musik tetap jalan + kontrol lock screen; next/prev; acak/ulang
- Toggle Vokal ↔ Karaoke lanjut dari detik yang sama; lirik tersinkron menyala; ketuk baris → lompat
- Unduh lagu → mode pesawat → masih bisa diputar
- Kartu "Sedang diputar" di Beranda muncul saat memutar, hilang saat ditutup (X)
- Doa: kirim (anonim) → portal assign → petugas tandai didoakan → notifikasi + WA ke jemaat
- Menu Resolusi **tidak** tampil (Beranda & Profil)
- Event sukarela: Beri lagi via web → kartu peserta menampilkan total & riwayat; label biaya "Nominal sukarela"
- Event dihapus di portal → tidak tampil lagi di app (buka ulang / tarik refresh)
- Popup force update: catatan panjang bisa di-scroll, tombol Update terlihat
