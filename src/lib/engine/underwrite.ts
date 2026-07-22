import { Contact, Property, Settings, Target, Underwrite } from "./types";

export function underwrite(r: Property, s: Settings): Underwrite {
  const value = r.home_value, loan = r.loan_balance, loanpmt = r.loan_payment ?? 0;
  const rent = r.monthly_rent;
  if (!value) return { creative_ok: false, cash_ok: false };
  let eq = r.equity;
  if (eq == null && loan != null) eq = value - loan;
  const price = r.asking && r.asking > 20000 ? r.asking : value;
  const down = eq == null || eq < 0 ? null : Math.min(eq * s.downPct / 100, s.downCap);
  const financed = price - (loan ?? 0) - (down ?? 0);
  const m2s = financed > 0 ? financed / s.amortMonths : 0;
  const total = m2s + loanpmt;
  const passesPmt = rent != null && total <= rent + s.tolerance;
  const creative_ok = down != null && passesPmt && (!s.requirePositiveFinanced || financed > 0);
  const industry_costs = value * s.sellingPct / 100;
  const net_trad = value - industry_costs - (loan ?? 0);
  const net_crea = price - (loan ?? 0);
  const diff = net_crea - net_trad;
  const cash = value * s.cashPct / 100;
  const net_cash = cash - (loan ?? 0);
  const cash_ok = (!s.requireKnownLoan || loan != null) && (!s.requireCashClears || net_cash > 0);
  return { creative_ok, cash_ok, price, down, financed: Math.max(0, financed), m2s, total,
    sub_payment: loanpmt, industry_costs, home_value: value, loan_balance: loan ?? 0,
    net_trad, net_crea, diff, cash, net_cash };
}

export function contactFor(r: Property, target: Target): Contact {
  if (target === "agent") return { name: r.agent_name, email: r.agent_email, phone: r.agent_phone, viaAgent: true, dnc: false };
  if (r.owner_email || r.owner_cell) return { name: r.owner_full, email: r.owner_email, phone: r.owner_cell, viaAgent: false, dnc: Boolean(r.owner_dnc) };
  return { name: r.agent_name, email: r.agent_email, phone: r.agent_phone, viaAgent: true, dnc: false };
}

export function qualifies(v: Underwrite, mode: "creative" | "cash" | "both") {
  return mode === "creative" ? v.creative_ok : mode === "cash" ? v.cash_ok : v.creative_ok || v.cash_ok;
}
