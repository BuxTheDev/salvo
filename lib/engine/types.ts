// Core types for the Salvo underwriting engine.
// Kept framework-free so this module runs identically in the browser and in
// a server / Edge Function context.

export interface Settings {
  /** down payment = this % of equity... */
  downPct: number;
  /** ...capped here */
  downCap: number;
  /** straight (0% interest) seller-carry amortization, in months */
  amortMonths: number;
  /** creative qualifies if total monthly <= rent + tolerance */
  tolerance: number;
  /** "industry" selling cost the seller avoids, as a % of home value */
  sellingPct: number;
  /** cash offer as % of home value */
  cashPct: number;
  /** skip degenerate creatives (financed <= 0) */
  requirePositiveFinanced: boolean;
  /** cash offer must clear the loan (net_cash > 0) */
  requireCashClears: boolean;
  /** cash needs a known loan balance (skip blank-loan rows) */
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

/** Normalized property — the engine's canonical input shape. */
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
  /** raw source row, kept for audit / re-mapping */
  raw?: Record<string, unknown>;
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
export type Offer = "creative" | "cash" | "both";

export interface Contact {
  name?: string;
  email?: string;
  phone?: string;
  viaAgent: boolean;
}
