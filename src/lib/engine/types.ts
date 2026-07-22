// Salvo engine — shared types. Framework-free so this runs identically in the
// browser (live preview) and in a server/edge context (batch imports).

export interface Settings {
  downPct: number; // 50   — down payment = this % of equity...
  downCap: number; // 30000 — ...capped here
  amortMonths: number; // 360  — straight (0% interest) seller-carry amortization
  tolerance: number; // 200  — creative qualifies if total monthly <= rent + tolerance
  sellingPct: number; // 12   — "industry" selling cost the seller avoids
  cashPct: number; // 80   — cash offer as % of home value
  requirePositiveFinanced: boolean; // true — skip degenerate creatives (financed <= 0)
  requireCashClears: boolean; // true — cash offer must clear the loan (net_cash > 0)
  requireKnownLoan: boolean; // false — cash needs a known loan balance
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
  raw?: Record<string, string>;
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

export type Target = "agent" | "seller";
export type Offer = "creative" | "cash" | "both";

export interface Contact {
  name?: string;
  email?: string;
  phone?: string;
  viaAgent: boolean;
}

// Canonical, mappable field keys.
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
