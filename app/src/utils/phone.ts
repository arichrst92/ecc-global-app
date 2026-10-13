/**
 * Utilitas no HP — mendukung semua negara (E.164: `+<kode negara><nomor>`).
 *
 * Nomor lokal tanpa kode negara (08…, 8…) dianggap Indonesia (+62), sama
 * seperti sebelumnya. Validasi lengkap per negara dilakukan backend
 * (libphonenumber-js) — di sini cukup normalisasi + cek panjang dasar.
 */

export interface Country {
  iso: string;
  name: string;
  dial: string; // mis. "+62"
  flag: string;
}

/** Negara yang paling sering dipakai jemaat ECC. Urutan = tampilan picker. */
export const COUNTRIES: Country[] = [
  { iso: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
  { iso: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { iso: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { iso: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { iso: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
  { iso: 'US', name: 'United States / Canada', dial: '+1', flag: '🇺🇸' },
  { iso: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { iso: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { iso: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { iso: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { iso: 'HK', name: 'Hong Kong', dial: '+852', flag: '🇭🇰' },
  { iso: 'TW', name: 'Taiwan', dial: '+886', flag: '🇹🇼' },
  { iso: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { iso: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { iso: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
  { iso: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { iso: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭' },
  { iso: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
  { iso: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]!;

/** Cari negara dari awalan nomor E.164 (kode terpanjang menang, mis. +852 vs +8). */
export function countryFromE164(e164: string): Country | null {
  const matches = COUNTRIES.filter((c) => e164.startsWith(c.dial)).sort(
    (a, b) => b.dial.length - a.dial.length,
  );
  return matches[0] ?? null;
}

/**
 * Normalisasi input → E.164. Return null kalau jelas tidak valid.
 *   "0821…", "821…", "62821…", "+62821…"  → +62821…
 *   "+65 9123 4567", "0065 91234567"       → +6591234567
 *   "+65 09123…" (trunk 0 setelah kode)    → +659123…
 */
export function normalizePhone(input: string): string | null {
  let s = input.trim().replace(/[\s\-().]/g, '');
  if (!s) return null;
  if (s.startsWith('00')) s = '+' + s.slice(2);

  if (s.startsWith('+')) {
    let digits = s.slice(1).replace(/\D/g, '');
    const c = countryFromE164('+' + digits);
    // Buang angka 0 di depan nomor lokal kalau user mengetik "+65 0…" / "+62 0…"
    if (c) {
      const cc = c.dial.slice(1);
      let rest = digits.slice(cc.length).replace(/^0+/, '');
      // Kode negara terketik dobel: pilih +65 lalu ketik "65 9123 4567".
      if (rest.startsWith(cc) && rest.length - cc.length >= 7) rest = rest.slice(cc.length);
      digits = cc + rest;
    }
    if (digits.startsWith('62')) return /^62\d{8,13}$/.test(digits) ? '+' + digits : null;
    return /^[1-9]\d{6,14}$/.test(digits) ? '+' + digits : null;
  }

  // Tanpa kode negara → Indonesia (perilaku lama)
  if (!/^\d+$/.test(s)) return null;
  if (s.startsWith('62')) s = s.slice(2);
  else if (s.startsWith('0')) s = s.slice(1);
  return /^\d{8,13}$/.test(s) ? '+62' + s : null;
}

/**
 * Format E.164 untuk tampilan:
 *   +6282115678446 → +62 821-1567-8446 (format lama Indonesia)
 *   +6591234567    → +65 9123 4567
 */
export function formatPhoneDisplay(e164: string): string {
  if (!e164 || !e164.startsWith('+')) return e164;
  if (e164.startsWith('+62')) {
    const digits = e164.slice(3);
    if (digits.length < 9) return e164;
    return `+62 ${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  const c = countryFromE164(e164);
  if (!c) return e164;
  const rest = e164.slice(c.dial.length);
  if (c.dial === '+1' && rest.length === 10) {
    return `+1 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
  }
  // Kelompok 4 digit (SG/HK: 9123 4567) atau 3 digit (AU/MY: 412 345 678)
  const size = rest.length % 4 === 0 || rest.length % 3 !== 0 ? 4 : 3;
  const groups = rest.match(new RegExp(`\\d{1,${size}}`, 'g')) ?? [rest];
  return `${c.dial} ${groups.join(' ')}`;
}
