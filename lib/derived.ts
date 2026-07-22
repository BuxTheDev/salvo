"use client";
/** Memoized selectors deriving engine output from the session store. */
import { useMemo } from "react";
import { useSalvo } from "./store";
import { autoMap, fileReport } from "./engine/mapper";
import { enrich, normalizeWithMap } from "./engine/normalize";
import { scoreRows, modeStats } from "./engine/score";
import type { Property, ScoredRow } from "./engine/types";

export function useNormalized(): Property[] {
  const raw = useSalvo((s) => s.raw);
  const mapping = useSalvo((s) => s.mapping);
  const enrichRows = useSalvo((s) => s.enrichRows);
  return useMemo(() => {
    let base = normalizeWithMap(raw, mapping);
    if (enrichRows && enrichRows.length)
      base = enrich(base, normalizeWithMap(enrichRows, autoMap(Object.keys(enrichRows[0] || {}))));
    return base;
  }, [raw, mapping, enrichRows]);
}

export function useReport() {
  const mapping = useSalvo((s) => s.mapping);
  return useMemo(() => fileReport(mapping), [mapping]);
}

export function useScored(): ScoredRow[] {
  const norm = useNormalized();
  const settings = useSalvo((s) => s.settings);
  const target = useSalvo((s) => s.target);
  const offer = useSalvo((s) => s.offer);
  return useMemo(() => scoreRows(norm, settings, target, offer), [norm, settings, target, offer]);
}

export function useStats(scored: ScoredRow[]) {
  const offer = useSalvo((s) => s.offer);
  const reachableOnly = useSalvo((s) => s.reachableOnly);
  return useMemo(() => modeStats(scored, offer, reachableOnly), [scored, offer, reachableOnly]);
}
