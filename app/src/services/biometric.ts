/**
 * Biometric authentication service.
 *
 * Pakai expo-local-authentication untuk Face ID (iOS) / Fingerprint /
 * Face Unlock (Android). Sebagai gate sebelum app open ketika user sudah
 * opt-in. Tokens tetap di SecureStore — biometric cuma sebagai authorization
 * step, bukan storage encryption.
 *
 * Web fallback: tidak available (LocalAuthentication tidak support web).
 */
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricType = 'face' | 'fingerprint' | 'iris' | 'unknown';

export type BiometricSupport = {
  /** Hardware tersedia (sensor ada di device) */
  hasHardware: boolean;
  /** User sudah enroll biometric di OS settings */
  isEnrolled: boolean;
  /** Bisa pakai biometric (hasHardware && isEnrolled) */
  isAvailable: boolean;
  /** Tipe biometric primary di device */
  primaryType: BiometricType;
  /** Label untuk UI: "Face ID", "Sidik Jari", "Biometric" */
  label: string;
};

const NOT_SUPPORTED: BiometricSupport = {
  hasHardware: false,
  isEnrolled: false,
  isAvailable: false,
  primaryType: 'unknown',
  label: 'Biometric',
};

/**
 * Check biometric availability di device.
 * Returns NOT_SUPPORTED di web atau ketika OS tidak mendukung.
 */
export async function getBiometricSupport(): Promise<BiometricSupport> {
  if (Platform.OS === 'web') return NOT_SUPPORTED;

  try {
    const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    let primaryType: BiometricType = 'unknown';
    let label = 'Biometric';

    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      primaryType = 'face';
      label = Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      primaryType = 'fingerprint';
      label = Platform.OS === 'ios' ? 'Touch ID' : 'Sidik Jari';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      primaryType = 'iris';
      label = 'Iris';
    }

    return {
      hasHardware,
      isEnrolled,
      isAvailable: hasHardware && isEnrolled,
      primaryType,
      label,
    };
  } catch {
    return NOT_SUPPORTED;
  }
}

export type AuthResult =
  | { success: true }
  | { success: false; reason: 'cancel' | 'fallback' | 'lockout' | 'no_hardware' | 'no_enrolled' | 'error'; message?: string };

/**
 * Trigger biometric authentication prompt.
 * @param promptMessage — message di dialog (mis. "Buka ECC App")
 */
export async function authenticate(promptMessage: string): Promise<AuthResult> {
  if (Platform.OS === 'web') {
    return { success: false, reason: 'no_hardware', message: 'Web tidak mendukung biometric' };
  }

  try {
    const support = await getBiometricSupport();
    if (!support.hasHardware) {
      return { success: false, reason: 'no_hardware' };
    }
    if (!support.isEnrolled) {
      return { success: false, reason: 'no_enrolled' };
    }

    const res = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Batal',
      disableDeviceFallback: false, // allow PIN/passcode fallback
    });

    if (res.success) {
      return { success: true };
    }

    // Map expo-local-authentication error codes to our reason types
    const errCode = (res as { error?: string }).error;
    if (errCode === 'user_cancel' || errCode === 'system_cancel' || errCode === 'app_cancel') {
      return { success: false, reason: 'cancel' };
    }
    if (errCode === 'user_fallback') {
      return { success: false, reason: 'fallback' };
    }
    if (errCode === 'lockout' || errCode === 'lockout_permanent') {
      return { success: false, reason: 'lockout' };
    }
    return { success: false, reason: 'error', message: errCode };
  } catch (e) {
    return {
      success: false,
      reason: 'error',
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
