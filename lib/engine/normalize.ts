import type { Property } from "./types";
import { normalizeHeader, type FieldMap } from "./mapper";

export type RawRow = Record<string, string | number | undefined | null>;

const NUMERIC_FIELDS = ["home_value", "loan_balance", "equity", "monthly_rent", "loan_payment", "asking"] as const;

function toNumber(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isNaN(n) ? undefined : n;
}

function truthyFlag(v: unknown): boolean {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "y" || s === "yes" || s === "true" || s === "1" || s === "dnc";
}

interface PhoneBlockColumns {
  numbers: Record<number, string>;
  types: Record<number, string>;
  dncs: Record<number, string>;
}

/** Detect a PropStream-style "Phone 1..5" + "Phone N Type" + "Phone N DNC" block. */
function detectPhoneBlock(headers: string[]): PhoneBlockColumns {
  const cols: PhoneBlockColumns = { numbers: {}, types: {}, dncs: {} };
  for (const header of headers) {
    const norm = normalizeHeader(header);
    let m = norm.match(/^phone([1-5])$/);
    if (m) {
      cols.numbers[Number(m[1])] = header;
      continue;
    }
    m = norm.match(/^phone([1-5])type$/);
    if (m) {
      cols.types[Number(m[1])] = header;
      continue;
    }
    m = norm.match(/^phone([1-5])dnc$/);
    if (m) {
      cols.dncs[Number(m[1])] = header;
      continue;
    }
  }
  return cols;
}

/**
 * §5.3 — DNC-aware phone selection.
 * If the file has a PropStream Phone 1..5 block: pick the first mobile,
 * non-DNC number; else first non-DNC; else Phone 1 with owner_dnc = true.
 * Otherwise use the single mapped owner_cell with owner_dnc = false.
 */
export function pickPhone(
  row: RawRow,
  headers: string[],
  map: FieldMap,
): { owner_cell?: string; owner_dnc: boolean } {
  const block = detectPhoneBlock(headers);
  const indices = Object.keys(block.numbers)
    .map(Number)
    .sort((a, b) => a - b);

  if (indices.length > 0) {
    const candidates = indices
      .map((i) => ({
        number: row[block.numbers[i]],
        type: block.types[i] ? String(row[block.types[i]] ?? "") : "",
        dnc: block.dncs[i] ? truthyFlag(row[block.dncs[i]]) : false,
      }))
      .filter((c) => !!c.number);

    const mobileNonDnc = candidates.find((c) => c.type.toLowerCase().includes("mobile") && !c.dnc);
    if (mobileNonDnc) return { owner_cell: String(mobileNonDnc.number), owner_dnc: false };

    const anyNonDnc = candidates.find((c) => !c.dnc);
    if (anyNonDnc) return { owner_cell: String(anyNonDnc.number), owner_dnc: false };

    const first = candidates[0];
    if (first) return { owner_cell: String(first.number), owner_dnc: true };

    return { owner_cell: undefined, owner_dnc: false };
  }

  const mapped = map.owner_cell ? row[map.owner_cell.header] : undefined;
  return { owner_cell: mapped != null && mapped !== "" ? String(mapped) : undefined, owner_dnc: false };
}

/** §5.3 — normalizeWithMap(rows, map) -> Property[]. Drops rows with no address. */
export function normalizeWithMap(rows: RawRow[], map: FieldMap, headers?: string[]): Property[] {
  const allHeaders = headers ?? (rows.length ? Object.keys(rows[0]) : []);
  const out: Property[] = [];

  for (const row of rows) {
    const get = (field: keyof FieldMap): string | undefined => {
      const m = map[field];
      if (!m) return undefined;
      const v = row[m.header];
      return v == null || v === "" ? undefined : String(v);
    };

    const address = get("address");
    if (!address) continue;

    const combinedName = [get("owner_first"), get("owner_last")].filter(Boolean).join(" ");
    const owner_full = get("owner_full") ?? (combinedName || undefined);
    const { owner_cell, owner_dnc } = pickPhone(row, allHeaders, map);

    const property: Property = {
      address,
      city: get("city"),
      state: get("state"),
      zip: get("zip"),
      home_value: toNumber(map.home_value ? row[map.home_value.header] : undefined) ?? 0,
      loan_balance: toNumber(map.loan_balance ? row[map.loan_balance.header] : undefined),
      equity: toNumber(map.equity ? row[map.equity.header] : undefined),
      monthly_rent: toNumber(map.monthly_rent ? row[map.monthly_rent.header] : undefined),
      loan_payment: toNumber(map.loan_payment ? row[map.loan_payment.header] : undefined),
      asking: toNumber(map.asking ? row[map.asking.header] : undefined),
      owner_full,
      owner_first: get("owner_first"),
      owner_last: get("owner_last"),
      agent_name: get("agent_name"),
      agent_email: get("agent_email"),
      agent_phone: get("agent_phone"),
      owner_cell,
      owner_email: get("owner_email"),
      owner_dnc,
      raw: row as Record<string, unknown>,
    };

    out.push(property);
  }

  return out;
}

/** lowercase, strip non-alphanumeric — the join key for enrichment. */
export function addressKey(address: string): string {
  return address.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * §5.3 — enrich(base, addRows) -> join skip-trace owner_cell/owner_email onto
 * base rows by normalized address key. Only fills blanks; never overwrites
 * existing contact info.
 */
export function enrich(base: Property[], addRows: Property[]): Property[] {
  const byKey = new Map<string, Property>();
  for (const row of addRows) {
    byKey.set(addressKey(row.address), row);
  }

  return base.map((row) => {
    const match = byKey.get(addressKey(row.address));
    if (!match) return row;

    return {
      ...row,
      owner_cell: row.owner_cell ?? match.owner_cell,
      owner_email: row.owner_email ?? match.owner_email,
      owner_full: row.owner_full ?? match.owner_full,
      owner_dnc: row.owner_cell ? row.owner_dnc : match.owner_dnc ?? row.owner_dnc,
    };
  });
}

export { NUMERIC_FIELDS };
