import { contactFor, isDncContact, isReachable } from "./contact";
import { underwrite } from "./underwrite";
import type {
  OfferMode,
  Property,
  QualifiedRow,
  Settings,
  Target,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";

export function isReady(
  uw: { creative_ok: boolean; cash_ok: boolean },
  mode: OfferMode,
): boolean {
  if (mode === "creative") return uw.creative_ok;
  if (mode === "cash") return uw.cash_ok;
  return uw.creative_ok || uw.cash_ok;
}

export function sortKeyFor(
  uw: {
    creative_ok: boolean;
    cash_ok: boolean;
    diff?: number;
    net_cash?: number;
  },
  mode: OfferMode,
): number {
  if (mode === "cash") return uw.net_cash ?? Number.NEGATIVE_INFINITY;
  if (mode === "creative") return uw.diff ?? Number.NEGATIVE_INFINITY;
  const a = uw.creative_ok ? (uw.diff ?? Number.NEGATIVE_INFINITY) : Number.NEGATIVE_INFINITY;
  const b = uw.cash_ok ? (uw.net_cash ?? Number.NEGATIVE_INFINITY) : Number.NEGATIVE_INFINITY;
  return Math.max(a, b);
}

export function offerLabels(
  uw: { creative_ok: boolean; cash_ok: boolean },
  mode: OfferMode,
): ("CR" | "CA")[] {
  const labels: ("CR" | "CA")[] = [];
  if (mode !== "cash" && uw.creative_ok) labels.push("CR");
  if (mode !== "creative" && uw.cash_ok) labels.push("CA");
  return labels;
}

export function qualifyProperties(
  properties: Property[],
  opts: {
    target: Target;
    mode: OfferMode;
    settings?: Settings;
    reachableOnly?: boolean;
  },
): QualifiedRow[] {
  const settings = opts.settings ?? DEFAULT_SETTINGS;
  const rows: QualifiedRow[] = [];

  for (const property of properties) {
    const uw = underwrite(property, settings);
    const contact = contactFor(property, opts.target);
    const ready = isReady(uw, opts.mode);
    const dnc = isDncContact(contact, property.owner_dnc);
    const reachable = isReachable(contact, property.owner_dnc);

    rows.push({
      property,
      underwrite: uw,
      contact,
      ready,
      reachable,
      dnc,
      sortKey: sortKeyFor(uw, opts.mode),
      listingsForContact: 1,
      offerLabels: offerLabels(uw, opts.mode),
    });
  }

  // Duplicate contact grouping by email among ready rows
  const emailCounts = new Map<string, number>();
  for (const r of rows) {
    if (!r.ready || !r.contact.email) continue;
    const k = r.contact.email.toLowerCase();
    emailCounts.set(k, (emailCounts.get(k) ?? 0) + 1);
  }
  for (const r of rows) {
    if (!r.contact.email) continue;
    const n = emailCounts.get(r.contact.email.toLowerCase()) ?? 1;
    r.listingsForContact = n;
  }

  let filtered = rows.filter((r) => r.ready);
  if (opts.reachableOnly) filtered = filtered.filter((r) => r.reachable);

  filtered.sort((a, b) => b.sortKey - a.sortKey);
  return filtered;
}

export function statsFor(
  all: Property[],
  qualified: QualifiedRow[],
  mode: OfferMode,
  settings: Settings = DEFAULT_SETTINGS,
) {
  let creative = 0;
  let cash = 0;
  let reachable = 0;
  let dnc = 0;
  for (const p of all) {
    const uw = underwrite(p, settings);
    if (uw.creative_ok) creative++;
    if (uw.cash_ok) cash++;
  }
  for (const q of qualified) {
    if (q.reachable) reachable++;
    if (q.dnc) dnc++;
  }
  return {
    total: all.length,
    ready: qualified.length,
    creative,
    cash,
    reachable,
    dnc,
    mode,
  };
}
