import { create } from 'zustand';
import { storage } from '@/utils/storage';
import type { PaperSize, PrinterDevice } from '@/services/printer';

/**
 * Printer connection state — persistent.
 * Saat user re-launch app, last connected device akan auto-reconnect attempt
 * (kalau printer masih on + dalam range).
 */

const KEY = 'ecc.printer.v1';

type Prefs = {
  lastDevice: PrinterDevice | null;
  paperSize: PaperSize;
  autoPrint: boolean;
};

const DEFAULTS: Prefs = {
  lastDevice: null,
  paperSize: '58mm',
  autoPrint: false,
};

type State = Prefs & {
  isHydrated: boolean;
  isConnected: boolean;

  hydrate: () => Promise<void>;
  setLastDevice: (d: PrinterDevice | null) => Promise<void>;
  setPaperSize: (s: PaperSize) => Promise<void>;
  setAutoPrint: (v: boolean) => Promise<void>;
  setConnected: (c: boolean) => void;
};

async function persist(prefs: Prefs) {
  try {
    await storage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export const usePrinterStore = create<State>((set, get) => ({
  ...DEFAULTS,
  isHydrated: false,
  isConnected: false,

  hydrate: async () => {
    try {
      const raw = await storage.getItem(KEY);
      if (raw) {
        const parsed = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
        set({ ...parsed, isHydrated: true });
        return;
      }
    } catch {
      // ignore
    }
    set({ isHydrated: true });
  },

  setLastDevice: async (d) => {
    set({ lastDevice: d });
    await persist({
      lastDevice: d,
      paperSize: get().paperSize,
      autoPrint: get().autoPrint,
    });
  },

  setPaperSize: async (s) => {
    set({ paperSize: s });
    await persist({
      lastDevice: get().lastDevice,
      paperSize: s,
      autoPrint: get().autoPrint,
    });
  },

  setAutoPrint: async (v) => {
    set({ autoPrint: v });
    await persist({
      lastDevice: get().lastDevice,
      paperSize: get().paperSize,
      autoPrint: v,
    });
  },

  setConnected: (c) => set({ isConnected: c }),
}));
