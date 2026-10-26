# Els App v2.4.1 — Release Notes (iOS & Android)

Rilis produksi **iOS & Android** + Els App web. Versi sebelumnya: **2.4.0**.
Build baru wajib (modul native baru `expo-calendar`, `expo-brightness`) — **bukan OTA**.

> Teks App Store tidak menyebut Android / Google Play (Apple Guideline 2.3.10).
> Resolusi Tahunan tetap aktif (ikon di header Profil) tapi **tidak diumumkan**.

## Isi rilis (ringkas)
- **Tiket reservasi** — Reservasi Saya (ibadah & event) tampil sebagai tiket per orang; geser untuk check-in; tampilan penuh QR besar + layar terang; simpan ke kalender & petunjuk arah; "Tiket Saya" di detail ibadah/event.
- **Menu bawah** — Beranda · Event · Reservasi · CKids · Profil. Jadwal ibadah dari tile Ibadah di Beranda.
- **Mode gelap** — Profil → Tampilan (tidak mengikuti HP).
- **Gradien oranye** di area & tombol utama; logo Els App bersudut bulat; logo IDEA terlihat di mode gelap.
- **OTP satu kolom** — bisa tempel seluruh pesan, saran kode keyboard (SMS).
- **Izin**: iOS < 17 meminta izin kalender sekali saat "Simpan ke kalender". Android **tidak** menambah izin (READ/WRITE_CALENDAR & WRITE_SETTINGS diblokir).

---

## Google Play — "Yang baru" (maks. 500 karakter)

**Bahasa Indonesia (id-ID)**
```
Els App 2.4.1:
• Reservasi kini berbentuk tiket dengan QR besar
• Geser tiket untuk check-in ibadah & event
• Simpan jadwal ke kalender & buka petunjuk arah
• Menu baru: Beranda, Event, Reservasi, CKids, Profil
• Mode gelap di Profil → Tampilan
• Kode OTP lebih mudah diisi & perbaikan lainnya
```

**English (en-US)**
```
Els App 2.4.1:
• Reservations are now tickets with a large QR
• Swipe a ticket to check in to services & events
• Save to calendar & get directions
• New tabs: Home, Events, Bookings, CKids, Profile
• Dark mode in Profile → Appearance
• Easier OTP entry & other fixes
```

## App Store — "What's New"

**Bahasa Indonesia**
```
Els App 2.4.1 — tiket reservasi & mode gelap.

TIKET RESERVASI
• Reservasi ibadah & event kini berbentuk tiket, satu untuk setiap orang
• Geser tiket untuk check-in saat self check-in dibuka
• Ketuk tiket untuk QR besar, layar otomatis terang
• Simpan jadwal ke kalender & buka petunjuk arah
• Tiket juga tampil di halaman detail ibadah & event

MENU BARU
• Beranda, Event, Reservasi, CKids, Profil

TAMPILAN
• Mode gelap: Profil → Tampilan
• Warna oranye bergradien pada tombol utama

LAINNYA
• Kode OTP diisi di satu kolom, bisa tempel langsung
• Berbagai perbaikan & peningkatan stabilitas
```

**English**
```
Els App 2.4.1 — reservation tickets & dark mode.

RESERVATION TICKETS
• Service & event reservations are now tickets, one per person
• Swipe a ticket to check in when self check-in opens
• Tap a ticket for a large QR with auto-brightness
• Save to calendar & get directions
• Tickets also appear on service & event details

NEW TABS
• Home, Events, Bookings, CKids, Profile

LOOK & FEEL
• Dark mode: Profile → Appearance
• Gradient orange on primary buttons

OTHER
• Single-field OTP entry with paste support
• Many other improvements & stability fixes
```

## App Review notes
Pakai `docs/app-review-notes-v2.4.1.md` (≤ 4000 karakter).

## Portal → App Versions (setelah 2.4.1 LIVE)

| Field | iOS | Android |
|---|---|---|
| Latest version | 2.4.1 | 2.4.1 |
| Min supported version | tetap (tidak wajib update) | tetap |

Release notes popup:
```
• Reservasi kini berbentuk tiket — geser untuk check-in
• Menu baru Reservasi & mode gelap di Profil
• Kode OTP lebih mudah diisi
```

## Smoke test (build 2.4.1, iOS & Android)
- Menu bawah: Beranda, Event, Reservasi, CKids (hanya bila punya anak), Profil
- Tab Reservasi: segmen Ibadah/Event, Aktif/Riwayat; kosong → tombol "Lihat jadwal ibadah"
- Reservasi ibadah dari Beranda → Ibadah → tiket muncul; geser check-in (dalam jendela & radius)
- Tiket penuh: QR besar, layar terang lalu kembali normal; Simpan ke kalender (iOS 16 minta izin sekali); Petunjuk arah
- Mode gelap: Profil → Tampilan → Gelap; cek Beranda, tiket, popup; kembali ke Terang
- OTP: ketik manual; salah → hapus satu → benar; tempel seluruh pesan WhatsApp
- Akun App Review (OTP statis) & mode tamu
- Worship lock screen tetap menampilkan judul & album
