import { fcS, fcT, phone, today } from "./format";
import { contactFor, underwrite } from "./underwrite";
import { OfferMode, Property, Settings, Target } from "./types";

export function exportRows(properties: Property[], settings: Settings, target: Target, mode: OfferMode) {
  const contacts = properties.map(p => contactFor(p, target));
  const emailCounts = contacts.reduce<Record<string, number>>((a, c) => { if (c.email) a[c.email.toLowerCase()] = (a[c.email.toLowerCase()] ?? 0) + 1; return a; }, {});
  return properties.map((p, index) => {
    const v = underwrite(p, settings), c = contacts[index], creative = mode !== "cash", cash = mode !== "creative";
    const offer = mode === "both" ? "Cash + Creative" : mode === "cash" ? "Cash" : "Creative";
    const row: Record<string, string | boolean | number> = {
      "Contact Name": c.name ?? "", "Contact Email": c.email ?? "", "Contact Phone": phone(c.phone),
      "Contact Type": c.viaAgent ? "Direct-to-Agent" : "Direct-to-Seller", "Contact DNC": c.dnc,
      "Listings For Contact": c.email ? emailCounts[c.email.toLowerCase()] ?? 1 : 1,
      City: p.city ?? "", State: p.state ?? "", "Offer Type": offer,
      Tags: `Salvo, ${c.viaAgent ? "Direct-to-Agent" : "Direct-to-Seller"}, ${offer}`,
      "Pipeline Stage": "Offer Ready", "Owner Full Name": p.owner_full ?? "", Address: p.address, Date: today(),
    };
    if (creative) Object.assign(row, { "Has Creative": v.creative_ok, Price: fcT(v.price), "Loan Balance": fcT(v.loan_balance),
      Down: fcT(v.down), Financed: fcT(v.financed), Payment: fcT(v.m2s), "Sub Payment": fcT(v.sub_payment),
      "Seller Profit Creative": fcT(v.net_crea), "Seller Profit Traditional": fcS(v.net_trad), "Seller Profit Difference": fcT(v.diff) });
    Object.assign(row, { "Has Cash": cash && v.cash_ok, "Cash Scenario": fcT(v.cash), "Net Cash": fcT(v.net_cash),
      "Industry Costs": fcT(v.industry_costs), "Home Value": fcT(v.home_value) });
    return row;
  });
}

export function toCsv(rows: Record<string, string | boolean | number>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]), quote = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.map(quote).join(","), ...rows.map(row => headers.map(h => quote(row[h])).join(","))].join("\n");
}
