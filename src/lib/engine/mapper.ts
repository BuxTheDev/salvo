import {
  CanonicalField,
  FieldMapping,
  Mapping,
  Property,
} from "./types";

export const FIELD_SYNONYMS: Record<CanonicalField, string[]> = {
  address: ["propertyaddress", "siteaddress", "situsaddress", "inputpropertyaddress", "sitemail", "streetaddress", "address", "street"],
  city: ["sitecity", "inputpropertycity", "city"],
  state: ["sitestate", "inputpropertystate", "state"],
  zip: ["sitezip", "inputpropertyzip", "zipcode", "zip", "postal"],
  home_value: ["estimatedmarketvalue", "estmarketvalue", "estimatedvalue", "estvalue", "marketvalue", "homevalue", "emv", "avm", "arv"],
  loan_balance: ["remainingbalanceofopenloans", "estimatedloanbalance", "estloanbalance", "loanbalance", "mortgagebalance", "openloans", "elv"],
  equity: ["estimatedequity", "estequity", "equity", "eev"],
  monthly_rent: ["monthlyrent", "marketrent", "rentestimate", "estrent"],
  loan_payment: ["esttotalmonthlypayments", "totalmonthlypayments", "loanpayment", "monthlypayment", "piti"],
  asking: ["mlsamount", "askingprice", "listprice", "listingprice", "mlsprice"],
  owner_full: ["ownerfullname", "ownersfullname", "ownername"],
  owner_first: ["owner1firstname", "ownerfirstname", "ownerfirst", "firstname"],
  owner_last: ["owner1lastname", "ownerlastname", "ownerlast", "lastname"],
  agent_name: ["mlsagentname", "listingagentname", "agentname"],
  agent_email: ["mlsagentemail", "listingagentemail", "agentemail"],
  agent_phone: ["mlsagentphone", "listingagentphone", "agentphone"],
  owner_cell: ["phone1number", "phone1", "cellphone", "ownerphone", "phonenumber", "mobile", "phone", "cell"],
  owner_email: ["email1", "owneremail", "emailaddress", "email"],
};

export const FIELD_ORDER: CanonicalField[] = [
  "address",
  "city",
  "state",
  "zip",
  "owner_full",
  "owner_first",
  "owner_last",
  "home_value",
  "loan_balance",
  "equity",
  "monthly_rent",
  "loan_payment",
  "asking",
  "agent_name",
  "agent_email",
  "agent_phone",
  "owner_cell",
  "owner_email",
];
export const REQUIRED_FIELDS: CanonicalField[] = ["address", "home_value"];
export const NUMERIC_FIELDS = new Set<CanonicalField>([
  "home_value",
  "loan_balance",
  "equity",
  "monthly_rent",
  "loan_payment",
  "asking",
]);

export function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function autoMap(headers: string[]): Mapping {
  const result: Mapping = {};
  const used = new Set<string>();
  const normalized = headers.map((header) => ({
    header,
    value: normalizeHeader(header),
  }));

  for (const field of FIELD_ORDER) {
    const match = normalized.find(
      ({ header, value }) =>
        !used.has(header) && FIELD_SYNONYMS[field].includes(value),
    );
    if (match) {
      result[field] = { header: match.header, method: "exact" };
      used.add(match.header);
    }
  }

  for (const field of FIELD_ORDER) {
    if (result[field]) continue;
    const match = normalized.find(
      ({ header, value }) =>
        !used.has(header) &&
        FIELD_SYNONYMS[field].some((synonym) => value.includes(synonym)),
    );
    if (match) {
      result[field] = { header: match.header, method: "fuzzy" };
      used.add(match.header);
    }
  }

  return result;
}

export type FileKind = "base" | "enrichment" | "incomplete";

