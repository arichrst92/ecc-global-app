/**
 * Printer service — abstraksi untuk Bluetooth thermal printer (ESC/POS).
 *
 * **Penting**: implementasi real Bluetooth (`react-native-bluetooth-escpos-printer`
 * atau `react-native-thermal-printer`) **TIDAK kompatibel dengan Expo Go** karena
 * butuh native module. Mobile harus migrate ke **EAS Build (development build)**
 * untuk aktifkan fitur ini. Detail di `docs/eas-build-migration.md`.
 *
 * Saat ini interface ini punya 2 implementasi:
 * - **Stub** (default, jalan di Expo Go) — semua method return mock OK,
 *   tampilkan toast "Requires dev build" di UI saat user trigger print
 * - **Real** (di EAS Build production) — wrap native module
 *
 * Strategy untuk swap implementation:
 * - Pakai feature flag `isNativeAvailable()` — cek kalau native module
 *   ter-load (via try/require). Stub kalau tidak.
 * - UI button print stays visible but informasi clear ke user
 */

export type PrinterDevice = {
  id: string; // MAC address atau UUID
  name: string;
  isPaired?: boolean;
};

export type PaperSize = '58mm' | '80mm';

export type LabelPayload = {
  /** Header line — mis. "ECC Jakarta · Ibadah Minggu" */
  header: string;
  /** Nama jemaat */
  namaLengkap: string;
  /** Kode jemaat 8 char */
  kode: string;
  /** Detail line — mis. "Minggu, 19 Mei 2026 · 08:00" */
  detail?: string;
  /** Status — "JOIN" / "WALK-IN" / "RE-PRINT" */
  status?: string;
};

export interface PrinterService {
  /** Cek apakah Bluetooth printer support tersedia di runtime ini.
   * Return false di Expo Go (stub mode). */
  isNativeAvailable(): boolean;

  /** Request permission Bluetooth + Location (Android needs both for BT scan) */
  requestPermissions(): Promise<boolean>;

  /** Cek koneksi sekarang */
  isConnected(): Promise<boolean>;

  /** Scan paired/nearby Bluetooth devices */
  scanDevices(): Promise<PrinterDevice[]>;

  /** Connect ke device by ID */
  connect(deviceId: string): Promise<void>;

  /** Disconnect */
  disconnect(): Promise<void>;

  /** Print label dengan ESC/POS commands. Throws kalau tidak connected. */
  printLabel(payload: LabelPayload, paperSize: PaperSize): Promise<void>;
}

/**
 * Stub implementation untuk Expo Go.
 * Semua method log + reject dengan UNAVAILABLE error.
 */
class StubPrinterService implements PrinterService {
  isNativeAvailable(): boolean {
    return false;
  }

  async requestPermissions(): Promise<boolean> {
    // eslint-disable-next-line no-console
    console.log('[printer:stub] requestPermissions called');
    return false;
  }

  async isConnected(): Promise<boolean> {
    return false;
  }

  async scanDevices(): Promise<PrinterDevice[]> {
    // eslint-disable-next-line no-console
    console.log('[printer:stub] scanDevices — returning mock devices');
    return [
      { id: '00:11:22:33:44:55', name: 'Thermal Printer 58mm (demo)', isPaired: false },
      { id: '66:77:88:99:AA:BB', name: 'Bluetooth Printer 80mm (demo)', isPaired: true },
    ];
  }

  async connect(deviceId: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('[printer:stub] connect', deviceId);
    throw new PrinterError(
      'UNAVAILABLE',
      'Bluetooth printer butuh production build (EAS Build), tidak support di Expo Go.',
    );
  }

  async disconnect(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('[printer:stub] disconnect');
  }

  async printLabel(payload: LabelPayload, paperSize: PaperSize): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('[printer:stub] printLabel', { paperSize, payload });
    throw new PrinterError(
      'UNAVAILABLE',
      'Print butuh production build (EAS Build), tidak support di Expo Go.',
    );
  }
}

/** Custom error untuk printer operations */
export class PrinterError extends Error {
  code: 'UNAVAILABLE' | 'NOT_CONNECTED' | 'PERMISSION_DENIED' | 'PRINT_FAILED' | 'UNKNOWN';
  constructor(code: PrinterError['code'], message: string) {
    super(message);
    this.name = 'PrinterError';
    this.code = code;
  }
}

/**
 * Singleton printer service.
 * Saat migrate ke EAS Build, swap dengan RealPrinterService di file terpisah
 * dengan dynamic require pattern. Lihat docs/eas-build-migration.md.
 */
export const printerService: PrinterService = new StubPrinterService();
