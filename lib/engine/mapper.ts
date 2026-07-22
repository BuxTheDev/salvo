/**
 * Smart CSV import mapping (§5). Accepts any CSV and auto-maps headers to
 * canonical Property fields via exact-then-fuzzy substring matching over a
 * synonym dictionary, then lets the user override.
 */

export type Field =
  | "address"
  | "city"
  | "state"
  | "zip"
  | "owner_full"
  | "owner_first"
  | "owner_last"
  | "home_value"
  | "loan_balance"
  | "equity"
  | "monthly_rent"
  | "loan_payment"
  | "asking"
  | "agent_name"
  | "agent_email"
  | "agent_phone"
  | "owner_cell"
  | "owner_email";

export interface FieldDef {
  field: Field;
  required: boolean;
  synonyms: string[];
}

/** §5.1 — field spec. Order matters: it is the resolution priority for pass 1 and 2. */
export const FIELD_SPEC: FieldDef[] = [
  {
    field: "address",
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
  { field: "city", required: false, synonyms: ["sitecity", "inputpropertycity", "city"] },
  { field: "state", required: false, synonyms: ["sitestate", "inputpropertystate", "state"] },
  { field: "zip", required: false, synonyms: ["sitezip", "inputpropertyzip", "zipcode", "zip", "postal"] },
  { field: "owner_full", required: false, synonyms: ["ownerfullname", "ownersfullname", "ownername"] },
  {
    field: "owner_first",
    required: false,
    synonyms: ["owner1firstname", "ownerfirstname", "ownerfirst", "firstname"],
  },
  { field: "owner_last", required: false, synonyms: ["owner1lastname", "ownerlastname", "ownerlast", "lastname"] },
  {
    field: "home_value",
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
    field: "loan_balance",
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
  { field: "equity", required: false, synonyms: ["estimatedequity", "estequity", "equity", "eev"] },
  { field: "monthly_rent", required: false, synonyms: ["monthlyrent", "marketrent", "rentestimate", "estrent"] },
  {
    field: "loan_payment",
    required: false,
    synonyms: ["esttotalmonthlypayments", "totalmonthlypayments", "loanpayment", "monthlypayment", "piti"],
  },
  { field: "asking", required: false, synonyms: ["mlsamount", "askingprice", "listprice", "listingprice", "mlsprice"] },
  { field: "agent_name", required: false, synonyms: ["mlsagentname", "listingagentname", "agentname"] },
  { field: "agent_email", required: false, synonyms: ["mlsagentemail", "listingagentemail", "agentemail"] },
  { field: "agent_phone", required: false, synonyms: ["mlsagentphone", "listingagentphone", "agentphone"] },
  {
    field: "owner_cell",
    required: false,
    synonyms: ["phone1number", "phone1", "cellphone", "ownerphone", "phonenumber", "mobile", "phone", "cell"],
  },
  { field: "owner_email", required: false, synonyms: ["email1", "owneremail", "emailaddress", "email"] },
];

export const REQUIRED_FIELDS: Field[] = FIELD_SPEC.filter((f) => f.required).map((f) => f.field);

export const CONTACT_FIELDS: Field[] = ["agent_email", "agent_phone", "owner_cell", "owner_email"];

export type Confidence = "auto" | "guess" | "set";

export interface MappedField {
  header: string;
  confidence: Confidence;
}

export type FieldMap = Partial<Record<Field, MappedField>>;

/** lowercase, strip non-alphanumeric */
export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Two passes over fields (in FIELD_SPEC order):
 * pass 1 = exact normalized equality; pass 2 = fuzzy (header.includes(synonym)).
 * Only synonym ⊂ header, never the reverse. Each header maps to at most one field.
 */
export function autoMap(headers: string[]): FieldMap {
  const normalized = headers.map((h) => ({ original: h, norm: normalizeHeader(h) }));
  const used = new Set<string>();
  const map: FieldMap = {};

  // pass 1: exact
  for (const spec of FIELD_SPEC) {
    for (const nh of normalized) {
      if (used.has(nh.original)) continue;
      if (spec.synonyms.includes(nh.norm)) {
        map[spec.field] = { header: nh.original, confidence: "auto" };
        used.add(nh.original);
        break;
      }
    }
  }

  // pass 2: fuzzy — synonym is a substring of the header, never reversed
  for (const spec of FIELD_SPEC) {
    if (map[spec.field]) continue;
    for (const nh of normalized) {
      if (used.has(nh.original)) continue;
      if (spec.synonyms.some((syn) => nh.norm.includes(syn))) {
        map[spec.field] = { header: nh.original, confidence: "guess" };
        used.add(nh.original);
        break;
      }
    }
  }

  return map;
}

export type FileKind = "base" | "enrichment" | "incomplete";

export interface Classification {
  missing: Field[];
  hasContact: boolean;
  kind: FileKind;
}

/** §5.2 — file classification. */
export function classify(map: FieldMap): Classification {
  const missing = REQUIRED_FIELDS.filter((f) => !map[f]);
  const hasContact = CONTACT_FIELDS.some((f) => !!map[f]);

  let kind: FileKind;
  if (missing.length === 0) {
    kind = "base";
  } else if (missing.includes("home_value") && !!map.address && hasContact) {
    kind = "enrichment";
  } else {
    kind = "incomplete";
  }

  return { missing, hasContact, kind };
}
