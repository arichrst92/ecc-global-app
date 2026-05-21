# EAS Build Migration — Production Build untuk Native Features

**Untuk**: Mobile dev (Ari Christian)
**Status**: Planning — required sebelum launch fitur native (Bluetooth printer)

---

## Kenapa butuh migrasi dari Expo Go?

Expo Go adalah "client app" universal yang load JS bundle dari Metro server. Cuma support native modules yang **pre-bundled di Expo Go itu sendiri**. Native module pihak ketiga (Bluetooth, FCM, custom NFC, dll) **tidak bisa jalan di Expo Go**.

Sekarang (M8) butuh:
- **Bluetooth thermal printer** (`react-native-bluetooth-escpos-printer` atau `react-native-thermal-printer`) — full native module, perlu Android Bluetooth permission + iOS Bluetooth-Peripheral capability.

Yang akan butuh nanti:
- **Push notification** (`expo-notifications` sebenarnya support Expo Go untuk basic, tapi untuk advanced features + FCM custom payload butuh dev build)
- **Background tasks** (mis. offline queue retry untuk scanner)
- **NFC / mDNS / Bluetooth LE** untuk fitur masa depan

---

## EAS Build (Expo Application Services) — solusi

EAS Build = cloud-based build service Expo yang generate **custom app binary** dengan native modules pilihan kita. Hasilnya **APK/AAB Android** dan **IPA iOS** yang bisa di-install + jalan persis seperti app dari Play Store / TestFlight.

Dua tier yang relevan:

### 1. Development Build (dev workflow)
- Build sekali, install di HP volunteer/dev
- **JS bundle masih reload via Expo CLI** (`expo start`) seperti Expo Go
- Native module **sudah ter-bundle** — bisa pakai Bluetooth, FCM, dll
- Build ulang **hanya kalau** tambah/upgrade native module
- Free di Expo plan free (limited build per month)

### 2. Production Build
- Build final untuk Play Store / TestFlight / internal distribution
- JS + native + assets semua di-bundle
- Tidak load dari Expo CLI

---

## Setup steps

### Step 1 — Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### Step 2 — Configure project

Di repo root:

```bash
cd app/
eas init
```

Ini generate `eas.json` di `app/`. Template default biasanya:

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {}
  }
}
```

### Step 3 — Install printer library

```bash
cd app/
npm install react-native-thermal-printer
# atau:
npm install react-native-bluetooth-escpos-printer
```

Library kedua lebih lengkap untuk ESC/POS spec (BLE + Classic), tapi setup lebih ribet. Library pertama lebih modern + actively maintained, support BLE saja.

### Step 4 — Update permissions di `app.json`

Tambahkan ke `app.json`:

```json
{
  "expo": {
    "android": {
      "permissions": [
        "BLUETOOTH",
        "BLUETOOTH_ADMIN",
        "BLUETOOTH_CONNECT",
        "BLUETOOTH_SCAN",
        "ACCESS_FINE_LOCATION"
      ]
    },
    "ios": {
      "infoPlist": {
        "NSBluetoothAlwaysUsageDescription": "ECC Global App butuh akses Bluetooth untuk hubungkan ke printer label.",
        "NSBluetoothPeripheralUsageDescription": "ECC Global App butuh akses Bluetooth untuk hubungkan ke printer label."
      }
    }
  }
}
```

### Step 5 — Implement real PrinterService

Buat `app/src/services/printer.native.ts` (atau patch existing `printer.ts`) yang wrap library yang dipakai:

```typescript
// printer.native.ts
import BluetoothEscposPrinter, {
  BluetoothManager,
} from 'react-native-bluetooth-escpos-printer';
import type { PrinterService, PrinterDevice, LabelPayload, PaperSize } from './printer';
import { buildLabelCommands } from './label-builder';

class RealPrinterService implements PrinterService {
  isNativeAvailable() { return true; }

