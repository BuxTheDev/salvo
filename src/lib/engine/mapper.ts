import type { FieldKey, FieldMapping, FileKind, Mapping, MapConfidence } from "./types";

/** Synonym dictionary — normalized: lowercase, strip non-alphanumeric. Order = priority. */
export const FIELD_SYNONYMS: Record<FieldKey, string[]> = {
  address: [
    "propertyaddress",
    "siteaddress",
    "situsaddress",
    "inputpropertyaddress",
    "sitemail",
    "streetaddress",
    "address",
    "street",
  ],
  city: ["sitecity", "inputpropertycity", "city"],
  state: ["sitestate", "inputpropertystate", "state"],
  zip: ["sitezip", "inputpropertyzip", "zipcode", "zip", "postal"],
  owner_full: ["ownerfullname", "ownersfullname", "ownername"],
  owner_first: ["owner1firstname", "ownerfirstname", "ownerfirst", "firstname"],
  owner_last: ["owner1lastname", "ownerlastname", "ownerlast", "lastname"],
  home_value: [
    "estimatedmarketvalue",
    "estmarketvalue",
    "estimatedvalue",
    "estvalue",
    "marketvalue",
    "homevalue",
    "emv",
    "avm",
    "arv",
  ],
  loan_balance: [
    "remainingbalanceofopenloans",
    "estimatedloanbalance",
    "estloanbalance",
    "loanbalance",
    "mortgagebalance",
    "openloans",
    "elv",
  ],
  equity: ["estimatedequity", "estequity", "equity", "eev"],
  monthly_rent: ["monthlyrent", "marketrent", "rentestimate", "estrent"],
  loan_payment: [
    "esttotalmonthlypayments",
    "totalmonthlypayments",
    "loanpayment",
    "monthlypayment",
    "piti",
  ],
  asking: ["mlsamount", "askingprice", "listprice", "listingprice", "mlsprice"],
  agent_name: ["mlsagentname", "listingagentname", "agentname"],
  agent_email: ["mlsagentemail", "listingagentemail", "agentemail"],
  agent_phone: ["mlsagentphone", "listingagentphone", "agentphone"],
  owner_cell: [
    "phone1number",
    "phone1",
    "cellphone",
    "ownerphone",
    "phonenumber",
    "mobile",
    "phone",
    "cell",
  ],
  owner_email: ["email1", "owneremail", "emailaddress", "email"],
};

export const FIELD_ORDER: FieldKey[] = [
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

export const REQUIRED_FIELDS: FieldKey[] = ["address", "home_value"];

export const FIELD_LABELS: Record<FieldKey, string> = {
  address: "Address",
  city: "City",
  state: "State",
  zip: "Zip",
  owner_full: "Owner Full Name",
  owner_first: "Owner First",
  owner_last: "Owner Last",
  home_value: "Home Value",
  loan_balance: "Loan Balance",
  equity: "Equity",
  monthly_rent: "Monthly Rent",
  loan_payment: "Loan Payment",
  asking: "Asking / MLS",
  agent_name: "Agent Name",
  agent_email: "Agent Email",
  agent_phone: "Agent Phone",
  owner_cell: "Owner Cell",
  owner_email: "Owner Email",
};

export function normalizeHeader(h: string): string {
  return String(h).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function emptyMapping(): Mapping {
  const m = {} as Mapping;
  for (const k of FIELD_ORDER) {
    m[k] = { header: null, confidence: "none" };
  }
  return m;
}

/**
 * Two-pass auto-map: exact equality first, then fuzzy (synonym ⊂ header only).
 * Never reverse fuzzy — reversing lets generic headers like `email` hijack agent_email.
 */
export function autoMap(headers: string[]): Mapping {
  const mapping = emptyMapping();
  const used = new Set<string>();
  const normToHeader = new Map<string, string>();
  for (const h of headers) {
    const n = normalizeHeader(h);
    if (n && !normToHeader.has(n)) normToHeader.set(n, h);
  }

  // Pass 1: exact
  for (const field of FIELD_ORDER) {
    for (const syn of FIELD_SYNONYMS[field]) {
      const header = normToHeader.get(syn);
      if (header && !used.has(header)) {
        mapping[field] = { header, confidence: "auto" };
        used.add(header);
        break;
      }
    }
  }

  // Pass 2: fuzzy — synonym ⊂ normalized header
  for (const field of FIELD_ORDER) {
    if (mapping[field].header) continue;
    for (const h of headers) {
      if (used.has(h)) continue;
      const n = normalizeHeader(h);
      for (const syn of FIELD_SYNONYMS[field]) {
        if (n.includes(syn)) {
          mapping[field] = { header: h, confidence: "guess" };
          used.add(h);
          break;
        }
      }
      if (mapping[field].header) break;
    }
  }

  return mapping;
}

export function setMapping(
  mapping: Mapping,
  field: FieldKey,
  header: string | null,
): Mapping {
  const next = { ...mapping };
  // clear other fields that used this header
  if (header) {
    for (const k of FIELD_ORDER) {
      if (k !== field && next[k].header === header) {
        next[k] = { header: null, confidence: "none" };
      }
    }
  }
  next[field] = {
    header,
    confidence: header ? "set" : "none",
  };
  return next;
}

export function classifyFile(mapping: Mapping): {
  kind: FileKind;
  missing: FieldKey[];
  hasContact: boolean;
} {
  const missing = REQUIRED_FIELDS.filter((f) => !mapping[f].header);
  const hasContact = !!(
    mapping.agent_email.header ||
    mapping.agent_phone.header ||
    mapping.owner_cell.header ||
    mapping.owner_email.header
  );

  let kind: FileKind;
  if (missing.length === 0) {
    kind = "base";
  } else if (
    missing.includes("home_value") &&
    !!mapping.address.header &&
    hasContact
  ) {
    kind = "enrichment";
  } else {
    kind = "incomplete";
  }

  return { kind, missing, hasContact };
}

export function mappingToSimple(mapping: Mapping): Record<FieldKey, string | null> {
  const out = {} as Record<FieldKey, string | null>;
  for (const k of FIELD_ORDER) out[k] = mapping[k].header;
  return out;
}

export function confidenceBadge(c: MapConfidence): string {
  if (c === "auto") return "auto";
  if (c === "guess") return "guess";
  if (c === "set") return "set";
  return "";
}

export type { FieldMapping };
