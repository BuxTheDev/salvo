export type Target = "agent" | "seller";
export type OfferMode = "creative" | "cash" | "both";

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
  downCap: 30_000,
  amortMonths: 360,
  tolerance: 200,
  sellingPct: 12,
  cashPct: 80,
  requirePositiveFinanced: true,
  requireCashClears: true,
  requireKnownLoan: false,
};

export interface Property {
  id?: string;
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

export interface Underwriting {
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

export type CanonicalField = Exclude<keyof Property, "id" | "owner_dnc">;
export type MappingMethod = "exact" | "fuzzy" | "manual";
export interface FieldMapping {
  header: string;
  method: MappingMethod;
}
export type Mapping = Partial<Record<CanonicalField, FieldMapping>>;

export interface Contact {
  name?: string;
  email?: string;
  phone?: string;
  viaAgent: boolean;
  dnc: boolean;
}
