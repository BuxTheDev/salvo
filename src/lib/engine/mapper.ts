import type { FieldKey } from "./types";

/** Normalize a header: lowercase, strip everything that isn't a-z0-9. */
export function normHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export interface FieldSpec {
  key: FieldKey;
  label: string;
  required: boolean;
  synonyms: string[]; // already normalized
}

// Field order matters: matching walks the list top-to-bottom so more specific
// fields claim their headers before generic ones.
export const FIELD_SPECS: FieldSpec[] = [
  {
    key: "address",
    label: "Address",
    required: true,
    synonyms: [
      "propertyaddress",
      "siteaddress",
      "situsaddress",
      "inputpropertyaddress",
      "sitemail",
      "streetaddress",
      "address",
      "street",
    ],
  },
  { key: "city", label: "City", required: false, synonyms: ["sitecity", "inputpropertycity", "city"] },
  { key: "state", label: "State", required: false, synonyms: ["sitestate", "inputpropertystate", "state"] },
  {
    key: "zip",
    label: "Zip",
    required: false,
    synonyms: ["sitezip", "inputpropertyzip", "zipcode", "zip", "postal"],
  },
  {
    key: "owner_full",
    label: "Owner Full Name",
    required: false,
    synonyms: ["ownerfullname", "ownersfullname", "ownername"],
  },
  {
    key: "owner_first",
    label: "Owner First",
    required: false,
    synonyms: ["owner1firstname", "ownerfirstname", "ownerfirst", "firstname"],
  },
  {
    key: "owner_last",
    label: "Owner Last",
    required: false,
    synonyms: ["owner1lastname", "ownerlastname", "ownerlast", "lastname"],
  },
  {
    key: "home_value",
    label: "Home Value",
    required: true,
    synonyms: [
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
  },
  {
    key: "loan_balance",
    label: "Loan Balance",
    required: false,
    synonyms: [
      "remainingbalanceofopenloans",
      "estimatedloanbalance",
      "estloanbalance",
      "loanbalance",
      "mortgagebalance",
      "openloans",
      "elv",
    ],
  },
  {
    key: "equity",
    label: "Equity",
    required: false,
    synonyms: ["estimatedequity", "estequity", "equity", "eev"],
  },
  {
    key: "monthly_rent",
    label: "Monthly Rent",
    required: false,
    synonyms: ["monthlyrent", "marketrent", "rentestimate", "estrent"],
  },
  {
    key: "loan_payment",
    label: "Loan Payment",
    required: false,
    synonyms: [
      "esttotalmonthlypayments",
      "totalmonthlypayments",
      "loanpayment",
      "monthlypayment",
      "piti",
    ],
  },
  {
    key: "asking",
    label: "Asking / MLS Price",
    required: false,
    synonyms: ["mlsamount", "askingprice", "listprice", "listingprice", "mlsprice"],
  },
  {
    key: "agent_name",
    label: "Agent Name",
    required: false,
    synonyms: ["mlsagentname", "listingagentname", "agentname"],
  },
  {
    key: "agent_email",
    label: "Agent Email",
    required: false,
    synonyms: ["mlsagentemail", "listingagentemail", "agentemail"],
  },
  {
    key: "agent_phone",
    label: "Agent Phone",
    required: false,
    synonyms: ["mlsagentphone", "listingagentphone", "agentphone"],
  },
  {
    key: "owner_cell",
    label: "Owner Cell",
    required: false,
    synonyms: ["phone1number", "phone1", "cellphone", "ownerphone", "phonenumber", "mobile", "phone", "cell"],
  },
  {
    key: "owner_email",
    label: "Owner Email",
    required: false,
    synonyms: ["email1", "owneremail", "emailaddress", "email"],
  },
];

export type MapSource = "auto" | "guess" | "set" | "none";

export interface FieldMapping {
  // field key -> the original header it maps to (or null)
  map: Partial<Record<FieldKey, string | null>>;
  // provenance for each field: how the mapping was decided
  source: Partial<Record<FieldKey, MapSource>>;
}

/**
 * Auto-map headers → canonical fields via exact-then-fuzzy substring matching.
 *
 * Two passes over the fields (in spec order):
 *   Pass 1 = exact normalized equality (source "auto")
 *   Pass 2 = fuzzy: normalizedHeader.includes(synonym) — only synonym ⊂ header,
 *            never the reverse (so generic "email" can't hijack agent_email).
 * Each header maps to at most one field (marked used once claimed).
 */
export function autoMap(headers: string[]): FieldMapping {
  const map: Partial<Record<FieldKey, string | null>> = {};
  const source: Partial<Record<FieldKey, MapSource>> = {};
  const used = new Set<string>();

  const norm = headers.map((h) => ({ raw: h, n: normHeader(h) }));

  // Pass 1 — exact
  for (const spec of FIELD_SPECS) {
    if (map[spec.key]) continue;
    for (const h of norm) {
      if (used.has(h.raw)) continue;
      if (spec.synonyms.some((syn) => h.n === syn)) {
        map[spec.key] = h.raw;
        source[spec.key] = "auto";
        used.add(h.raw);
        break;
      }
    }
  }

  // Pass 2 — fuzzy (synonym is a substring of the header)
  for (const spec of FIELD_SPECS) {
    if (map[spec.key]) continue;
    for (const h of norm) {
      if (used.has(h.raw)) continue;
      if (spec.synonyms.some((syn) => h.n.includes(syn))) {
        map[spec.key] = h.raw;
        source[spec.key] = "guess";
        used.add(h.raw);
        break;
      }
    }
  }

  return { map, source };
}

export type FileKind = "base" | "enrichment" | "incomplete";

export interface Classification {
  kind: FileKind;
  missing: FieldKey[]; // required fields with no mapping
  hasContact: boolean;
}

/** Classify a mapped file (§5.2). */
export function classify(mapping: FieldMapping): Classification {
  const required = FIELD_SPECS.filter((f) => f.required).map((f) => f.key);
  const missing = required.filter((k) => !mapping.map[k]);
  const hasContact = ["agent_email", "agent_phone", "owner_cell", "owner_email"].some(
    (k) => !!mapping.map[k as FieldKey],
  );

  let kind: FileKind;
  if (missing.length === 0) kind = "base";
  else if (missing.includes("home_value") && mapping.map["address"] && hasContact) kind = "enrichment";
  else kind = "incomplete";

  return { kind, missing, hasContact };
}
