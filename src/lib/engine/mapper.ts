import type { FieldMapping, FieldSpec, FileKind } from "./types";

export const FIELD_SPECS: FieldSpec[] = [
  {
    key: "address",
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
  { key: "city", required: false, synonyms: ["sitecity", "inputpropertycity", "city"] },
  { key: "state", required: false, synonyms: ["sitestate", "inputpropertystate", "state"] },
  {
    key: "zip",
    required: false,
    synonyms: ["sitezip", "inputpropertyzip", "zipcode", "zip", "postal"],
  },
  {
    key: "owner_full",
    required: false,
    synonyms: ["ownerfullname", "ownersfullname", "ownername"],
  },
  {
    key: "owner_first",
    required: false,
    synonyms: ["owner1firstname", "ownerfirstname", "ownerfirst", "firstname"],
  },
  {
    key: "owner_last",
    required: false,
    synonyms: ["owner1lastname", "ownerlastname", "ownerlast", "lastname"],
  },
  {
    key: "home_value",
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
    required: false,
    synonyms: ["estimatedequity", "estequity", "equity", "eev"],
  },
  {
    key: "monthly_rent",
    required: false,
    synonyms: ["monthlyrent", "marketrent", "rentestimate", "estrent"],
  },
  {
    key: "loan_payment",
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
    required: false,
    synonyms: ["mlsamount", "askingprice", "listprice", "listingprice", "mlsprice"],
  },
  {
    key: "agent_name",
    required: false,
    synonyms: ["mlsagentname", "listingagentname", "agentname"],
  },
  {
    key: "agent_email",
    required: false,
    synonyms: ["mlsagentemail", "listingagentemail", "agentemail"],
  },
  {
    key: "agent_phone",
    required: false,
    synonyms: ["mlsagentphone", "listingagentphone", "agentphone"],
  },
  {
    key: "owner_cell",
    required: false,
    synonyms: [
      "phone1number",
      "phone1",
      "cellphone",
      "ownerphone",
      "phonenumber",
      "mobile",
      "phone",
      "cell",
    ],
  },
  {
    key: "owner_email",
    required: false,
    synonyms: ["email1", "owneremail", "emailaddress", "email"],
  },
];

export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function autoMapHeaders(headers: string[]): FieldMapping[] {
  const used = new Set<string>();
  const mappings: FieldMapping[] = [];

  for (const spec of FIELD_SPECS) {
    let match: { header: string; method: "exact" | "guess" } | null = null;

    for (const header of headers) {
      if (used.has(header)) continue;
      const norm = normalizeHeader(header);
      if (spec.synonyms.some((syn) => norm === syn)) {
        match = { header, method: "exact" };
        break;
      }
    }

    if (!match) {
      for (const header of headers) {
        if (used.has(header)) continue;
        const norm = normalizeHeader(header);
        if (spec.synonyms.some((syn) => norm.includes(syn))) {
          match = { header, method: "guess" };
          break;
        }
      }
    }

    if (match) {
      used.add(match.header);
      mappings.push({
        field: spec.key,
        header: match.header,
        method: match.method,
      });
    }
  }

  return mappings;
}

export function classifyFile(mappings: FieldMapping[]): FileKind {
  const mappedFields = new Set(mappings.map((m) => m.field));
  const missing = FIELD_SPECS.filter((f) => f.required && !mappedFields.has(f.key)).map(
    (f) => f.key
  );
  const hasContact = ["agent_email", "agent_phone", "owner_cell", "owner_email"].some((f) =>
    mappedFields.has(f)
  );

  if (missing.length === 0) return "base";
  if (missing.includes("home_value") && mappedFields.has("address") && hasContact) {
    return "enrichment";
  }
  return "incomplete";
}

export function getMissingRequired(mappings: FieldMapping[]): string[] {
  const mappedFields = new Set(mappings.map((m) => m.field));
  return FIELD_SPECS.filter((f) => f.required && !mappedFields.has(f.key)).map((f) => f.key);
}

export function mappingToRecord(mappings: FieldMapping[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of mappings) {
    map[m.field] = m.header;
  }
  return map;
}
