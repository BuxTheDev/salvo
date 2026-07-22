import { fcS, fcT, offerDate } from "./format";
import type { Property, Underwriting } from "./types";

/** Merge fields for the Creative LOI (§7.1). Keys match the GHL custom-field keys. */
export interface CreativeMergeFields {
  "Owner Full Name": string;
  Address: string;
  Date: string;
  Price: string;
  "Loan Balance": string;
  Down: string;
  Financed: string;
  Payment: string;
  "Sub Payment": string;
  "Seller Profit Creative": string;
  "Seller Profit Traditional": string;
  "Seller Profit Difference": string;
  "Industry Costs": string;
  "Home Value": string;
}

/** Merge fields for the Cash LOI (§7.2). */
export interface CashMergeFields {
  "Owner Full Name": string;
  Address: string;
  Date: string;
  "Cash Scenario": string;
  "Net Cash": string;
  "Industry Costs": string;
}

export function creativeMergeFields(p: Property, uw: Underwriting): CreativeMergeFields {
  return {
    "Owner Full Name": p.owner_full ?? "",
    Address: p.address,
    Date: offerDate(),
    Price: fcT(uw.price),
    "Loan Balance": fcT(uw.loan_balance),
    Down: fcT(uw.down),
    Financed: fcT(uw.financed),
    Payment: fcT(uw.m2s),
    "Sub Payment": fcT(uw.sub_payment),
    "Seller Profit Creative": fcT(uw.net_crea),
    "Seller Profit Traditional": fcS(uw.net_trad),
    "Seller Profit Difference": fcT(uw.diff),
    "Industry Costs": fcT(uw.industry_costs),
    "Home Value": fcT(uw.home_value),
  };
}

export function cashMergeFields(p: Property, uw: Underwriting): CashMergeFields {
  return {
    "Owner Full Name": p.owner_full ?? "",
    Address: p.address,
    Date: offerDate(),
    "Cash Scenario": fcT(uw.cash),
    "Net Cash": fcT(uw.net_cash),
    "Industry Costs": fcT(uw.industry_costs),
  };
}

// Hardcoded in-template constants for the Creative LOI.
export const CREATIVE_CONSTANTS = {
  buyer: "BrightPath Real Estate Solutions, LLC (and/or assigns)",
  balloon: "To be Determined (TBD)",
  interest: "Built-Into Purchase Price",
  inspectionDays: 14,
  closeDays: 30,
  emdPct: 1,
  agentCompPct: 3,
};
