import { formatLoiDate, formatPhone, fcS, fcT } from "./format";
import type { OfferMode, QualifiedRow, Target } from "./types";

function targetTag(target: Target): string {
  return target === "agent" ? "Direct-to-Agent" : "Direct-to-Seller";
}

function offerTag(mode: OfferMode): string {
  if (mode === "creative") return "Creative";
  if (mode === "cash") return "Cash";
  return "Cash + Creative";
}

function csvEscape(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/**
 * GHL-mapped CSV. Cash mode omits creative columns.
 * Creative/both emit the full union (cash page rides with creative).
 */
export function buildExportRows(
  rows: QualifiedRow[],
  opts: { target: Target; mode: OfferMode; date?: Date },
): Record<string, string>[] {
  const date = formatLoiDate(opts.date ?? new Date());
  const includeCreative = opts.mode !== "cash";

  return rows.map((r) => {
    const uw = r.underwrite;
    const p = r.property;
    const c = r.contact;
    const base: Record<string, string> = {
      "Contact Name": c.name ?? "",
      "Contact Email": c.email ?? "",
      "Contact Phone": formatPhone(c.phone),
      "Contact Type": c.viaAgent ? "Agent" : "Seller",
      "Contact DNC": r.dnc ? "true" : "false",
      "Listings For Contact": String(r.listingsForContact),
      City: p.city ?? "",
      State: p.state ?? "",
      "Offer Type": offerTag(opts.mode),
      Tags: `Salvo, ${targetTag(opts.target)}, ${offerTag(opts.mode)}`,
      "Pipeline Stage": "Offer Ready",
      "Owner Full Name": p.owner_full ?? "",
      Address: p.address,
      Date: date,
    };

    if (includeCreative) {
      base["Has Creative"] = uw.creative_ok ? "true" : "false";
      base.Price = fcT(uw.price);
      base["Loan Balance"] = fcT(uw.loan_balance);
      base.Down = fcT(uw.down);
      base.Financed = fcT(uw.financed);
      base.Payment = fcT(uw.m2s);
      base["Sub Payment"] = fcT(uw.sub_payment);
      base["Seller Profit Creative"] = fcT(uw.net_crea);
      base["Seller Profit Traditional"] = fcS(uw.net_trad);
      base["Seller Profit Difference"] = fcT(uw.diff);
    }

    base["Has Cash"] = uw.cash_ok ? "true" : "false";
    base["Cash Scenario"] = fcT(uw.cash);
    base["Net Cash"] = fcT(uw.net_cash);
    base["Industry Costs"] = fcT(uw.industry_costs);
    base["Home Value"] = fcT(uw.home_value);

    return base;
  });
}

export function exportColumnOrder(mode: OfferMode): string[] {
  const head = [
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
  const creative = [
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
  const cash = ["Has Cash", "Cash Scenario", "Net Cash", "Industry Costs", "Home Value"];
  return mode === "cash" ? [...head, ...cash] : [...head, ...creative, ...cash];
}

export function toCsv(rows: Record<string, string>[], mode: OfferMode): string {
  const cols = exportColumnOrder(mode);
  const lines = [cols.join(",")];
  for (const row of rows) {
    lines.push(cols.map((c) => csvEscape(row[c] ?? "")).join(","));
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
