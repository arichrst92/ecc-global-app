# Backend Request: Dev Environment LAN Access untuk Mobile

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-20
**Priority**: 🔴 **HIGH** — blocker untuk mobile QA real device
**Status**: Pending

---

## TL;DR

Mobile dev pakai **Expo Go di HP fisik** untuk testing. Saat ini API local (`http://localhost:4100`) tidak bisa di-reach dari HP karena `localhost` di HP = HP itu sendiri, bukan Mac developer.

Mobile sudah patch sisi-nya: auto-detect IP Mac dari Expo Metro server. Tapi **BE side juga perlu setup**:

1. Listen di `0.0.0.0:4100`, bukan `127.0.0.1:4100`
2. Pastikan macOS firewall allow port 4100
3. (Optional) CORS allow `exp://` + `http://<MAC_IP>:8081` untuk Expo Router web fallback

Tanpa ini, mobile QA di real device **mustahil**. Semua dev hanya bisa pakai iOS Simulator, yang tidak cukup untuk QA fitur kamera (face recognition, QR scan), Bluetooth printer, push notif, dll.

---

## Problem statement

### Setup saat ini

```
[ HP Android, Expo Go ]  ────WiFi────►  [ Mac developer ]
                                          ├── Expo Metro server (:8081)  ← listen 0.0.0.0 ✅
                                          └── ECC Core API (:4100)        ← listen 127.0.0.1 ❌
```

Mobile dev `npm start` → Expo serve Metro bundle ke HP via LAN. HP load JS bundle OK. Tapi saat app coba call API:

```
fetch('http://localhost:4100/auth/cabang')
  ↓
[HP] resolves localhost = 127.0.0.1 (HP itu sendiri)
  ↓
Connection refused — tidak ada server di HP port 4100
```

### Apa yang sudah mobile patch (commit `a1fd641`)

`src/config/env.ts` — auto-extract IP Mac dari Expo Metro `hostUri`:

```typescript
// hostUri dari Expo Constants: "192.168.1.5:8081"
const host = hostUri.replace(/^exp:\/\//, '').split(':')[0];
return `http://${host}:4100`; // mobile pakai IP Mac, bukan localhost
```

Jadi mobile sekarang **cari API di `http://<MAC_LAN_IP>:4100`**. Tapi ini hanya bekerja kalau BE Anda:

1. **Listen di `0.0.0.0`**, bukan `127.0.0.1`
2. **Tidak di-block firewall macOS**

---

## Permintaan ke BE team

### 1. Listen di `0.0.0.0:4100` saat dev

**Cek dulu cara API Anda di-spawn**:

- **Express/Fastify/Nest** — typically `app.listen(PORT, HOST)`. Pastikan `HOST = '0.0.0.0'` (atau jangan pass HOST sama sekali — default-nya `0.0.0.0` di Node).
- **Kalau pakai `host: '127.0.0.1'` atau `host: 'localhost'`** → ganti ke `host: '0.0.0.0'`.

**Verify**:

```bash
# Di Mac BE, harusnya ada baris seperti ini (4-prefix berarti 0.0.0.0, bukan 127.0.0.1):
lsof -i :4100
# COMMAND   PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
# node    12345  ari   20u  IPv4 0x...      0t0   TCP *:4100 (LISTEN)    ← ✅ "*" = 0.0.0.0
# node    12345  ari   20u  IPv4 0x...      0t0   TCP 127.0.0.1:4100 (LISTEN) ← ❌ localhost only
```

### 2. Pastikan macOS firewall allow port 4100

```bash
# Cek status firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# Kalau ON, add Node ke allow-list (sekali aja):
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add $(which node)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp $(which node)
```

Atau bisa juga System Settings → Network → Firewall → matikan sementara saat dev (kalau di network internal yang trusted).

### 3. CORS — allow Expo dev origin (kalau API enforce CORS)

Mobile native fetch **tidak terikat CORS** (CORS hanya browser concern). Tapi kalau Anda juga test via Expo web (`expo start --web`), browser akan kirim Origin header:

```
Origin: http://localhost:8081
Origin: http://<MAC_IP>:8081   ← saat LAN
```

Tambahkan ke CORS allowlist saat env `development`:

```typescript
// Pseudo-code CORS config dev
const allowedOrigins = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,  // LAN
  /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,    // LAN alt
  /^exp:\/\//,                                // Expo dev client (jaga-jaga)
];
```

Untuk **production**, tetap strict — hanya origin `https://eccchurch.global` + apex domain Anda.

