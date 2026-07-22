/** GHL-mapped CSV export (spec §8.1). Column names ARE the GHL merge-field contract. */
import { fcS, fcT, fmtDate, fmtPhone } from "./format";
import type { Offer, ScoredRow, Target } from "./types";
import { isDncFlagged } from "./score";

export const TARGETS: Record<Target, string> = { agent: "Agent", seller: "Seller" };
export const OFFERS: Record<Offer, string> = { creative: "Creative", cash: "Cash", both: "Cash + Creative" };
export const TARGET_LABEL: Record<Target, string> = { agent: "Direct-to-Agent", seller: "Direct-to-Seller" };

export type ExportRow = Record<string, string | number>;

/**
 * One export row per selected property. Cash mode emits only cash fields;
 * creative/both emit the full union (the cash page rides along with creative).
 */
export function buildExportRow(x: ScoredRow, target: Target, offer: Offer, dupCount: number): ExportRow {
  const { r, u, creativeOK, cashOK, contact } = x;
  const meta: ExportRow = {
    "Contact Name": contact.name || "",
    "Contact Email": contact.email || "",
    "Contact Phone": fmtPhone(contact.phone),
    "Contact Type": contact.viaAgent ? "Listing Agent" : "Owner",
    "Contact DNC": isDncFlagged(x) ? "true" : "false",
    "Listings For Contact": dupCount,
    "City": r.city || "",
    "State": r.state || "",
    "Offer Type": OFFERS[offer],
    "Tags": `Salvo, ${TARGET_LABEL[target]}, ${OFFERS[offer]}`,
    "Pipeline Stage": "Offer Ready",
    "Owner Full Name": r.owner_full || "",
    "Address": r.address || "",
    "Date": fmtDate(),
  };
  const crea: ExportRow = {
    "Has Creative": creativeOK ? "true" : "false",
    "Price": fcT(u.price),
    "Loan Balance": fcT(u.loan_balance),
    "Down": fcT(u.down),
    "Financed": fcT(u.financed),
    "Payment": fcT(u.m2s),
    "Sub Payment": fcT(u.sub_payment),
    "Seller Profit Creative": fcT(u.net_crea),
    "Seller Profit Traditional": fcS(u.net_trad),
    "Seller Profit Difference": fcT(u.diff),
  };
  const cash: ExportRow = {
    "Has Cash": cashOK ? "true" : "false",
    "Cash Scenario": fcT(u.cash),
    "Net Cash": fcT(u.net_cash),
  };
  const shared: ExportRow = {
    "Industry Costs": fcT(u.industry_costs),
    "Home Value": fcT(u.home_value),
  };
  if (offer === "cash") return { ...meta, ...cash, ...shared };
  return { ...meta, ...crea, ...cash, ...shared };
}

/** Serialize rows to CSV, preserving first-seen key order across the union of rows. */
export function toCSV(rows: ExportRow[]): string {
  const keys: string[] = [];
  rows.forEach((o) => Object.keys(o).forEach((k) => { if (!keys.includes(k)) keys.push(k); }));
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [keys.join(","), ...rows.map((o) => keys.map((k) => esc(o[k])).join(","))].join("\n");
}
