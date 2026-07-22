/** The underwriting engine (spec §4). Pure, framework-free — runs identically in browser and edge. */
import type { Contact, Property, Target, UnderwriteResult } from "./types";

export interface Settings {
  /** down payment = this % of equity… */
  downPct: number;
  /** …capped here */
  downCap: number;
  /** straight (0% interest) seller-carry amortization, months */
  amortMonths: number;
  /** creative qualifies if total monthly <= rent + tolerance */
  tolerance: number;
  /** "industry" selling cost the seller avoids, % of value */
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

/** Creative (Subject-To + seller carry) and cash offers per row (spec §4.3 — exact transcription). */
export function underwrite(r: Property, s: Settings): UnderwriteResult {
  const value = r.home_value, loan = r.loan_balance, loanpmt = r.loan_payment ?? 0;
  const rent = r.monthly_rent;
  if (!value) return { creative_ok: false, cash_ok: false };

  let eq = r.equity;
  if (eq == null && loan != null) eq = value - loan;      // derive equity if absent

  // guard: an MLS/asking figure below 20,000 is almost always a mismapped rent value
  const price = (r.asking && r.asking > 20000) ? r.asking : value;

  // ---- creative (Subject-To + seller carry) ----
  const down = (eq == null || eq < 0) ? null : Math.min(eq * s.downPct / 100, s.downCap);
  const financed = price - (loan ?? 0) - (down ?? 0);
  const m2s = financed > 0 ? financed / s.amortMonths : 0;   // monthly to seller
  const total = m2s + loanpmt;
  const passesPmt = rent != null && total <= rent + s.tolerance;
  const creative_ok = down != null && passesPmt &&
                      (s.requirePositiveFinanced ? financed > 0 : true);

  const industry_costs = value * s.sellingPct / 100;
  const net_trad = value - industry_costs - (loan ?? 0);     // seller net, traditional MLS sale
  const net_crea = price - (loan ?? 0);                      // seller net, creative sale
  const diff = net_crea - net_trad;                          // ← the Seller Finance Difference

  // ---- cash ----
  const cash = value * s.cashPct / 100;
  const net_cash = cash - (loan ?? 0);
  const cash_ok = (s.requireKnownLoan ? loan != null : true) &&
                  (s.requireCashClears ? net_cash > 0 : true);

  return { creative_ok, cash_ok, price, down, financed: Math.max(0, financed), m2s, total,
           sub_payment: loanpmt, industry_costs, home_value: value, loan_balance: loan ?? 0,
           net_trad, net_crea, diff, cash, net_cash };
}

/** Resolve who the LOI goes to (spec §4.5). Direct-to-Seller falls back to the agent. */
export function contactFor(r: Property, target: Target): Contact {
  if (target === "agent")
    return { name: r.agent_name, email: r.agent_email, phone: r.agent_phone, viaAgent: true };
  if (r.owner_email || r.owner_cell)
    return { name: r.owner_full, email: r.owner_email, phone: r.owner_cell, viaAgent: false };
  return { name: r.agent_name, email: r.agent_email, phone: r.agent_phone, viaAgent: true };
}
