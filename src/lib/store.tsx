"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Classification, FieldMapping } from "@/lib/engine/mapper";
import { DEFAULT_SETTINGS, type Property, type Settings } from "@/lib/engine/types";

export interface BatchMeta {
  filename: string;
  rowCount: number;
  kind: Classification["kind"];
}

interface StoreState {
  properties: Property[];
  batch: BatchMeta | null;
  mapping: FieldMapping | null;
  settings: Settings;
  setProperties: (p: Property[], batch: BatchMeta, mapping: FieldMapping) => void;
  setSettings: (s: Settings) => void;
  clear: () => void;
}

const StoreContext = createContext<StoreState | null>(null);

const KEY = "salvo:store:v1";

interface Persisted {
  properties: Property[];
  batch: BatchMeta | null;
  mapping: FieldMapping | null;
  settings: Settings;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [properties, setProps] = useState<Property[]>([]);
  const [batch, setBatch] = useState<BatchMeta | null>(null);
  const [mapping, setMapping] = useState<FieldMapping | null>(null);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from
     sessionStorage, an external store that is unavailable during SSR. */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const restored = JSON.parse(raw) as Persisted;
        setProps(restored.properties ?? []);
        setBatch(restored.batch ?? null);
        setMapping(restored.mapping ?? null);
        setSettingsState({ ...DEFAULT_SETTINGS, ...(restored.settings ?? {}) });
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    try {
      const p: Persisted = { properties, batch, mapping, settings };
      sessionStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      // storage quota / disabled — non-fatal
    }
  }, [properties, batch, mapping, settings, hydrated]);

  const value = useMemo<StoreState>(
    () => ({
      properties,
      batch,
      mapping,
      settings,
      setProperties: (p, b, m) => {
        setProps(p);
        setBatch(b);
        setMapping(m);
      },
      setSettings: setSettingsState,
      clear: () => {
        setProps([]);
        setBatch(null);
        setMapping(null);
      },
    }),
    [properties, batch, mapping, settings],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreState {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
