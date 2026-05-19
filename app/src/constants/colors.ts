/**
 * Brand color tokens — mirror tailwind.config.js
 * Use these dari StyleSheet / non-NativeWind components.
 * Untuk JSX with Tailwind classes, langsung pakai class name (mis. bg-brand-500)
 */

export const colors = {
  brand: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316', // primary
    600: '#EA580C', // hover
    700: '#C2410C', // pressed
    800: '#9A3412',
    900: '#7C2D12',
  },
  accent: {
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
  },
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  semantic: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
} as const;
