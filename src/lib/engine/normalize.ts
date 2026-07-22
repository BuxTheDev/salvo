import type { Property } from "./types";

const NUMERIC_FIELDS = new Set([
  "home_value",
  "loan_balance",
  "equity",
  "monthly_rent",
  "loan_payment",
  "asking",
]);

function parseNum(val: unknown): number | undefined {
  if (val == null || val === "") return undefined;
  const n = parseFloat(String(val).replace(/[$,]/g, ""));
  return Number.isNaN(n) ? undefined : n;
}

function assignField(prop: Property, field: string, value: string | number) {
  switch (field) {
    case "city": prop.city = String(value); break;
    case "state": prop.state = String(value); break;
    case "zip": prop.zip = String(value); break;
    case "home_value": prop.home_value = Number(value); break;
    case "loan_balance": prop.loan_balance = Number(value); break;
    case "equity": prop.equity = Number(value); break;
    case "monthly_rent": prop.monthly_rent = Number(value); break;
    case "loan_payment": prop.loan_payment = Number(value); break;
    case "asking": prop.asking = Number(value); break;
    case "owner_full": prop.owner_full = String(value); break;
    case "owner_first": prop.owner_first = String(value); break;
    case "owner_last": prop.owner_last = String(value); break;
    case "agent_name": prop.agent_name = String(value); break;
    case "agent_email": prop.agent_email = String(value); break;
    case "agent_phone": prop.agent_phone = String(value); break;
    case "owner_cell": prop.owner_cell = String(value); break;
    case "owner_email": prop.owner_email = String(value); break;
  }
}

function getVal(row: Record<string, string>, header: string | undefined): string {
  if (!header) return "";
  return String(row[header] ?? "").trim();
}

function addressKey(address: string): string {
  return address.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolvePropStreamPhone(row: Record<string, string>): {
  phone?: string;
  dnc: boolean;
} {
  for (let i = 1; i <= 5; i++) {
    const phone = getVal(row, `Phone ${i}`);
    const type = getVal(row, `Phone ${i} Type`).toLowerCase();
    const dnc = getVal(row, `Phone ${i} DNC`).toLowerCase() === "true";
    if (!phone) continue;
    if (type.includes("mobile") && !dnc) return { phone, dnc: false };
  }
  for (let i = 1; i <= 5; i++) {
    const phone = getVal(row, `Phone ${i}`);
    const dnc = getVal(row, `Phone ${i} DNC`).toLowerCase() === "true";
    if (phone && !dnc) return { phone, dnc: false };
  }
  const phone1 = getVal(row, "Phone 1");
  if (phone1) return { phone: phone1, dnc: true };
  return { dnc: false };
}

export function normalizeWithMap(
  rows: Record<string, string>[],
  map: Record<string, string>
): Property[] {
  const properties: Property[] = [];

  for (const row of rows) {
    const address = getVal(row, map.address);
    if (!address) continue;

    const prop: Property = { address, home_value: 0 };

    for (const [field, header] of Object.entries(map)) {
      if (!header || field === "address") continue;
      const raw = getVal(row, header);
      if (!raw) continue;

      if (NUMERIC_FIELDS.has(field)) {
        const num = parseNum(raw);
        if (num != null) {
          assignField(prop, field, num);
        }
      } else {
        assignField(prop, field, raw);
      }
    }

    if (!prop.owner_full && (prop.owner_first || prop.owner_last)) {
      prop.owner_full = [prop.owner_first, prop.owner_last].filter(Boolean).join(" ");
    }

    const hasPhoneBlock = Object.keys(row).some((k) => k.startsWith("Phone "));
    if (hasPhoneBlock && !prop.owner_cell) {
      const resolved = resolvePropStreamPhone(row);
      if (resolved.phone) {
        prop.owner_cell = resolved.phone;
        prop.owner_dnc = resolved.dnc;
      }
    } else if (prop.owner_cell) {
      prop.owner_dnc = false;
    }

    if (!prop.home_value) continue;
    properties.push(prop);
  }

  return properties;
}

export function enrich(base: Property[], addRows: Record<string, string>[], map: Record<string, string>): Property[] {
  const enrichByAddr = new Map<string, { owner_cell?: string; owner_email?: string }>();

  for (const row of addRows) {
    const address = getVal(row, map.address);
    if (!address) continue;
    const key = addressKey(address);
    const entry: { owner_cell?: string; owner_email?: string } = {};
    if (map.owner_cell) entry.owner_cell = getVal(row, map.owner_cell) || undefined;
    if (map.owner_email) entry.owner_email = getVal(row, map.owner_email) || undefined;
    enrichByAddr.set(key, entry);
  }

  return base.map((prop) => {
    const extra = enrichByAddr.get(addressKey(prop.address));
    if (!extra) return prop;
    return {
      ...prop,
      owner_cell: prop.owner_cell || extra.owner_cell,
      owner_email: prop.owner_email || extra.owner_email,
    };
  });
}
