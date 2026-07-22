import { contactFor, isReachable } from "./contact";
import { underwrite } from "./underwrite";
import type {
  OfferMode,
  Property,
  QualifiedRow,
  Settings,
  Target,
  UnderwriteResult,
} from "./types";

function isFullUnderwrite(
  result: UnderwriteResult | { creative_ok: false; cash_ok: false }
): result is UnderwriteResult {
  return "diff" in result;
}

function isReady(mode: OfferMode, u: UnderwriteResult): boolean {
  if (mode === "creative") return u.creative_ok;
  if (mode === "cash") return u.cash_ok;
  return u.creative_ok || u.cash_ok;
}

function sortKey(mode: OfferMode, u: UnderwriteResult): number {
  if (mode === "cash") return u.net_cash;
  if (mode === "creative") return u.diff;
  const keys: number[] = [];
  if (u.creative_ok) keys.push(u.diff);
  if (u.cash_ok) keys.push(u.net_cash);
  return keys.length ? Math.max(...keys) : 0;
}

export function qualifyProperties(
  properties: Property[],
  settings: Settings,
  target: Target,
  mode: OfferMode
): QualifiedRow[] {
  const rows: QualifiedRow[] = [];

  for (const property of properties) {
    const result = underwrite(property, settings);
    if (!isFullUnderwrite(result)) continue;

    const contact = contactFor(property, target);
    const ready = isReady(mode, result);
    const reachable = isReachable(contact, property.owner_dnc);

    rows.push({
      property,
      underwrite: result,
      contact,
      reachable,
      ready,
      sortKey: sortKey(mode, result),
      dupCount: 1,
    });
  }

  const emailGroups = new Map<string, number>();
  for (const row of rows) {
    if (!row.ready) continue;
    const email = row.contact.email?.toLowerCase().trim();
    if (!email) continue;
    emailGroups.set(email, (emailGroups.get(email) ?? 0) + 1);
  }

  for (const row of rows) {
    const email = row.contact.email?.toLowerCase().trim();
    if (email && emailGroups.has(email)) {
      row.dupCount = emailGroups.get(email) ?? 1;
    }
  }

  return rows.sort((a, b) => b.sortKey - a.sortKey);
}

export function filterReachable(rows: QualifiedRow[], reachableOnly: boolean): QualifiedRow[] {
  if (!reachableOnly) return rows;
  return rows.filter((r) => r.reachable);
}

export function getStats(rows: QualifiedRow[]) {
  const ready = rows.filter((r) => r.ready);
  const reachable = ready.filter((r) => r.reachable);
  const creative = ready.filter((r) => r.underwrite.creative_ok);
  const cash = ready.filter((r) => r.underwrite.cash_ok);
  const dnc = ready.filter(
    (r) => r.property.owner_dnc && !r.contact.viaAgent && !r.contact.email
  );

  return {
    total: rows.length,
    ready: ready.length,
    reachable: reachable.length,
    creative: creative.length,
    cash: cash.length,
    dnc: dnc.length,
  };
}
