import type { FieldMapping } from "./mapper";
import type { FieldKey, Property } from "./types";

export type Row = Record<string, string>;

function parseNum(v: string | undefined): number | undefined {
  if (v == null) return undefined;
  const cleaned = String(v).replace(/[$,\s]/g, "");
  if (cleaned === "") return undefined;
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? undefined : n;
}

/** Normalized address key for dedupe/enrichment joins: lowercase, alphanumeric only. */
export function addrKey(address: string | undefined): string {
  return (address ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Pick the best owner phone from a PropStream-style Phone 1..5 block, honoring
 * type (prefer mobile) and DNC flags. Returns the chosen number and its DNC state.
 * Falls back to null when no phone block is present.
 */
function pickPhoneFromBlock(row: Row): { phone: string; dnc: boolean } | null {
  const phones: { number: string; type: string; dnc: boolean; idx: number }[] = [];
  for (let i = 1; i <= 5; i++) {
    // Find the phone-number column for slot i (tolerant of header variants).
    const numKey = Object.keys(row).find((k) => {
      const n = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      return n === `phone${i}` || n === `phone${i}number`;
    });
    if (!numKey || !row[numKey]) continue;
    const typeKey = Object.keys(row).find((k) => {
      const n = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      return n === `phone${i}type`;
    });
    const dncKey = Object.keys(row).find((k) => {
      const n = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      return n === `phone${i}dnc`;
    });
    const type = typeKey ? String(row[typeKey] ?? "").toLowerCase() : "";
    const dncRaw = dncKey ? String(row[dncKey] ?? "").toLowerCase() : "";
    const dnc = dncRaw === "true" || dncRaw === "yes" || dncRaw === "y" || dncRaw === "1";
    phones.push({ number: row[numKey], type, dnc, idx: i });
  }
  if (phones.length === 0) return null;

  const mobileNonDnc = phones.find((p) => p.type.includes("mobile") && !p.dnc);
  if (mobileNonDnc) return { phone: mobileNonDnc.number, dnc: false };
  const nonDnc = phones.find((p) => !p.dnc);
  if (nonDnc) return { phone: nonDnc.number, dnc: false };
  return { phone: phones[0].number, dnc: true }; // fall back to Phone 1, flagged DNC
}

/** normalizeWithMap(rows, map) → Property[]. Drops rows with no address. */
export function normalizeWithMap(rows: Row[], mapping: FieldMapping): Property[] {
  const m = mapping.map;
  const get = (row: Row, key: FieldKey): string | undefined => {
    const header = m[key];
    return header ? row[header] : undefined;
  };

  const out: Property[] = [];
  for (const row of rows) {
    const address = (get(row, "address") ?? "").trim();
    if (!address) continue; // drop rows with no address

    const ownerFull =
      (get(row, "owner_full") ?? "").trim() ||
      [get(row, "owner_first"), get(row, "owner_last")]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      undefined;

    // DNC-aware phone resolution
    let owner_cell = get(row, "owner_cell")?.trim() || undefined;
    let owner_dnc = false;
    const block = pickPhoneFromBlock(row);
    if (block) {
      owner_cell = block.phone;
      owner_dnc = block.dnc;
    }

    const p: Property = {
      address,
      city: get(row, "city")?.trim() || undefined,
      state: get(row, "state")?.trim() || undefined,
      zip: get(row, "zip")?.trim() || undefined,
      home_value: parseNum(get(row, "home_value")) ?? 0,
      loan_balance: parseNum(get(row, "loan_balance")),
      equity: parseNum(get(row, "equity")),
      monthly_rent: parseNum(get(row, "monthly_rent")),
      loan_payment: parseNum(get(row, "loan_payment")),
      asking: parseNum(get(row, "asking")),
      owner_full: ownerFull,
      owner_first: get(row, "owner_first")?.trim() || undefined,
      owner_last: get(row, "owner_last")?.trim() || undefined,
      agent_name: get(row, "agent_name")?.trim() || undefined,
      agent_email: get(row, "agent_email")?.trim() || undefined,
      agent_phone: get(row, "agent_phone")?.trim() || undefined,
      owner_cell,
      owner_email: get(row, "owner_email")?.trim() || undefined,
      owner_dnc,
      raw: row,
    };
    out.push(p);
  }
  return out;
}

/**
 * enrich(base, addRows) → join skip-trace owner_cell/owner_email onto base rows
 * by normalized address key. Only fills blanks; never overwrites existing contact.
 */
export function enrich(base: Property[], addRows: Property[]): Property[] {
  const byAddr = new Map<string, Property>();
  for (const a of addRows) byAddr.set(addrKey(a.address), a);

  return base.map((b) => {
    const match = byAddr.get(addrKey(b.address));
    if (!match) return b;
    const next = { ...b };
    if (!next.owner_cell && match.owner_cell) {
      next.owner_cell = match.owner_cell;
      next.owner_dnc = match.owner_dnc;
    }
    if (!next.owner_email && match.owner_email) next.owner_email = match.owner_email;
    if (!next.owner_full && match.owner_full) next.owner_full = match.owner_full;
    return next;
  });
}
