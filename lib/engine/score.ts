/** Mode routing: readiness, sort key, contactability, duplicate-contact flags (spec §6). */
import { keyOf, mean } from "./format";
import { contactFor, underwrite, type Settings } from "./underwrite";
import type { Offer, Property, ScoredRow, Target } from "./types";

/** Underwrite + score every row for a Target × Offer mode; sorted ready-first, best-first. */
export function scoreRows(
  norm: Property[],
  s: Settings,
  target: Target,
  offer: Offer,
): ScoredRow[] {
  const rows: ScoredRow[] = norm.map((r) => {
    const u = underwrite(r, s);
    const creativeOK = u.creative_ok, cashOK = u.cash_ok;
    const ready =
      offer === "creative" ? creativeOK : offer === "cash" ? cashOK : creativeOK || cashOK;
    const contact = contactFor(r, target);
    const sortVal =
      offer === "cash"
        ? u.net_cash || 0
        : offer === "creative"
          ? u.diff || 0
          : Math.max(creativeOK ? u.diff ?? -1e9 : -1e9, cashOK ? u.net_cash ?? -1e9 : -1e9);
    return { r, u, creativeOK, cashOK, ready, contact, sortVal, dup: 1 };
  });

  // duplicate-contact flags: group ready rows by contact email
  const counts = new Map<string, number>();
  rows.forEach((x) => {
    if (x.ready && x.contact.email) {
      const k = keyOf(x.contact.email);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  });
  rows.forEach((x) => {
    x.dup = x.contact.email ? counts.get(keyOf(x.contact.email)) || 1 : 1;
  });

  return rows.sort((a, b) => Number(b.ready) - Number(a.ready) || b.sortVal - a.sortVal);
}

/** reachable = email, or phone that isn't a DNC owner number (spec §6). */
export const isReachable = (x: Pick<ScoredRow, "r" | "contact">): boolean =>
  !!(x.contact.email || (x.contact.phone && !(x.r.owner_dnc && !x.contact.viaAgent)));

/** DNC badge: resolved contact is a DNC owner phone with no email fallback. */
export const isDncFlagged = (x: Pick<ScoredRow, "r" | "contact">): boolean =>
  !x.contact.viaAgent && !!x.r.owner_dnc && !x.contact.email;

export interface ModeStats {
  scanned: number;
  ready: number;
  reachable: number;
  dupContacts: number;
  avg: number;
}

export function modeStats(scored: ScoredRow[], offer: Offer, reachableOnly: boolean): ModeStats {
  const ready = scored.filter((x) => x.ready && (!reachableOnly || isReachable(x)));
  const reachable = scored.filter((x) => x.ready && isReachable(x)).length;
  const dupContacts = new Set(
    scored.filter((x) => x.ready && x.dup > 1 && x.contact.email).map((x) => keyOf(x.contact.email)),
  ).size;
  const avg =
    offer === "cash"
      ? mean(ready.map((x) => x.u.net_cash ?? 0))
      : offer === "creative"
        ? mean(ready.map((x) => x.u.diff ?? 0))
        : mean(ready.map((x) => (x.creativeOK ? x.u.diff ?? 0 : x.u.net_cash ?? 0)));
  return { scanned: scored.length, ready: ready.length, reachable, dupContacts, avg };
}
