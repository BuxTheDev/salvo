import { fcS, fcT, formatPhone } from "./format";
import { contactFor } from "./underwrite";
import {
  OfferMode,
  Property,
  Settings,
  Target,
  Underwriting,
} from "./types";
import { underwrite } from "./underwrite";

export interface ExportRow {
  property: Property;
  result?: Underwriting;
}

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

const CASH_COLUMNS = [
  "Has Cash",
  "Cash Scenario",
  "Net Cash",
  "Industry Costs",
  "Home Value",
];

export function exportColumns(mode: OfferMode): string[] {
  return [
    ...BASE_COLUMNS,
    ...(mode === "cash" ? [] : CREATIVE_COLUMNS),
    ...CASH_COLUMNS,
  ];
}

function isoDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}

function offerType(mode: OfferMode): string {
  if (mode === "both") return "Cash + Creative";
  return mode === "cash" ? "Cash" : "Creative";
}

export function buildExportRecords(
  rows: ExportRow[],
  settings: Settings,
  mode: OfferMode,
  target: Target,
  date = new Date(),
): Record<string, string | boolean | number>[] {
  const resolved = rows.map(({ property, result }) => ({
    property,
    result: result ?? underwrite(property, settings),
    contact: contactFor(property, target),
  }));
  const contactCounts = new Map<string, number>();
  for (const row of resolved) {
    const key = row.contact.email?.toLowerCase();
    if (key) contactCounts.set(key, (contactCounts.get(key) ?? 0) + 1);
  }

  return resolved.map(({ property, result, contact }) => {
    const type = offerType(mode);
    const record: Record<string, string | boolean | number> = {
      "Contact Name": contact.name ?? "",
      "Contact Email": contact.email ?? "",
      "Contact Phone": formatPhone(contact.phone),
      "Contact Type": contact.viaAgent ? "Agent" : "Seller",
      "Contact DNC": contact.dnc,
      "Listings For Contact": contact.email
        ? (contactCounts.get(contact.email.toLowerCase()) ?? 1)
        : 1,
      City: property.city ?? "",
      State: property.state ?? "",
      "Offer Type": type,
      Tags: `Salvo, ${target === "agent" ? "Direct-to-Agent" : "Direct-to-Seller"}, ${type}`,
      "Pipeline Stage": "Offer Ready",
      "Owner Full Name": property.owner_full ?? "",
      Address: property.address,
      Date: isoDate(date),
    };
    if (mode !== "cash") {
      Object.assign(record, {
        "Has Creative": result.creative_ok,
        Price: fcT(result.price),
        "Loan Balance": fcT(result.loan_balance),
        Down: fcT(result.down),
        Financed: fcT(result.financed),
        Payment: fcT(result.m2s),
        "Sub Payment": fcT(result.sub_payment),
        "Seller Profit Creative": fcT(result.net_crea),
        "Seller Profit Traditional": fcS(result.net_trad),
        "Seller Profit Difference": fcT(result.diff),
      });
    }
    Object.assign(record, {
      "Has Cash": result.cash_ok,
      "Cash Scenario": fcT(result.cash),
      "Net Cash": fcT(result.net_cash),
      "Industry Costs": fcT(result.industry_costs),
      "Home Value": fcT(result.home_value),
    });
    return record;
  });
}

function csvCell(value: string | boolean | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(
  records: Record<string, string | boolean | number>[],
  columns: string[],
): string {
  return [
    columns.map(csvCell).join(","),
    ...records.map((record) => columns.map((column) => csvCell(record[column] ?? "")).join(",")),
  ].join("\r\n");
}