  async requestPermissions() {
    // Android: BluetoothManager.requestPermissionsAsync()
    // iOS: handled via Info.plist
    return true;
  }

  async scanDevices(): Promise<PrinterDevice[]> {
    const paired = await BluetoothManager.getBondedDevices();
    return paired.map((d) => ({ id: d.address, name: d.name, isPaired: true }));
  }

  async connect(deviceId: string) {
    await BluetoothManager.connect(deviceId);
  }

  async disconnect() {
    await BluetoothManager.disableBluetooth();
  }

  async isConnected() {
    return await BluetoothManager.isDeviceConnected();
  }

  async printLabel(payload: LabelPayload, paperSize: PaperSize) {
    const cmds = buildLabelCommands(payload, paperSize);
    // Send raw bytes
    await BluetoothEscposPrinter.printRaw(Buffer.from(cmds).toString('base64'));
  }
}

export const printerService = new RealPrinterService();
```

Lalu di `printer.ts` ganti import path conditional:

```typescript
// Pakai dynamic require supaya stub jalan kalau native belum ter-bundle
let realImpl: PrinterService | null = null;
try {
  realImpl = require('./printer.native').printerService;
} catch {
  // Native module belum di-bundle (Expo Go) — fall back ke stub
}
export const printerService: PrinterService = realImpl ?? new StubPrinterService();
```

### Step 6 — Build development client

```bash
cd app/
eas build --profile development --platform android
# atau --platform ios (butuh Apple Developer account $99/yr)
```

Build di-process di Expo cloud (~10-15 menit). Hasilnya **APK** yang bisa download + install ke HP test.

### Step 7 — Jalan dev server seperti biasa

```bash
cd app/
npx expo start --dev-client
```

Scan QR di **dev client app** (bukan Expo Go). Bluetooth printer otomatis jalan.

---

## Build production untuk launch

```bash
eas build --profile production --platform all
```

Hasil:
- **Android AAB** → upload ke Google Play Console
- **iOS IPA** → upload ke App Store Connect via Transporter

Setup credentials:
```bash
eas credentials  # interactive setup signing keys
```

---

## Cost estimate

Expo Plan (https://expo.dev/pricing):

| Plan | Builds/month | Price |
|---|---|---|
| Free | 30 builds | $0 |
| Production | 100 builds | $19/month |
| Enterprise | Unlimited | Custom |

Untuk dev workflow (build dev client sekali, JS reload via CLI), free plan biasanya cukup. Production builds untuk release Play Store / App Store akan butuh paid plan kalau frequent.

---

## Checklist sebelum migrate

- [ ] Test EAS CLI install + login: `eas whoami`
- [ ] `eas init` di `app/` folder
- [ ] Choose printer library + install + add permissions
- [ ] Implement real `printer.native.ts` + conditional import di `printer.ts`
- [ ] First dev build: `eas build --profile development --platform android`
- [ ] Install APK di HP volunteer + test Bluetooth print
- [ ] Update dev workflow docs (team perlu pakai dev client, bukan Expo Go)
- [ ] Production build + Play Store / App Store submission setup

---

## Alternative: tanpa Bluetooth printer

Kalau Bluetooth printer ditunda, alternative:

1. **PDF generate + share** — `expo-print` generate label PDF, user share ke WhatsApp/print via apps printer iPhone/Android. UX kurang flow tapi support di Expo Go.
2. **AirPrint / IPP printing** — `expo-print` support print langsung via AirPrint (iOS) atau Android Print Framework. Tidak butuh Bluetooth, tapi user perlu printer WiFi/USB.
3. **WiFi thermal printer** — beberapa thermal printer support TCP/IP. Bisa pakai `net` socket dari React Native, jalan di Expo Go.

Untuk gereja yang sudah punya printer thermal Bluetooth (umum di Indonesia ~Rp 300k-1jt), opsi pure-RN library + EAS Build adalah yang paling natural.

---

## Kontak

Mobile dev — Ari Christian (`arichrst@ide.asia`)
