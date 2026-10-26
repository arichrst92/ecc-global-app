export const LIGHT: Record<string, string>;
export const DARK: Record<string, string>;
export const FAMILIES: string[];
export const VAR_SHADES: number[];
export function cssVars(mode: 'light' | 'dark'): Record<string, string>;
export function hexMap(): Record<string, string>;
