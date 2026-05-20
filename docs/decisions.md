# Architecture Decisions

## ADR-001 — Tech stack: React Native + Expo

**Status**: Accepted (2026-05-19)

Cross-platform, JS/TS ecosystem familiar. Single codebase iOS + Android.

**Alternatives considered**:
- Flutter — bagus tapi tim sudah TS-heavy
- Native (Swift + Kotlin) — performa terbaik, tapi 2 codebase

**Implications**: Expo Router, EAS Build, expo-camera, expo-secure-store, react-native-vision-camera (kalau Expo camera tidak cukup).

---

## ADR-002 — Single app, role-based UI

**Status**: Accepted (2026-05-19)

Satu app untuk semua persona (jemaat, volunteer, PIC homecell/area, pastor, guest). RBAC via `user.menuAccess` dari login response + per-resource `canScanAttendance` flag.

**Alternatives**: Split — Jemaat app vs Scanner app. Lebih ringan tapi maintain 2 codebase + brand confusion.

---

## ADR-003 — Scanner & PIC features bukan di bottom nav

**Status**: Accepted (2026-05-19)

Bottom nav konsisten 5 tab untuk semua role: Home / Ibadah / Event / Beri / Profil.

- **Scanner** muncul sebagai tombol di Ibadah Detail / Event Detail (saat user authorized scanner)
- **PIC Homecell** akses lewat Profile → card Homecell
- **PIC Area** akses lewat Profile → card Area

**Reason**: Nav tab yang berubah-ubah per role bikin layout jitter dan confusing. Scanner kontekstual (selalu untuk ibadah/event spesifik).

---

## ADR-004 — Bilingual ID/EN dari Day 1

**Status**: Accepted (2026-05-19)

i18n setup dari awal. Tidak retrofit. Default: Indonesia. Target sekunder: expat / international branches.

**Library**: react-i18next + i18next.

---

## ADR-005 — Token storage di Secure Storage

**Status**: Accepted

`accessToken` (15 menit) + `refreshToken` (30 hari) disimpan di:
- iOS: Keychain (default via `expo-secure-store`)
- Android: EncryptedSharedPreferences (`expo-secure-store`)

**Bukan**: SharedPreferences plain, AsyncStorage, atau localStorage.

---

## ADR-006 — QR Card multi-card carousel

**Status**: Accepted (2026-05-19)

QR Card screen menampilkan saya + semua anggota keluarga sebagai swipeable carousel. Berguna saat orang tua check-in dengan anak-anaknya.

Auto-blur per kartu setelah 30 detik (privacy).

---

## ADR-007 — Sticky bottom CTAs harus flex column, bukan absolute

**Status**: Accepted (2026-05-19, ditemukan saat user testing mockup)

Pola yang BENAR:
```tsx
<View style={{flex: 1}}>
  <ScrollView style={{flex: 1}}>...content...</ScrollView>
  <View>...sticky bottom CTA...</View>  {/* flex child, bukan absolute */}
</View>
```

Pola yang SALAH:
```tsx
<View style={{flex: 1, position: 'relative'}}>
  <ScrollView>...content...</ScrollView>
  <View style={{position: 'absolute', bottom: 0}}>CTA</View>  {/* bisa tertutup */}
</View>
```

---

## ADR-008 — Bluetooth Printer Label (opsional)

**Status**: Accepted (2026-05-19)

Support thermal label printer Bluetooth (ESC/POS) untuk print label QR + nama jemaat saat check-in event. Setting di Profile → Printer.

**Library candidate**: `react-native-bluetooth-escpos-printer` atau `react-native-thermal-printer`.

Print Label button muncul inline di scan result modal (success/walk-in) saat printer connected.

---

## ADR-009 — Family management & registration

**Status**: Accepted (2026-05-19)

Anggota keluarga bisa link via 3 cara:
1. Scan QR jemaat existing
2. Search by phone (jemaat existing)
3. Register baru (untuk anak/balita atau yang belum punya akun ECC)

Saat register baru, opsi toggle "Anggota ini belum punya nomor HP" — kalau on, field HP optional. Profile dibuat tanpa kredensial login. Akun bisa di-link no HP nanti.

