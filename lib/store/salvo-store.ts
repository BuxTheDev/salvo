"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SETTINGS, type Offer, type Property, type Settings, type Target } from "@/lib/engine/types";
import type { FileKind } from "@/lib/engine/mapper";
import { enrich } from "@/lib/engine/normalize";

export interface BatchMeta {
  filename: string;
  kind: FileKind;
  rowCount: number;
  importedAt: string;
}

export interface Preset {
  id: string;
  name: string;
  settings: Settings;
  createdAt: string;
}

export interface GhlConnection {
  accessToken: string;
  locationId: string;
  pipelineId?: string;
  stageId?: string;
}

export interface Suppression {
  id: string;
  kind: "email" | "phone";
  value: string;
  reason?: string;
}

interface SalvoState {
  properties: Property[];
  batch: BatchMeta | null;
  settings: Settings;
  target: Target;
  offer: Offer;
  reachableOnly: boolean;
  selectedAddresses: string[];
  presets: Preset[];
  ghlConnection: GhlConnection | null;
  suppressions: Suppression[];

  setProperties: (properties: Property[], batch: BatchMeta) => void;
  mergeEnrichment: (properties: Property[]) => void;
  setSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;
  setTarget: (target: Target) => void;
  setOffer: (offer: Offer) => void;
  setReachableOnly: (v: boolean) => void;
  toggleSelected: (address: string) => void;
  setSelected: (addresses: string[]) => void;
  clearAll: () => void;

  savePreset: (name: string) => void;
  applyPreset: (id: string) => void;
  deletePreset: (id: string) => void;

  setGhlConnection: (conn: GhlConnection | null) => void;
  addSuppression: (kind: Suppression["kind"], value: string, reason?: string) => void;
  removeSuppression: (id: string) => void;
}

export const useSalvoStore = create<SalvoState>()(
  persist(
    (set, get) => ({
      properties: [],
      batch: null,
      settings: DEFAULT_SETTINGS,
      target: "seller",
      offer: "both",
      reachableOnly: false,
      selectedAddresses: [],
      presets: [],
      ghlConnection: null,
      suppressions: [],

      setProperties: (properties, batch) => set({ properties, batch, selectedAddresses: [] }),

      mergeEnrichment: (addRows) => {
        set({ properties: enrich(get().properties, addRows) });
      },

      setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
      setTarget: (target) => set({ target }),
      setOffer: (offer) => set({ offer }),
      setReachableOnly: (reachableOnly) => set({ reachableOnly }),

      toggleSelected: (address) => {
        const current = get().selectedAddresses;
        set({
          selectedAddresses: current.includes(address)
            ? current.filter((a) => a !== address)
            : [...current, address],
        });
      },
      setSelected: (selectedAddresses) => set({ selectedAddresses }),

      clearAll: () => set({ properties: [], batch: null, selectedAddresses: [] }),

      savePreset: (name) => {
        const preset: Preset = { id: crypto.randomUUID(), name, settings: get().settings, createdAt: new Date().toISOString() };
        set({ presets: [...get().presets, preset] });
      },
      applyPreset: (id) => {
        const preset = get().presets.find((p) => p.id === id);
        if (preset) set({ settings: preset.settings });
      },
      deletePreset: (id) => set({ presets: get().presets.filter((p) => p.id !== id) }),

      setGhlConnection: (ghlConnection) => set({ ghlConnection }),
      addSuppression: (kind, value, reason) => {
        const suppression: Suppression = { id: crypto.randomUUID(), kind, value: value.trim().toLowerCase(), reason };
        set({ suppressions: [...get().suppressions, suppression] });
      },
      removeSuppression: (id) => set({ suppressions: get().suppressions.filter((s) => s.id !== id) }),
    }),
    { name: "salvo-store" },
  ),
);
