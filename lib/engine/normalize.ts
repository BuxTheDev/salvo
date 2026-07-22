/** Normalize mapped CSV rows into `Property[]`, plus skip-trace enrichment (spec §5.3). */
import { keyOf, num } from "./format";
import type { Mapping, Property, RawRow } from "./types";

const str = (v: unknown): string | undefined =>
  v == null || v === "" ? undefined : String(v);

/** NaN → undefined so the engine can use `== null` checks per the spec. */
const orUndef = (n: number): number | undefined => (isNaN(n) ? undefined : n);

/**
 * PropStream inline skip-trace: `Phone 1..5` + type + DNC columns.
 * Prefer the first mobile non-DNC number, then any non-DNC, then Phone 1
 * flagged DNC.
 */
export function pickPhone(r: RawRow): { cell?: string; dnc: boolean } {
  let best: string | undefined;
  for (let i = 1; i <= 5; i++) {
    const nu = str(r[`Phone ${i}`]);
    if (!nu) continue;
    const t = String(r[`Phone ${i} Type`] || "").toLowerCase();
    const dnc = ["true", "yes", "1", "y"].includes(String(r[`Phone ${i} DNC`] || "").trim().toLowerCase());
    if ((t.includes("mobile") || t.includes("wireless") || t.includes("cell")) && !dnc)
      return { cell: nu, dnc: false };
    if (best == null && !dnc) best = nu;
  }
  if (best != null) return { cell: best, dnc: false };
  const p1 = str(r["Phone 1"]);
  return { cell: p1, dnc: !!p1 };
}

/** Apply a header mapping to raw rows → normalized properties. Drops rows without an address. */
export function normalizeWithMap(rows: RawRow[], map: Mapping): Property[] {
  if (!rows || !rows.length) return [];
  const g = (r: RawRow, f: string) => (map[f] ? str(r[map[f]!.header]) : undefined);
  const gn = (r: RawRow, f: string) => orUndef(num(map[f] ? r[map[f]!.header] : undefined));
  const phoneBlock = rows[0] && "Phone 1" in rows[0] && "Phone 1 DNC" in rows[0];
  return rows
    .map((r) => {
      const o: Partial<Property> = {
        address: g(r, "address"),
        city: g(r, "city"),
        state: g(r, "state"),
        zip: g(r, "zip"),
        owner_first: g(r, "owner_first"),
        owner_last: g(r, "owner_last"),
        home_value: gn(r, "home_value"),
        loan_balance: gn(r, "loan_balance"),
        equity: gn(r, "equity"),
        monthly_rent: gn(r, "monthly_rent"),
        loan_payment: gn(r, "loan_payment"),
        asking: gn(r, "asking"),
        agent_name: g(r, "agent_name"),
        agent_email: g(r, "agent_email"),
        agent_phone: g(r, "agent_phone"),
        owner_email: g(r, "owner_email"),
      };
      if (phoneBlock) {
        const p = pickPhone(r);
        o.owner_cell = p.cell;
        o.owner_dnc = p.dnc;
      } else {
        o.owner_cell = g(r, "owner_cell");
        o.owner_dnc = false;
      }
      const fn = (o.owner_first || "").trim();
      const ln = (o.owner_last || "").trim();
      o.owner_full = g(r, "owner_full") || `${fn} ${ln}`.trim() || undefined;
      return o as Property;
    })
    .filter((o) => o.address);
}

/**
 * Join skip-trace contact info onto base rows by normalized address key.
 * Only fills blanks; never overwrites existing contact.
 */
export function enrich(base: Property[], add: Property[]): Property[] {
  if (!add || !add.length) return base;
  const lut = new Map<string, Property>();
  add.forEach((a) => {
    const k = keyOf(a.address);
    if (k && !lut.has(k)) lut.set(k, a);
  });
  return base.map((b) => {
    const hit = lut.get(keyOf(b.address));
    if (!hit) return b;
    return {
      ...b,
      owner_cell: b.owner_cell || hit.owner_cell,
      owner_email: b.owner_email || hit.owner_email,
      owner_dnc: b.owner_cell ? b.owner_dnc : hit.owner_dnc,
    };
  });
}
