import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { exportColumns, exportCsv, type ExportRow } from "./export";
import type { Property, UnderwriteResult } from "./types";

const property: Property = {
  address: "123 Main St",
  city: "Phoenix",
  state: "AZ",
  home_value: 200000,
  owner_full: "Jane Owner",
};

const underwrite: UnderwriteResult = {
  creative_ok: true,
  cash_ok: true,
  price: 200000,
  down: 30000,
  financed: 70000,
  m2s: 194.44,
  total: 894.44,
  sub_payment: 700,
  industry_costs: 24000,
  home_value: 200000,
  loan_balance: 100000,
  net_trad: 76000,
  net_crea: 100000,
  diff: 24000,
  cash: 160000,
  net_cash: 60000,
};

function makeRow(overrides: Partial<ExportRow> = {}): ExportRow {
  return {
    property,
    underwrite,
    contact: { name: "Jane Owner", email: "jane@owner.com", phone: "5551234567", viaAgent: false },
    dnc: false,
    ...overrides,
  };
}

describe("exportColumns", () => {
  it("includes creative columns for creative and both modes but not cash-only", () => {
    expect(exportColumns("creative")).toContain("Seller Profit Difference");
    expect(exportColumns("both")).toContain("Seller Profit Difference");
    expect(exportColumns("cash")).not.toContain("Seller Profit Difference");
  });

  it("always includes the cash union columns", () => {
    for (const offer of ["creative", "cash", "both"] as const) {
      expect(exportColumns(offer)).toContain("Net Cash");
      expect(exportColumns(offer)).toContain("Home Value");
    }
  });
});

describe("exportCsv", () => {
  it("normalizes phone numbers to XXX-XXX-XXXX", () => {
    const csv = exportCsv([makeRow()], "seller", "creative");
    const parsed = Papa.parse<string[]>(csv);
    const [header, row] = parsed.data;
    expect(row[header.indexOf("Contact Phone")]).toBe("555-123-4567");
  });

  it("tags rows with Salvo, the target label, and the offer label", () => {
    const csv = exportCsv([makeRow()], "seller", "both");
    const parsed = Papa.parse<string[]>(csv);
    const [header, row] = parsed.data;
    expect(row[header.indexOf("Tags")]).toBe("Salvo, Direct-to-Seller, Cash + Creative");
  });

  it("sets Pipeline Stage to Offer Ready", () => {
    const csv = exportCsv([makeRow()], "agent", "cash");
    const parsed = Papa.parse<string[]>(csv);
    const [header, row] = parsed.data;
    expect(row[header.indexOf("Pipeline Stage")]).toBe("Offer Ready");
  });

  it("omits creative fields in cash-only mode", () => {
    const csv = exportCsv([makeRow()], "agent", "cash");
    const parsed = Papa.parse<string[]>(csv);
    const [header] = parsed.data;
    expect(header).not.toContain("Seller Profit Difference");
    expect(header).toContain("Net Cash");
  });

  it("marks Listings For Contact when multiple rows share a contact email", () => {
    const rowA = makeRow({ property: { ...property, address: "1 A St" } });
    const rowB = makeRow({ property: { ...property, address: "2 B St" } });
    const csv = exportCsv([rowA, rowB], "agent", "creative");
    const parsed = Papa.parse<string[]>(csv);
    const [header, row1, row2] = parsed.data;
    expect(row1[header.indexOf("Listings For Contact")]).toBe("2");
    expect(row2[header.indexOf("Listings For Contact")]).toBe("2");
  });
});
