import type { Contact, Property, Settings, Target, Underwriting } from "./types";

/**
 * The underwriting math. Transcribed exactly from the build spec (§4.3) — this
 * is the source of truth. Computes both a creative (Subject-To + seller carry)
 * offer and a cash offer for a single property.
 */
export function underwrite(r: Property, s: Settings): Underwriting {
  const value = r.home_value;
  const loan = r.loan_balance;
  const loanpmt = r.loan_payment ?? 0;
  const rent = r.monthly_rent;
  if (!value) return { creative_ok: false, cash_ok: false };

  let eq = r.equity;
  if (eq == null && loan != null) eq = value - loan; // derive equity if absent

  // guard: an MLS/asking figure below 20,000 is almost always a mismapped rent value
  const price = r.asking && r.asking > 20000 ? r.asking : value;

  // ---- creative (Subject-To + seller carry) ----
  const down = eq == null || eq < 0 ? null : Math.min((eq * s.downPct) / 100, s.downCap);
  const financed = price - (loan ?? 0) - (down ?? 0);
  const m2s = financed > 0 ? financed / s.amortMonths : 0; // monthly to seller
  const total = m2s + loanpmt;
  const passesPmt = rent != null && total <= rent + s.tolerance;
  const creative_ok =
    down != null && passesPmt && (s.requirePositiveFinanced ? financed > 0 : true);

  const industry_costs = (value * s.sellingPct) / 100;
  const net_trad = value - industry_costs - (loan ?? 0); // seller net, traditional MLS sale
  const net_crea = price - (loan ?? 0); // seller net, creative sale
  const diff = net_crea - net_trad; // ← the Seller Finance Difference

  // ---- cash ----
  const cash = (value * s.cashPct) / 100;
  const net_cash = cash - (loan ?? 0);
  const cash_ok =
    (s.requireKnownLoan ? loan != null : true) && (s.requireCashClears ? net_cash > 0 : true);

  return {
    creative_ok,
    cash_ok,
    price,
    down,
    financed: Math.max(0, financed),
    m2s,
    total,
    sub_payment: loanpmt,
    industry_costs,
    home_value: value,
    loan_balance: loan ?? 0,
    net_trad,
    net_crea,
    diff,
    cash,
    net_cash,
  };
}

/** Resolve who receives the offer for a given target mode. */
export function contactFor(r: Property, target: Target): Contact {
  if (target === "agent")
    return { name: r.agent_name, email: r.agent_email, phone: r.agent_phone, viaAgent: true };
  if (r.owner_email || r.owner_cell)
    return { name: r.owner_full, email: r.owner_email, phone: r.owner_cell, viaAgent: false };
  // fallback: no direct owner contact → route through the agent
  return { name: r.agent_name, email: r.agent_email, phone: r.agent_phone, viaAgent: true };
}
