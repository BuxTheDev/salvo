/** LOI merge-field contract (spec §7): underwrite result → the exact merge tags the templates use. */
import { fcS, fcT, fmtDate } from "./format";
import type { Property, UnderwriteResult } from "./types";

export const BUYER_ENTITY = "BrightPath Real Estate Solutions, LLC (and/or assigns)";

export interface LOIFields {
  ownerFullName: string;
  address: string;
  date: string;
  // creative
  price: string;
  loanBalance: string;
  down: string;
  financed: string;
  payment: string;
  subPayment: string;
  sellerProfitCreative: string;
  sellerProfitTraditional: string;
  sellerProfitDifference: string;
  // cash
  cashScenario: string;
  netCash: string;
  // shared
  industryCosts: string;
  homeValue: string;
}

/** Field → source map per §7.3. Every tag is populated; fcT renders "TBD" for unknowns. */
export function loiFields(r: Property, u: UnderwriteResult): LOIFields {
  const fullAddress = [r.address, r.city, r.state, r.zip].filter(Boolean).join(", ");
  return {
    ownerFullName: r.owner_full || "Owner of Record",
    address: fullAddress,
    date: fmtDate(),
    price: fcT(u.price),
    loanBalance: fcT(u.loan_balance),
    down: fcT(u.down),
    financed: fcT(u.financed),
    payment: fcT(u.m2s),
    subPayment: fcT(u.sub_payment),
    sellerProfitCreative: fcT(u.net_crea),
    sellerProfitTraditional: fcS(u.net_trad),
    sellerProfitDifference: fcT(u.diff),
    cashScenario: fcT(u.cash),
    netCash: fcT(u.net_cash),
    industryCosts: fcT(u.industry_costs),
    homeValue: fcT(u.home_value),
  };
}
