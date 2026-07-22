"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import type {
  Mapping,
  OfferMode,
  Property,
  Settings,
  Target,
} from "@/lib/engine";
import { DEFAULT_SETTINGS } from "@/lib/engine";

interface SalvoState {
  properties: Property[];
  filename: string | null;
  mapping: Mapping | null;
  headers: string[];
  settings: Settings;
  target: Target;
  mode: OfferMode;
  reachableOnly: boolean;
  selected: Set<number>;
  setProperties: (p: Property[], filename?: string | null) => void;
  setMapping: (m: Mapping | null) => void;
  setHeaders: (h: string[]) => void;
  setSettings: (s: Settings | ((prev: Settings) => Settings)) => void;
  setTarget: (t: Target) => void;
  setMode: (m: OfferMode) => void;
  setReachableOnly: (v: boolean) => void;
  setSelected: (s: Set<number>) => void;
  clearAll: () => void;
}

const SalvoContext = createContext<SalvoState | null>(null);

export function SalvoProvider({ children }: { children: React.ReactNode }) {
  const [properties, setPropertiesState] = useState<Property[]>([]);
  const [filename, setFilename] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [target, setTarget] = useState<Target>("agent");
  const [mode, setMode] = useState<OfferMode>("creative");
  const [reachableOnly, setReachableOnly] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const value = useMemo<SalvoState>(
    () => ({
      properties,
      filename,
      mapping,
      headers,
      settings,
      target,
      mode,
      reachableOnly,
      selected,
      setProperties: (p, name = null) => {
        setPropertiesState(p);
        if (name !== undefined) setFilename(name);
        setSelected(new Set());
      },
      setMapping,
      setHeaders,
      setSettings,
      setTarget,
      setMode,
      setReachableOnly,
      setSelected,
      clearAll: () => {
        setPropertiesState([]);
        setFilename(null);
        setMapping(null);
        setHeaders([]);
        setSelected(new Set());
      },
    }),
    [
      properties,
      filename,
      mapping,
      headers,
      settings,
      target,
      mode,
      reachableOnly,
      selected,
    ],
  );

  return (
    <SalvoContext.Provider value={value}>{children}</SalvoContext.Provider>
  );
}

export function useSalvo() {
  const ctx = useContext(SalvoContext);
  if (!ctx) throw new Error("useSalvo must be used within SalvoProvider");
  return ctx;
}
