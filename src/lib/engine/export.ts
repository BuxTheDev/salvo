import { contactFor } from "./contact";
import { fcS, fcT, formatDate, formatPhone } from "./format";
import type { OfferMode, Property, Settings, Target, UnderwriteResult } from "./types";
import { underwrite } from "./underwrite";

function targetLabel(target: Target): string {
  return target === "agent" ? "Direct-to-Agent" : "Direct-to-Seller";
}

function offerLabel(mode: OfferMode): string {
  if (mode === "creative") return "Creative";
  if (mode === "cash") return "Cash";
  return "Cash + Creative";
}

function contactType(target: Target, viaAgent: boolean): string {
  if (target === "agent" || viaAgent) return "Agent";
  return "Seller";
}

export function buildExportRows(
  properties: Property[],
  settings: Settings,
  target: Target,
  mode: OfferMode,
  selectedAddresses?: Set<string>
): Record<string, string>[] {
  const rows: Record<string, string>[] = [];

  const emailCounts = new Map<string, number>();
  for (const prop of properties) {
    const contact = contactFor(prop, target);
    const email = contact.email?.toLowerCase().trim();
    if (email) emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
  }

  for (const prop of properties) {
    if (selectedAddresses && !selectedAddresses.has(prop.address)) continue;

    const result = underwrite(prop, settings);
    if (!("diff" in result)) continue;

    const ready =
      mode === "creative"
        ? result.creative_ok
        : mode === "cash"
          ? result.cash_ok
          : result.creative_ok || result.cash_ok;
    if (!ready) continue;

    const contact = contactFor(prop, target);
    const email = contact.email?.toLowerCase().trim() ?? "";
    const contactDnc =
      prop.owner_dnc && !contact.viaAgent && !contact.email ? "true" : "false";

    const row: Record<string, string> = {
      "Contact Name": contact.name ?? "",
      "Contact Email": contact.email ?? "",
      "Contact Phone": formatPhone(contact.phone),
      "Contact Type": contactType(target, contact.viaAgent),
      "Contact DNC": contactDnc,
      "Listings For Contact": email ? String(emailCounts.get(email) ?? 1) : "1",
      City: prop.city ?? "",
      State: prop.state ?? "",
      "Offer Type": offerLabel(mode),
      Tags: `Salvo, ${targetLabel(target)}, ${offerLabel(mode)}`,
      "Pipeline Stage": "Offer Ready",
      "Owner Full Name": prop.owner_full ?? "",
      Address: prop.address,
      Date: formatDate(),
      "Has Cash": result.cash_ok ? "true" : "false",
      "Cash Scenario": fcT(result.cash),
      "Net Cash": fcT(result.net_cash),
      "Industry Costs": fcT(result.industry_costs),
      "Home Value": fcT(result.home_value),
    };

    if (mode === "creative" || mode === "both") {
      row["Has Creative"] = result.creative_ok ? "true" : "false";
      row.Price = fcT(result.price);
      row["Loan Balance"] = fcT(result.loan_balance);
      row.Down = fcT(result.down);
      row.Financed = fcT(result.financed);
      row.Payment = fcT(result.m2s);
      row["Sub Payment"] = fcT(result.sub_payment);
      row["Seller Profit Creative"] = fcT(result.net_crea);
      row["Seller Profit Traditional"] = fcS(result.net_trad);
      row["Seller Profit Difference"] = fcT(result.diff);
    }

    rows.push(row);
  }

  return rows;
}

export const EXPORT_HEADERS_CREATIVE = [
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
  "Has Cash",
  "Cash Scenario",
  "Net Cash",
  "Industry Costs",
  "Home Value",
];

export const EXPORT_HEADERS_CASH = [
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
  "Has Cash",
  "Cash Scenario",
  "Net Cash",
  "Industry Costs",
  "Home Value",
];

export function exportToCsv(
  properties: Property[],
  settings: Settings,
  target: Target,
  mode: OfferMode,
  selectedAddresses?: Set<string>
): string {
  const rows = buildExportRows(properties, settings, target, mode, selectedAddresses);
  const headers = mode === "cash" ? EXPORT_HEADERS_CASH : EXPORT_HEADERS_CREATIVE;

  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

export function getMergeFields(
  prop: Property,
  result: UnderwriteResult
): Record<string, string> {
  return {
    "Owner Full Name": prop.owner_full ?? "",
    Address: prop.address,
    Date: formatDate(),
    Price: fcT(result.price),
    "Loan Balance": fcT(result.loan_balance),
    Down: fcT(result.down),
    Financed: fcT(result.financed),
    Payment: fcT(result.m2s),
    "Sub Payment": fcT(result.sub_payment),
    "Seller Profit Creative": fcT(result.net_crea),
    "Seller Profit Traditional": fcS(result.net_trad),
    "Seller Profit Difference": fcT(result.diff),
    "Industry Costs": fcT(result.industry_costs),
    "Home Value": fcT(result.home_value),
    "Cash Scenario": fcT(result.cash),
    "Net Cash": fcT(result.net_cash),
  };
}
