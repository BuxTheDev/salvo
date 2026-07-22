"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { FieldMapping, OfferMode, Property, Settings, Target } from "@/lib/engine";
import { DEFAULT_SETTINGS } from "@/lib/engine";

interface SalvoState {
  properties: Property[];
  setProperties: (p: Property[]) => void;
  mappings: FieldMapping[];
  setMappings: (m: FieldMapping[]) => void;
  rawRows: Record<string, string>[];
  setRawRows: (r: Record<string, string>[]) => void;
  headers: string[];
  setHeaders: (h: string[]) => void;
  filename: string;
  setFilename: (f: string) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  target: Target;
  setTarget: (t: Target) => void;
  mode: OfferMode;
  setMode: (m: OfferMode) => void;
  reachableOnly: boolean;
  setReachableOnly: (v: boolean) => void;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  toggleSelected: (address: string) => void;
  selectAllReady: (addresses: string[]) => void;
}

const SalvoContext = createContext<SalvoState | null>(null);

export function SalvoProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [filename, setFilename] = useState("");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [target, setTarget] = useState<Target>("agent");
  const [mode, setMode] = useState<OfferMode>("creative");
  const [reachableOnly, setReachableOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelected = (address: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });
  };

  const selectAllReady = (addresses: string[]) => {
    setSelected(new Set(addresses));
  };

  return (
    <SalvoContext.Provider
      value={{
        properties,
        setProperties,
        mappings,
        setMappings,
        rawRows,
        setRawRows,
        headers,
        setHeaders,
        filename,
        setFilename,
        settings,
        setSettings,
        target,
        setTarget,
        mode,
        setMode,
        reachableOnly,
        setReachableOnly,
        selected,
        setSelected,
        toggleSelected,
        selectAllReady,
      }}
    >
      {children}
    </SalvoContext.Provider>
  );
}

export function useSalvo() {
  const ctx = useContext(SalvoContext);
  if (!ctx) throw new Error("useSalvo must be used within SalvoProvider");
  return ctx;
}
