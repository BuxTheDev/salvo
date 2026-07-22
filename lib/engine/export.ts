import Papa from "papaparse";
import { fcS, fcT, formatPhone, todayLong } from "./format";
import { listingsForContact, type RowWithContact } from "./modes";
import type { Offer, Target } from "./types";

export interface ExportRow extends RowWithContact {
  dnc: boolean;
}

export function offerLabel(offer: Offer): string {
  if (offer === "creative") return "Creative";
  if (offer === "cash") return "Cash";
  return "Cash + Creative";
}

export function targetLabel(target: Target): string {
  return target === "agent" ? "Direct-to-Agent" : "Direct-to-Seller";
}

function rowOfferLabel(row: ExportRow): string {
  const hasCreative = row.underwrite.creative_ok;
  const hasCash = row.underwrite.cash_ok;
  if (hasCreative && hasCash) return "Cash + Creative";
  if (hasCreative) return "Creative";
  if (hasCash) return "Cash";
  return "";
}

/**
 * §8.1 — GHL-mapped CSV. One row per selected property. Cash mode emits only
 * cash fields; creative/both emit the full union (the cash page rides along
 * with creative).
 */
export function buildExportRows(
  rows: ExportRow[],
  target: Target,
  offer: Offer,
): Record<string, string>[] {
  const groups = new Map<string, ExportRow[]>();
  for (const row of rows) {
    const key = row.contact.email?.trim().toLowerCase();
    if (!key) continue;
    const g = groups.get(key) ?? [];
    g.push(row);
    groups.set(key, g);
  }

  const date = todayLong();
  const includeCreative = offer === "creative" || offer === "both";

  return rows.map((row) => {
    const { property: p, underwrite: u, contact, dnc } = row;

    const base: Record<string, string> = {
      "Contact Name": contact.name ?? "",
      "Contact Email": contact.email ?? "",
      "Contact Phone": formatPhone(contact.phone),
      "Contact Type": contact.viaAgent ? "Agent" : "Owner",
      "Contact DNC": dnc ? "Yes" : "No",
      "Listings For Contact": String(listingsForContact(row, groups)),
      City: p.city ?? "",
      State: p.state ?? "",
      "Offer Type": rowOfferLabel(row) || offerLabel(offer),
      Tags: `Salvo, ${targetLabel(target)}, ${rowOfferLabel(row) || offerLabel(offer)}`,
      "Pipeline Stage": "Offer Ready",
      "Owner Full Name": p.owner_full ?? "",
      Address: p.address,
      Date: date,
    };

    if (includeCreative) {
      base["Has Creative"] = u.creative_ok ? "Yes" : "No";
      base["Price"] = fcT(u.price);
      base["Loan Balance"] = fcT(u.loan_balance);
      base["Down"] = fcT(u.down);
      base["Financed"] = fcT(u.financed);
      base["Payment"] = fcT(u.m2s);
      base["Sub Payment"] = fcT(u.sub_payment);
      base["Seller Profit Creative"] = fcT(u.net_crea);
      base["Seller Profit Traditional"] = fcS(u.net_trad);
      base["Seller Profit Difference"] = fcT(u.diff);
    }

    base["Has Cash"] = u.cash_ok ? "Yes" : "No";
    base["Cash Scenario"] = fcT(u.cash);
    base["Net Cash"] = fcT(u.net_cash);
    base["Industry Costs"] = fcT(u.industry_costs);
    base["Home Value"] = fcT(u.home_value);

    return base;
  });
}

const CREATIVE_COLUMNS = [
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

const BASE_COLUMNS = [
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

const CASH_COLUMNS = ["Has Cash", "Cash Scenario", "Net Cash", "Industry Costs", "Home Value"];

export function exportColumns(offer: Offer): string[] {
  const includeCreative = offer === "creative" || offer === "both";
  return [...BASE_COLUMNS, ...(includeCreative ? CREATIVE_COLUMNS : []), ...CASH_COLUMNS];
}

export function exportCsv(rows: ExportRow[], target: Target, offer: Offer): string {
  const data = buildExportRows(rows, target, offer);
  const columns = exportColumns(offer);
  return Papa.unparse({ fields: columns, data: data.map((d) => columns.map((c) => d[c] ?? "")) });
}
