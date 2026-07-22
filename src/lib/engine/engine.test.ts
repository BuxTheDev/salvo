import { describe, expect, it } from "vitest";
import { buildExportRecords, exportColumns, toCsv } from "./export";
import { autoMap, classifyMapping, enrich, normalizeWithMap } from "./mapper";
import { underwrite } from "./underwrite";
import { DEFAULT_SETTINGS, Property } from "./types";

const property: Property = {
  address: "123 Main St",
  city: "Phoenix",
  state: "AZ",
  home_value: 300_000,
  loan_balance: 180_000,
  equity: 120_000,
  monthly_rent: 2_200,
  loan_payment: 1_500,
  asking: 295_000,
  owner_full: "Taylor Owner",
  agent_name: "Avery Agent",
  agent_email: "avery@example.com",
  agent_phone: "(602) 555-0100",
};

describe("underwrite", () => {
  it("calculates the reconciled creative and cash offer math", () => {
    const result = underwrite(property, DEFAULT_SETTINGS);
    expect(result.creative_ok).toBe(true);
    expect(result.cash_ok).toBe(true);
    expect(result.down).toBe(30_000);
    expect(result.financed).toBe(85_000);
    expect(result.m2s).toBeCloseTo(236.1111);
    expect(result.total).toBeCloseTo(1_736.1111);
    expect(result.industry_costs).toBe(36_000);
    expect(result.net_trad).toBe(84_000);
    expect(result.net_crea).toBe(115_000);
    expect(result.diff).toBe(31_000);
    expect(result.cash).toBe(240_000);
    expect(result.net_cash).toBe(60_000);
  });

  it("ignores an asking value that looks like mismapped rent", () => {
    const result = underwrite({ ...property, asking: 2_500 }, DEFAULT_SETTINGS);
    expect(result.price).toBe(property.home_value);
  });

  it("rejects underwater cash and degenerate creative offers", () => {
    const result = underwrite(
      { ...property, loan_balance: 310_000, equity: -10_000 },
      DEFAULT_SETTINGS,
    );
    expect(result.creative_ok).toBe(false);
    expect(result.cash_ok).toBe(false);
  });
});

describe("smart mapping and normalization", () => {
  it("maps exact fields before fuzzy fields without reusing headers", () => {
    const headers = [
      "Property Address",
      "Estimated Market Value",
      "MLS Agent Email",
      "Email",
    ];
    const mapping = autoMap(headers);
    expect(mapping.address?.header).toBe("Property Address");
    expect(mapping.home_value?.header).toBe("Estimated Market Value");
    expect(mapping.agent_email?.header).toBe("MLS Agent Email");
    expect(mapping.owner_email?.header).toBe("Email");
    expect(classifyMapping(mapping).kind).toBe("base");
  });

  it("normalizes money and selects a mobile non-DNC number", () => {
    const rows = [{
      Address: "99 Oak Ave",
      AVM: "$425,000",
      "Phone 1": "6025550101",
      "Phone 1 Type": "Landline",
      "Phone 1 DNC": "No",
      "Phone 2": "6025550102",
      "Phone 2 Type": "Mobile",
      "Phone 2 DNC": "No",
    }];
    const normalized = normalizeWithMap(rows, autoMap(Object.keys(rows[0])));
    expect(normalized[0].home_value).toBe(425_000);
    expect(normalized[0].owner_cell).toBe("6025550102");
    expect(normalized[0].owner_dnc).toBe(false);
  });

  it("enriches blanks by normalized address without overwriting contacts", () => {
    const existing = [{ ...property, owner_email: "keep@example.com" }];
    const additions = [{
      address: "123 MAIN ST.",
      home_value: 0,
      owner_email: "new@example.com",
      owner_cell: "6025550102",
    }];
    const result = enrich(existing, additions);
    expect(result[0].owner_email).toBe("keep@example.com");
    expect(result[0].owner_cell).toBe("6025550102");
  });
});

describe("GHL export", () => {
  it("emits the exact cash-only contract and text-safe phones", () => {
    const columns = exportColumns("cash");
    expect(columns).not.toContain("Price");
    expect(columns).toContain("Contact DNC");
    expect(columns).toContain("Listings For Contact");

    const records = buildExportRecords(
      [{ property }],
      DEFAULT_SETTINGS,
      "cash",
      "agent",
      new Date("2026-07-22T12:00:00Z"),
    );
    expect(records[0]["Contact Phone"]).toBe("602-555-0100");
    expect(records[0]["Pipeline Stage"]).toBe("Offer Ready");
    expect(toCsv(records, columns).split("\r\n")).toHaveLength(2);
  });
});