export function classifyMapping(mapping: Mapping): {
  kind: FileKind;
  missing: CanonicalField[];
  hasContact: boolean;
} {
  const missing = REQUIRED_FIELDS.filter((field) => !mapping[field]);
  const hasContact = ["agent_email", "agent_phone", "owner_cell", "owner_email"].some(
    (field) => mapping[field as CanonicalField],
  );
  const kind =
    missing.length === 0
      ? "base"
      : missing.includes("home_value") && Boolean(mapping.address) && hasContact
        ? "enrichment"
        : "incomplete";
  return { kind, missing, hasContact };
}

type CsvRow = Record<string, string | undefined>;

function parseNumeric(value?: string): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const parsed = Number.parseFloat(value.replace(/[$,\s]/g, ""));
  return Number.isNaN(parsed) ? undefined : parsed;
}

function firstValue(row: CsvRow, mapping?: FieldMapping): string | undefined {
  const value = mapping ? row[mapping.header] : undefined;
  return value?.trim() || undefined;
}

function dncPhone(row: CsvRow): { phone?: string; dnc: boolean } | undefined {
  const lookup = new Map(
    Object.keys(row).map((key) => [normalizeHeader(key), key]),
  );
  const candidates: { phone?: string; mobile: boolean; dnc: boolean }[] = [];

  for (let index = 1; index <= 5; index += 1) {
    const numberKey = lookup.get(`phone${index}number`) ?? lookup.get(`phone${index}`);
    if (!numberKey) continue;
    const typeKey = lookup.get(`phone${index}type`);
    const dncKey = lookup.get(`phone${index}dnc`);
    const dncValue = dncKey ? String(row[dncKey] ?? "").toLowerCase() : "";
    candidates.push({
      phone: row[numberKey]?.trim(),
      mobile: /mobile|cell/.test(typeKey ? String(row[typeKey] ?? "").toLowerCase() : ""),
      dnc: /^(true|yes|y|1|dnc)$/.test(dncValue),
    });
  }

  if (!candidates.length) return undefined;
  const safeMobile = candidates.find((item) => item.phone && item.mobile && !item.dnc);
  const safe = candidates.find((item) => item.phone && !item.dnc);
  const fallback = candidates.find((item) => item.phone);
  const selected = safeMobile ?? safe ?? fallback;
  return selected ? { phone: selected.phone, dnc: selected.dnc } : undefined;
}

export function normalizeWithMap(rows: CsvRow[], mapping: Mapping): Property[] {
  return rows.flatMap((row, index) => {
    const address = firstValue(row, mapping.address);
    if (!address) return [];

    const property = { id: `row-${index + 1}`, address } as Property;
    for (const field of FIELD_ORDER) {
      if (field === "address") continue;
      const value = firstValue(row, mapping[field]);
      if (NUMERIC_FIELDS.has(field)) {
        const numeric = parseNumeric(value);
        if (numeric != null) {
          (property as unknown as Record<string, number>)[field] = numeric;
        }
      } else if (value != null) {
        (property as unknown as Record<string, string>)[field] = value;
      }
    }

    const derivedOwnerName = [property.owner_first, property.owner_last]
      .filter(Boolean)
      .join(" ");
    property.owner_full = property.owner_full || derivedOwnerName || undefined;
    const phone = dncPhone(row);
    if (phone) {
      property.owner_cell = phone.phone;
      property.owner_dnc = phone.dnc;
    } else {
      property.owner_dnc = false;
    }
    property.home_value ??= 0;
    return [property];
  });
}

function addressKey(value: string): string {
  return normalizeHeader(value);
}

export function enrich(base: Property[], additions: Property[]): Property[] {
  const byAddress = new Map(additions.map((item) => [addressKey(item.address), item]));
  return base.map((item) => {
    const addition = byAddress.get(addressKey(item.address));
    if (!addition) return item;
    return {
      ...item,
      owner_cell: item.owner_cell || addition.owner_cell,
      owner_email: item.owner_email || addition.owner_email,
      owner_dnc: item.owner_cell ? item.owner_dnc : addition.owner_dnc,
    };
  });
}
