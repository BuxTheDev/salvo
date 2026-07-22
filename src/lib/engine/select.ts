import type { Contact, Offer, Property, Settings, Target, Underwriting } from "./types";
import { contactFor, underwrite } from "./underwrite";

export interface RowResult {
  property: Property;
  uw: Underwriting;
  contact: Contact;
  ready: boolean;
  sortKey: number;
  reachable: boolean;
  dnc: boolean; // resolved contact is a DNC owner phone with no email fallback
  dupCount: number; // # of ready rows sharing this contact email
}

/** Ready per row (§6): creative → creative_ok; cash → cash_ok; both → either. */
export function isReady(uw: Underwriting, offer: Offer): boolean {
  if (offer === "creative") return uw.creative_ok;
  if (offer === "cash") return uw.cash_ok;
  return uw.creative_ok || uw.cash_ok;
}

/** Sort key (§6): cash → net_cash; creative → diff; both → max of the applicable. */
export function sortKeyFor(uw: Underwriting, offer: Offer): number {
  if (offer === "cash") return uw.net_cash ?? -Infinity;
  if (offer === "creative") return uw.diff ?? -Infinity;
  const c = uw.creative_ok ? uw.diff ?? -Infinity : -Infinity;
  const k = uw.cash_ok ? uw.net_cash ?? -Infinity : -Infinity;
  return Math.max(c, k);
}

/** reachable = !!email || (!!phone && !(owner_dnc && !viaAgent)) */
export function isReachable(contact: Contact, ownerDnc: boolean): boolean {
  const hasEmail = !!contact.email;
  const phoneOk = !!contact.phone && !(ownerDnc && !contact.viaAgent);
  return hasEmail || phoneOk;
}

/**
 * Evaluate a full list for a given Target × Offer selection. Produces per-row
 * underwriting, contact resolution, readiness, contactability, DNC + duplicate
 * flags, and returns rows sorted by the mode's sort key (descending).
 */
export function evaluate(
  properties: Property[],
  settings: Settings,
  target: Target,
  offer: Offer,
): RowResult[] {
  const rows: RowResult[] = properties.map((property) => {
    const uw = underwrite(property, settings);
    const contact = contactFor(property, target);
    const ready = isReady(uw, offer);
    const ownerDnc = !!property.owner_dnc;
    const reachable = isReachable(contact, ownerDnc);
    const dnc = !!contact.phone && ownerDnc && !contact.viaAgent && !contact.email;
    return {
      property,
      uw,
      contact,
      ready,
      sortKey: sortKeyFor(uw, offer),
      reachable,
      dnc,
      dupCount: 1,
    };
  });

  // Duplicate contact: group READY rows by contact email; badge each ×N.
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.ready) continue;
    const key = (r.contact.email ?? "").toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const r of rows) {
    const key = (r.contact.email ?? "").toLowerCase();
    if (key && counts.has(key)) r.dupCount = counts.get(key)!;
  }

  return rows.sort((a, b) => b.sortKey - a.sortKey);
}
