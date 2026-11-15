/**
 * Ikon Els App untuk empty state (daftar kosong) — menggantikan ikon
 * generik per halaman supaya tampilan kosong konsisten dengan identitas app.
 */
import { Image } from 'react-native';

const ICON = require('../../../assets/images/els-empty.png');

export function ElsEmptyIcon({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <Image
      source={ICON}
      className={className}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.24), opacity: 0.92 }}
      accessibilityIgnoresInvertColors
      accessible={false}
    />
  );
}