---

## Verification checklist

Setelah BE patch, mobile dev bisa verify dengan urutan ini:

### Step 1 — BE Mac dev verify

```bash
# 1. Cek API listen di 0.0.0.0
lsof -i :4100 | grep LISTEN
# Expect: TCP *:4100 (LISTEN)   ← bukan 127.0.0.1:4100

# 2. Cari IP LAN Mac
ipconfig getifaddr en0
# Output: 192.168.1.5 (atau similar)

# 3. Test dari Mac itu sendiri via IP LAN (bukan localhost)
curl -i http://192.168.1.5:4100/auth/cabang
# Expect: HTTP 200 + JSON list cabang
```

### Step 2 — HP Android (di WiFi yang sama dengan Mac)

```bash
# Buka Chrome di HP, ketik di address bar:
http://192.168.1.5:4100/auth/cabang
# Expect: JSON response tampil di browser HP
```

Kalau **Chrome HP** sudah bisa hit API → mobile app Expo Go juga akan bisa (sudah auto-pakai IP yang sama dari Expo hostUri).

### Step 3 — Expo Go full flow

```bash
# Mac
cd ~/Projects/ecc-mobile-app/app
npx expo start --clear
# Scan QR dari HP Expo Go
# Console log mobile harus tampil:
# [env] API base URL: http://192.168.1.5:4100 | platform: android
```

Buka app → tap "Daftar" di Welcome → pilih cabang → kalau cabang list tampil = **API connection success** ✅

---

## Edge cases & FAQ

**Q: Kalau Mac IP berubah (DHCP)?**
A: Mobile auto-detect setiap session dari Metro `hostUri`. No manual config. Tapi pastikan HP + Mac selalu di WiFi yang sama.

**Q: Dev pakai mobile hotspot (tethering)?**
A: Bekerja sama selama Mac connect ke hotspot HP. `ipconfig getifaddr en0` akan return IP dari hotspot range (typically `172.20.x.x`).

**Q: Multiple dev di tim, masing-masing Mac sendiri?**
A: Each dev jalan API local-nya sendiri. Mobile auto-pakai IP Mac dev itu. Zero conflict.

**Q: Production?**
A: Production tetap pakai `https://core-api.eccchurch.global` (sudah di `app.json` `extra.apiBaseUrl`). Auto-detect hanya aktif saat `__DEV__ === true`.

**Q: Kenapa tidak pakai ngrok/Cloudflare Tunnel saja?**
A: Bisa, tapi overhead — perlu setup tunnel setiap dev, latency tambahan, URL berubah-ubah. LAN direct lebih simple untuk dev workflow harian.

**Q: Apakah ini mempengaruhi BE deployment production?**
A: **Tidak.** Production BE Anda sudah di domain public (`core-api.eccchurch.global`), tinggal listen `0.0.0.0` di internal NIC (yang sudah pasti default di K8s/Docker/PaaS apapun). Patch ini purely untuk **local dev workflow**.

---

## Action items untuk BE team

| # | Item | Owner | ETA |
|---|------|-------|-----|
| 1 | Cek `app.listen()` di BE — pastikan host `0.0.0.0` atau dihapus | BE dev | Hari ini |
| 2 | Verify `lsof -i :4100` show `TCP *:4100 (LISTEN)` | BE dev | Setelah #1 |
| 3 | Allow port 4100 di macOS firewall (atau matikan firewall saat dev) | BE dev | Setelah #2 |
| 4 | Test `curl http://<MAC_LAN_IP>:4100/auth/cabang` dari Mac itu sendiri | BE dev | Setelah #3 |
| 5 | Test buka URL sama dari HP Chrome | BE + Mobile dev | Setelah #4 |
| 6 | Add CORS allowlist untuk LAN IP (kalau perlu) | BE dev | Sebelum mobile QA web |
| 7 | Document setup ini di BE README untuk dev baru | BE dev | Setelah verified |

---

## Reference

- Mobile commit: `a1fd641 fix(network): auto-resolve API URL untuk Expo Go real device`
- Mobile env.ts location: `app/src/config/env.ts`
- Mobile app.json `extra`:
  ```json
  {
    "apiBaseUrl": "https://core-api.eccchurch.global",
    "apiPortDev": 4100
  }
  ```
- Expo Constants API: https://docs.expo.dev/versions/latest/sdk/constants/

---

## Kontak

Mobile dev — Ari Christian (`arichrst@ide.asia`)
Sync via WA group atau langsung reply di doc ini.
