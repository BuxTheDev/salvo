/** Smart import & mapping (spec §5): auto-map any CSV's headers → canonical fields. */
import { norm } from "./format";
import type { FileReport, Mapping } from "./types";

export interface FieldSpec {
  label: string;
  req: boolean;
  syn: string[];
}

/** Field spec + synonym dictionary (spec §5.1). Order matters: it is the matching priority. */
export const SPEC: Record<string, FieldSpec> = {
  address:      { label: "Property address", req: true,  syn: ["propertyaddress", "siteaddress", "situsaddress", "inputpropertyaddress", "sitemail", "streetaddress", "address", "street"] },
  city:         { label: "City",             req: false, syn: ["sitecity", "inputpropertycity", "city"] },
  state:        { label: "State",            req: false, syn: ["sitestate", "inputpropertystate", "state"] },
  zip:          { label: "Zip",              req: false, syn: ["sitezip", "inputpropertyzip", "zipcode", "zip", "postal"] },
  owner_full:   { label: "Owner full name",  req: false, syn: ["ownerfullname", "ownersfullname", "ownername"] },
  owner_first:  { label: "Owner first name", req: false, syn: ["owner1firstname", "ownerfirstname", "ownerfirst", "firstname"] },
  owner_last:   { label: "Owner last name",  req: false, syn: ["owner1lastname", "ownerlastname", "ownerlast", "lastname"] },
  home_value:   { label: "Home value",       req: true,  syn: ["estimatedmarketvalue", "estmarketvalue", "estimatedvalue", "estvalue", "marketvalue", "homevalue", "emv", "avm", "arv"] },
  loan_balance: { label: "Loan balance",     req: false, syn: ["remainingbalanceofopenloans", "estimatedloanbalance", "estloanbalance", "loanbalance", "mortgagebalance", "openloans", "elv"] },
  equity:       { label: "Equity",           req: false, syn: ["estimatedequity", "estequity", "equity", "eev"] },
  monthly_rent: { label: "Monthly rent",     req: false, syn: ["monthlyrent", "marketrent", "rentestimate", "estrent"] },
  loan_payment: { label: "Existing payment", req: false, syn: ["esttotalmonthlypayments", "totalmonthlypayments", "loanpayment", "monthlypayment", "piti"] },
  asking:       { label: "Asking / list price", req: false, syn: ["mlsamount", "askingprice", "listprice", "listingprice", "mlsprice"] },
  agent_name:   { label: "Agent name",       req: false, syn: ["mlsagentname", "listingagentname", "agentname"] },
  agent_email:  { label: "Agent email",      req: false, syn: ["mlsagentemail", "listingagentemail", "agentemail"] },
  agent_phone:  { label: "Agent phone",      req: false, syn: ["mlsagentphone", "listingagentphone", "agentphone"] },
  owner_cell:   { label: "Owner phone",      req: false, syn: ["phone1number", "phone1", "cellphone", "ownerphone", "phonenumber", "mobile", "phone", "cell"] },
  owner_email:  { label: "Owner email",      req: false, syn: ["email1", "owneremail", "emailaddress", "email"] },
};

export const FIELD_ORDER = Object.keys(SPEC);

/**
 * Two passes over fields in spec order: exact normalized equality, then fuzzy
 * substring — only `synonym ⊂ header`, never the reverse (a generic `email`
 * header must not hijack `agent_email`). Each header maps to at most one field.
 */
export function autoMap(headers: string[]): Mapping {
  const H: Array<[string, string]> = headers.map((h) => [h, norm(h)]);
  const used = new Set<string>();
  const m: Mapping = {};
  for (const stage of ["exact", "fuzzy"] as const) {
    for (const field of FIELD_ORDER) {
      if (m[field]) continue;
      for (const [h, nh] of H) {
        if (used.has(h)) continue;
        const hit =
          stage === "exact"
            ? SPEC[field].syn.includes(nh)
            : SPEC[field].syn.some((s) => nh.includes(s));
        if (hit) {
          m[field] = { header: h, how: stage };
          used.add(h);
          break;
        }
      }
    }
  }
  return m;
}

/** Classify the file from its mapping (spec §5.2). */
export function fileReport(map: Mapping): FileReport {
  const missing = FIELD_ORDER.filter((f) => SPEC[f].req && !map[f]);
  const contact = ["agent_email", "agent_phone", "owner_cell", "owner_email"].some((k) => map[k]);
  let kind: FileReport["kind"] = "incomplete";
  if (!missing.length) kind = "base";
  else if (missing.includes("home_value") && map.address && contact) kind = "enrichment";
  return { missing, contact, kind };
}