Saat daftar event / reservasi ibadah, family selector muncul dengan checkbox per anggota. Total fee dihitung otomatis untuk event berbayar.

---

## ADR-010 — Bible: Terjemahan Baru (TB) LAI

**Status**: Accepted (2026-05-19)

Versi Alkitab default: Terjemahan Baru (TB) — Lembaga Alkitab Indonesia. Paling umum di gereja Pentecostal/Charismatic Indonesia.

Source data: dapatkan via API publik (mis. bible.com / e-sword) atau bundle JSON di asset (~5MB compressed).

---

## ADR-012 — Branch context switcher (roaming jemaat)

**Status**: Accepted (2026-05-20)

Aplikasi mendukung dua konsep cabang yang **berbeda**:

1. **Cabang Home** (`Jemaat.cabangId`) — keanggotaan permanen. Ganti = perlu admin approval via Branch Change Request (1-3 hari).
2. **Cabang Viewing** (state lokal `viewingCabangId`) — konteks tampilan saat ini. Instant switch, no approval. Use case: jemaat Bandung sedang di Jakarta dan ingin ibadah/event di Jakarta tanpa kehilangan identitas Bandung-nya.

### Apa yang ikut switch

- Ibadah list & calendar
- Event list
- Persembahan rekening (cabang yang sedang di-view)
- News cabang-specific (cabang + global)
- Today's service card di Home

### Apa yang TIDAK switch

- Profile (Home tetap)
- Family list
- QR Card (kode jemaat global — bisa di-scan di cabang manapun)
- Renungan (sinode-wide, tidak per-cabang)
- Homecell membership
- Statistik personal (streak, attended, dll — berdasarkan total kehadiran user)

### UI patterns

- **Branch chip di Home header**: tap → buka bottom sheet selector
- **Bottom sheet**: "Cabang Home" section (1 cabang user) + "Cabang Lain" section (semua cabang lain aktif)
- **Persistent banner** (orange gradient) di top kalau viewing != home: "📍 Sedang menjelajahi ECC Jakarta — Kembali ke Home"
- **Header subtitle** di Ibadah/Event/Persembahan list: "ECC Bandung · VIEW" indicator
- **Chevrons-up-down icon** di app bar yang affected screens (Ibadah, Event, Persembahan) untuk quick access ke switcher
- **Persembahan header**: gradient orange (bukan brand) saat viewing != home, untuk visual cue user "giving to other branch"

### Persistence

Persist di `expo-secure-store` (atau localStorage di web). Reset saat logout. User di Jakarta seminggu tidak perlu re-switch tiap buka app.

### Backend integration

**No new endpoints needed.** Semua endpoint yang affected sudah accept `cabangId` query param:
- `GET /admin/ibadah?cabangId=...`
- `GET /admin/event?cabangId=...`
- `GET /admin/cabang/:id/rekening`
- `GET /admin/news?cabangId=...`

Mobile cukup pass `state.viewingCabangId` ke semua API call yang affected.

**Note**: untuk M1+ implementation, buat axios interceptor / custom hook `useViewingCabangQuery` yang otomatis append `cabangId` param ke endpoints affected.

### Edge cases

- **Viewing branch tidak ada di daftar (di-delete admin)**: auto-fallback ke home.
- **Empty state** (cabang baru tanpa ibadah/event yet): tampil empty state friendly "Belum ada jadwal di [cabang]".
- **Daftar event di cabang lain**: allowed (banyak gereja Pentecostal Indonesia memang cross-branch participation).
- **Check-in di cabang lain**: allowed (kode jemaat global, BE handle).

---

## ADR-011 — Repository di luar OneDrive

**Status**: Accepted (2026-05-19)

Project source code disimpan di `~/Projects/ecc-mobile-app/` (bukan OneDrive). Alasan:
- OneDrive sync `node_modules` (ribuan file) bikin slow + boros bandwidth
- Build artifacts (`.expo/`, `ios/build/`, `android/build/`) bisa ratusan MB
- Git history konflik dengan OneDrive versioning

Mockup HTML tetap di-sync ke OneDrive untuk sharing dengan tim non-dev. Source code TIDAK.
