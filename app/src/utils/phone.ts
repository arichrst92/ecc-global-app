/**
 * Normalize Indonesian phone number to E.164 (+62...).
 * Accepts: "0821...", "62821...", "+62821...", "821..."
 * Returns null if format is invalid.
 */
export function normalizePhone(input: string): string | null {
  const s = input.trim().replace(/[\s\-().]/g, '');
  if (!s) return null;
  if (s.startsWith('+62')) return s;
  if (s.startsWith('62')) return '+' + s;
  if (s.startsWith('0')) return '+62' + s.slice(1);
  if (s.startsWith('8')) return '+62' + s;
  return null;
}

/**
 * Format E.164 to display style: +62 821-1567-8446
 */
export function formatPhoneDisplay(e164: string): string {
  if (!e164.startsWith('+62')) return e164;
  const digits = e164.slice(3);
  if (digits.length < 9) return e164;
  return `+62 ${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
