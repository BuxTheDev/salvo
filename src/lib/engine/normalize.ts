import type { FieldKey, Mapping, Property } from "./types";
import { FIELD_ORDER } from "./mapper";

const NUMERIC_FIELDS: FieldKey[] = [
  "home_value",
  "loan_balance",
  "equity",
  "monthly_rent",
  "loan_payment",
  "asking",
];

export function parseMoney(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : undefined;
  const s = String(raw).replace(/[$,\s]/g, "").trim();
  if (!s) return undefined;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

export function addressKey(address: string): string {
  return String(address).toLowerCase().replace(/[^a-z0-9]/g, "");
}

type RawRow = Record<string, unknown>;

/**
 * PropStream-style Phone 1..5 + Type + DNC block.
 * Prefer first mobile non-DNC; else first non-DNC; else Phone 1 with dnc=true.
 */
export function pickPhoneFromBlock(row: RawRow): {
  phone?: string;
  dnc: boolean;
} {
  const slots: { phone?: string; type: string; dnc: boolean }[] = [];
  for (let i = 1; i <= 5; i++) {
    const phone =
      (row[`Phone ${i}`] ??
        row[`Phone ${i} Number`] ??
        row[`phone${i}`] ??
        row[`Phone${i}`]) as string | undefined;
    if (!phone || !String(phone).trim()) continue;
    const type = String(
      row[`Phone ${i} Type`] ?? row[`Phone${i} Type`] ?? "",
    ).toLowerCase();
    const dncRaw = String(
      row[`Phone ${i} DNC`] ?? row[`Phone${i} DNC`] ?? "",
    ).toLowerCase();
    const dnc = dncRaw === "true" || dncRaw === "yes" || dncRaw === "y" || dncRaw === "1";
    slots.push({ phone: String(phone).trim(), type, dnc });
  }
  if (!slots.length) return { dnc: false };

  const mobileOk = slots.find(
    (s) => !s.dnc && (s.type.includes("mobile") || s.type.includes("cell")),
  );
  if (mobileOk) return { phone: mobileOk.phone, dnc: false };

  const anyOk = slots.find((s) => !s.dnc);
  if (anyOk) return { phone: anyOk.phone, dnc: false };

  return { phone: slots[0].phone, dnc: true };
}

function hasPhoneBlock(headers: string[]): boolean {
  const set = new Set(headers.map((h) => h.toLowerCase()));
  return (
    set.has("phone 1") ||
    set.has("phone 1 number") ||
    set.has("phone1") ||
    [...set].some((h) => /^phone\s*[1-5](\s*number)?$/.test(h))
  );
}

function getMapped(row: RawRow, header: string | null): unknown {
  if (!header) return undefined;
  return row[header];
}

function setProp(p: Property, field: FieldKey, value: unknown) {
  (p as unknown as Record<string, unknown>)[field] = value;
}

export function normalizeWithMap(
  rows: RawRow[],
  mapping: Mapping,
  headers?: string[],
): Property[] {
  const useBlock = headers ? hasPhoneBlock(headers) : false;
  const out: Property[] = [];

  for (const row of rows) {
    const address = String(getMapped(row, mapping.address.header) ?? "").trim();
    if (!address) continue;

    const p: Property = {
      address,
      home_value: 0,
    };

    for (const field of FIELD_ORDER) {
      if (field === "address") continue;
      const header = mapping[field].header;
      const raw = getMapped(row, header);
      if (NUMERIC_FIELDS.includes(field)) {
        const n = parseMoney(raw);
        if (n != null) setProp(p, field, n);
      } else if (raw != null && String(raw).trim()) {
        setProp(p, field, String(raw).trim());
      }
    }

    if (!p.owner_full) {
      const first = p.owner_first ?? "";
      const last = p.owner_last ?? "";
      const full = `${first} ${last}`.trim();
      if (full) p.owner_full = full;
    }

    if (useBlock) {
      const picked = pickPhoneFromBlock(row);
      if (picked.phone) {
        // only fill if mapped owner_cell empty / overwrite with smarter pick
        p.owner_cell = picked.phone;
        p.owner_dnc = picked.dnc;
      } else {
        p.owner_dnc = false;
      }
    } else {
      p.owner_dnc = false;
    }

    if (p.home_value == null || Number.isNaN(p.home_value)) p.home_value = 0;
    out.push(p);
  }

  return out;
}

/** Join skip-trace contact onto base by normalized address. Only fill blanks. */
export function enrich(base: Property[], addRows: Property[]): Property[] {
  const byAddr = new Map<string, Property>();
  for (const a of addRows) {
    const k = addressKey(a.address);
    if (k && !byAddr.has(k)) byAddr.set(k, a);
  }

  return base.map((b) => {
    const extra = byAddr.get(addressKey(b.address));
    if (!extra) return b;
    const next = { ...b };
    if (!next.owner_cell && extra.owner_cell) {
      next.owner_cell = extra.owner_cell;
      next.owner_dnc = extra.owner_dnc ?? false;
    }
    if (!next.owner_email && extra.owner_email) {
      next.owner_email = extra.owner_email;
    }
    if (!next.owner_full && extra.owner_full) {
      next.owner_full = extra.owner_full;
    }
    return next;
  });
}
