"use client";
/**
 * Client-side session state shared by /import and /offers.
 * Persistence to Supabase (`import_batches` + `properties`) is Phase 2b —
 * this store is deliberately the only stateful seam in front of the pure engine.
 */
import { create } from "zustand";
import { autoMap } from "./engine/mapper";
import { DEFAULT_SETTINGS, type Settings } from "./engine/underwrite";
import type { Mapping, Offer, RawRow, Target } from "./engine/types";
import { SEED } from "./seed";

interface SalvoState {
  raw: RawRow[];
  headers: string[];
  mapping: Mapping;
  fileName: string | null;
  enrichRows: RawRow[] | null;
  enrichName: string | null;

  target: Target;
  offer: Offer;
  reachableOnly: boolean;
  settings: Settings;
  sel: Set<string>;
  note: string | null;

  loadFile: (rows: RawRow[], name: string) => void;
  setMap: (field: string, header: string | null) => void;
  loadEnrich: (rows: RawRow[], name: string) => void;
  setTarget: (t: Target) => void;
  setOffer: (o: Offer) => void;
  setReachableOnly: (v: boolean) => void;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  toggleSel: (addr: string) => void;
  setSel: (addrs: string[]) => void;
  setNote: (n: string | null) => void;
}

export const useSalvo = create<SalvoState>((set) => ({
  raw: SEED,
  headers: Object.keys(SEED[0]),
  mapping: autoMap(Object.keys(SEED[0])),
  fileName: null,
  enrichRows: null,
  enrichName: null,

  target: "agent",
  offer: "creative",
  reachableOnly: false,
  settings: DEFAULT_SETTINGS,
  sel: new Set<string>(),
  note: null,

  loadFile: (rows, name) => {
    const headers = Object.keys(rows[0] || {});
    set({ raw: rows, headers, mapping: autoMap(headers), fileName: name, sel: new Set(), note: null });
  },
  setMap: (field, header) =>
    set((s) => {
      const mapping: Mapping = { ...s.mapping };
      if (!header) delete mapping[field];
      else mapping[field] = { header, how: "manual" };
      return { mapping };
    }),
  loadEnrich: (rows, name) => set({ enrichRows: rows, enrichName: name }),
  setTarget: (target) => set({ target }),
  setOffer: (offer) => set({ offer, sel: new Set() }),
  setReachableOnly: (reachableOnly) => set({ reachableOnly }),
  setSetting: (k, v) => set((s) => ({ settings: { ...s.settings, [k]: v } })),
  toggleSel: (addr) =>
    set((s) => {
      const sel = new Set(s.sel);
      if (sel.has(addr)) sel.delete(addr);
      else sel.add(addr);
      return { sel };
    }),
  setSel: (addrs) => set({ sel: new Set(addrs) }),
  setNote: (note) => set({ note }),
}));
