/** @type {import('tailwindcss').Config} */
// Dark mode: warna netral, `card`, dan shade tint (50/100/200) + teks (700/800/900)
// tiap keluarga warna memakai CSS variable — nilainya diganti per mode oleh
// src/theme/ThemeRoot.tsx (vars()). Kelas lama (bg-white→bg-card, text-neutral-900,
// bg-amber-50, dst.) otomatis ikut mode tanpa perlu `dark:` di tiap elemen.
const palette = require('./theme/palette');
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const themed = {
  card: v('card'),
  neutral: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k) => [k, v(`neutral-${k}`)])),
};
for (const f of palette.FAMILIES) {
  themed[f] = Object.fromEntries(palette.VAR_SHADES.map((k) => [k, v(`${f}-${k}`)]));
}

function mergeColors(base) {
  const out = { ...base };
  for (const [k, val] of Object.entries(themed)) {
    out[k] = typeof val === 'string' ? val : { ...(base[k] || {}), ...val };
  }
  return out;
}

module.exports = {
  // NOTE: Update content path when adding folders that use Tailwind classes
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: mergeColors({
        // ECC brand palette — sesuai portal web tailwind.config.ts
        brand: {
          50:  '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        accent: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
      }),
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
