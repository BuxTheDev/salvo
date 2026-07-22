import { fcS, fcT, fmtPhone, offerDate } from "./format";
import type { Offer, Target } from "./types";
import type { RowResult } from "./select";

const CREATIVE_COLS = [
  "Has Creative",
  "Price",
  "Loan Balance",
  "Down",
  "Financed",
  "Payment",
  "Sub Payment",
  "Seller Profit Creative",
  "Seller Profit Traditional",
  "Seller Profit Difference",
];

const BASE_HEAD = [
  "Contact Name",
  "Contact Email",
  "Contact Phone",
  "Contact Type",
  "Contact DNC",
  "Listings For Contact",
  "City",
  "State",
  "Offer Type",
  "Tags",
  "Pipeline Stage",
  "Owner Full Name",
  "Address",
  "Date",
];

const CASH_COLS = ["Has Cash", "Cash Scenario", "Net Cash", "Industry Costs", "Home Value"];

function offerTypeLabel(offer: Offer): string {
  if (offer === "creative") return "Creative";
  if (offer === "cash") return "Cash";
  return "Cash + Creative";
}

function tagsFor(target: Target, offer: Offer): string {
  const dir = target === "agent" ? "Direct-to-Agent" : "Direct-to-Seller";
  return ["Salvo", dir, offerTypeLabel(offer)].join(", ");
}

function csvCell(v: string | number | boolean | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Build the GHL-mapped CSV (§8.1). One row per selected (ready) property.
 * Cash mode emits only cash fields; creative/both emit the full union.
 */
export function toGhlCsv(rows: RowResult[], target: Target, offer: Offer): string {
  const includeCreative = offer !== "cash";
  const date = offerDate();
  const header = [...BASE_HEAD, ...(includeCreative ? CREATIVE_COLS : []), ...CASH_COLS];

  const lines: string[] = [header.map(csvCell).join(",")];

  for (const r of rows) {
    const { property: p, uw, contact } = r;
    const base: (string | number | boolean)[] = [
      contact.name ?? "",
      contact.email ?? "",
      fmtPhone(contact.phone),
      target === "agent" ? "Agent" : "Seller",
      r.dnc ? "TRUE" : "FALSE",
      r.dupCount,
      p.city ?? "",
      p.state ?? "",
      offerTypeLabel(offer),
      tagsFor(target, offer),
      "Offer Ready",
      p.owner_full ?? "",
      p.address,
      date,
    ];

    const creative = includeCreative
      ? [
          uw.creative_ok ? "TRUE" : "FALSE",
          fcT(uw.price),
          fcT(uw.loan_balance),
          fcT(uw.down),
          fcT(uw.financed),
          fcT(uw.m2s),
          fcT(uw.sub_payment),
          fcT(uw.net_crea),
          fcS(uw.net_trad),
          fcT(uw.diff),
        ]
      : [];

    const cash = [
      uw.cash_ok ? "TRUE" : "FALSE",
      fcT(uw.cash),
      fcT(uw.net_cash),
      fcT(uw.industry_costs),
      fcT(uw.home_value),
    ];

    lines.push([...base, ...creative, ...cash].map(csvCell).join(","));
  }

  return lines.join("\n");
}
