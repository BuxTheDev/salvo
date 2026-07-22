/** Salvo engine types — framework-free, shared by browser + edge. */

export interface Settings {
  downPct: number;
  downCap: number;
  amortMonths: number;
  tolerance: number;
  sellingPct: number;
  cashPct: number;
  requirePositiveFinanced: boolean;
  requireCashClears: boolean;
  requireKnownLoan: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  downPct: 50,
  downCap: 30000,
  amortMonths: 360,
  tolerance: 200,
  sellingPct: 12,
  cashPct: 80,
  requirePositiveFinanced: true,
  requireCashClears: true,
  requireKnownLoan: false,
};

export interface Property {
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  home_value: number;
  loan_balance?: number;
  equity?: number;
  monthly_rent?: number;
  loan_payment?: number;
  asking?: number;
  owner_full?: string;
  owner_first?: string;
  owner_last?: string;
  agent_name?: string;
  agent_email?: string;
  agent_phone?: string;
  owner_cell?: string;
  owner_email?: string;
  owner_dnc?: boolean;
}

export interface UnderwriteResult {
  creative_ok: boolean;
  cash_ok: boolean;
  price?: number;
  down?: number | null;
  financed?: number;
  m2s?: number;
  total?: number;
  sub_payment?: number;
  industry_costs?: number;
  home_value?: number;
  loan_balance?: number;
  net_trad?: number;
  net_crea?: number;
  diff?: number;
  cash?: number;
  net_cash?: number;
}

export type Target = "agent" | "seller";
export type OfferMode = "creative" | "cash" | "both";

export type FieldKey =
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

export type MapConfidence = "auto" | "guess" | "set" | "none";

export interface FieldMapping {
  header: string | null;
  confidence: MapConfidence;
}

export type Mapping = Record<FieldKey, FieldMapping>;

export type FileKind = "base" | "enrichment" | "incomplete";

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  viaAgent: boolean;
}

export interface QualifiedRow {
  property: Property;
  underwrite: UnderwriteResult;
  contact: ContactInfo;
  ready: boolean;
  reachable: boolean;
  dnc: boolean;
  sortKey: number;
  listingsForContact: number;
  offerLabels: ("CR" | "CA")[];
}
