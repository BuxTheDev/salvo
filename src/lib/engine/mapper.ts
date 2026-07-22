import { Property } from "./types";

export const FIELDS = [
  ["address", true, ["propertyaddress", "siteaddress", "situsaddress", "inputpropertyaddress", "sitemail", "streetaddress", "address", "street"]],
  ["city", false, ["sitecity", "inputpropertycity", "city"]], ["state", false, ["sitestate", "inputpropertystate", "state"]],
  ["zip", false, ["sitezip", "inputpropertyzip", "zipcode", "zip", "postal"]],
  ["owner_full", false, ["ownerfullname", "ownersfullname", "ownername"]], ["owner_first", false, ["owner1firstname", "ownerfirstname", "ownerfirst", "firstname"]],
  ["owner_last", false, ["owner1lastname", "ownerlastname", "ownerlast", "lastname"]],
  ["home_value", true, ["estimatedmarketvalue", "estmarketvalue", "estimatedvalue", "estvalue", "marketvalue", "homevalue", "emv", "avm", "arv"]],
  ["loan_balance", false, ["remainingbalanceofopenloans", "estimatedloanbalance", "estloanbalance", "loanbalance", "mortgagebalance", "openloans", "elv"]],
  ["equity", false, ["estimatedequity", "estequity", "equity", "eev"]], ["monthly_rent", false, ["monthlyrent", "marketrent", "rentestimate", "estrent"]],
  ["loan_payment", false, ["esttotalmonthlypayments", "totalmonthlypayments", "loanpayment", "monthlypayment", "piti"]],
  ["asking", false, ["mlsamount", "askingprice", "listprice", "listingprice", "mlsprice"]],
  ["agent_name", false, ["mlsagentname", "listingagentname", "agentname"]], ["agent_email", false, ["mlsagentemail", "listingagentemail", "agentemail"]],
  ["agent_phone", false, ["mlsagentphone", "listingagentphone", "agentphone"]],
  ["owner_cell", false, ["phone1number", "phone1", "cellphone", "ownerphone", "phonenumber", "mobile", "phone", "cell"]],
  ["owner_email", false, ["email1", "owneremail", "emailaddress", "email"]],
] as const;

export type MapStatus = "auto" | "guess" | "set";
export type FieldMap = Record<string, { header: string; status: MapStatus } | undefined>;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function smartMap(headers: string[]): FieldMap {
  const result: FieldMap = {}, used = new Set<string>();
  for (const fuzzy of [false, true]) for (const [field, , synonyms] of FIELDS) {
    const match = headers.find(h => !used.has(h) && synonyms.some(s => fuzzy ? norm(h).includes(s) : norm(h) === s));
    if (match) { result[field] = { header: match, status: fuzzy ? "guess" : "auto" }; used.add(match); }
  }
  return result;
}

const numeric = new Set(["home_value", "loan_balance", "equity", "monthly_rent", "loan_payment", "asking"]);
const number = (x: unknown) => {
  const value = Number(String(x ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(value) ? value : undefined;
};

export function normalizeWithMap(rows: Record<string, unknown>[], map: FieldMap): Property[] {
  return rows.map(row => {
    const item: Record<string, unknown> = {};
    for (const [field] of FIELDS) {
      const header = map[field]?.header;
      if (header) item[field] = numeric.has(field) ? number(row[header]) : String(row[header] ?? "").trim() || undefined;
    }
    if (!item.owner_full) item.owner_full = [item.owner_first, item.owner_last].filter(Boolean).join(" ") || undefined;
    return item as unknown as Property;
  }).filter(row => Boolean(row.address));
}

export function classify(map: FieldMap) {
  const missing = FIELDS.filter(([field, required]) => required && !map[field]).map(([field]) => field);
  const hasContact = ["agent_email", "agent_phone", "owner_cell", "owner_email"].some(field => map[field]);
  return { missing, kind: !missing.length ? "base" : missing.includes("home_value") && Boolean(map.address) && hasContact ? "enrichment" : "incomplete" };
}
