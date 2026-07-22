import {
  Contact,
  OfferMode,
  Property,
  Settings,
  Target,
  Underwriting,
} from "./types";

export function underwrite(r: Property, s: Settings): Underwriting {
  const value = r.home_value;
  const loan = r.loan_balance;
  const loanpmt = r.loan_payment ?? 0;
  const rent = r.monthly_rent;

  if (!value) return { creative_ok: false, cash_ok: false };

  let eq = r.equity;
  if (eq == null && loan != null) eq = value - loan;

  const price = r.asking && r.asking > 20_000 ? r.asking : value;
  const down =
    eq == null || eq < 0 ? null : Math.min((eq * s.downPct) / 100, s.downCap);
  const financed = price - (loan ?? 0) - (down ?? 0);
  const m2s = financed > 0 ? financed / s.amortMonths : 0;
  const total = m2s + loanpmt;
  const passesPmt = rent != null && total <= rent + s.tolerance;
  const creative_ok =
    down != null &&
    passesPmt &&
    (s.requirePositiveFinanced ? financed > 0 : true);

  const industry_costs = (value * s.sellingPct) / 100;
  const net_trad = value - industry_costs - (loan ?? 0);
  const net_crea = price - (loan ?? 0);
  const diff = net_crea - net_trad;

  const cash = (value * s.cashPct) / 100;
  const net_cash = cash - (loan ?? 0);
  const cash_ok =
    (s.requireKnownLoan ? loan != null : true) &&
    (s.requireCashClears ? net_cash > 0 : true);

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

export function contactFor(r: Property, target: Target): Contact {
  if (target === "agent") {
    return {
      name: r.agent_name,
      email: r.agent_email,
      phone: r.agent_phone,
      viaAgent: true,
      dnc: false,
    };
  }
  if (r.owner_email || r.owner_cell) {
    return {
      name: r.owner_full,
      email: r.owner_email,
      phone: r.owner_cell,
      viaAgent: false,
      dnc: Boolean(r.owner_dnc),
    };
  }
  return {
    name: r.agent_name,
    email: r.agent_email,
    phone: r.agent_phone,
    viaAgent: true,
    dnc: false,
  };
}

export function isReady(result: Underwriting, mode: OfferMode): boolean {
  if (mode === "creative") return result.creative_ok;
  if (mode === "cash") return result.cash_ok;
  return result.creative_ok || result.cash_ok;
}

export function sortValue(result: Underwriting, mode: OfferMode): number {
  if (mode === "creative") return result.diff ?? Number.NEGATIVE_INFINITY;
  if (mode === "cash") return result.net_cash ?? Number.NEGATIVE_INFINITY;
  return Math.max(
    result.creative_ok ? (result.diff ?? Number.NEGATIVE_INFINITY) : Number.NEGATIVE_INFINITY,
    result.cash_ok ? (result.net_cash ?? Number.NEGATIVE_INFINITY) : Number.NEGATIVE_INFINITY,
  );
}

export function isReachable(contact: Contact): boolean {
  return Boolean(contact.email || (contact.phone && !(contact.dnc && !contact.viaAgent)));
}
