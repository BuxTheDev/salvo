import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  autoMapHeaders,
  classifyFile,
  exportToCsv,
  mappingToRecord,
  normalizeWithMap,
  underwrite,
} from "./index";

describe("underwrite", () => {
  const base = {
    address: "123 Main St",
    home_value: 300000,
    loan_balance: 200000,
    equity: 100000,
    monthly_rent: 2200,
    loan_payment: 1200,
  };

  it("computes creative and cash offers per spec", () => {
    const result = underwrite(base, DEFAULT_SETTINGS);
    expect("diff" in result).toBe(true);
    if (!("diff" in result)) return;

    expect(result.down).toBe(30000);
    expect(result.financed).toBe(70000);
    expect(result.m2s).toBeCloseTo(70000 / 360, 2);
    expect(result.total).toBeCloseTo(result.m2s + 1200, 2);
    expect(result.creative_ok).toBe(true);
    expect(result.cash).toBe(240000);
    expect(result.net_cash).toBe(40000);
    expect(result.cash_ok).toBe(true);
    expect(result.industry_costs).toBe(36000);
    expect(result.net_trad).toBe(64000);
    expect(result.net_crea).toBe(100000);
    expect(result.diff).toBe(36000);
  });

  it("rejects degenerate creative when financed <= 0", () => {
    const result = underwrite(
      { ...base, home_value: 100000, loan_balance: 100000, equity: 0, monthly_rent: 5000 },
      DEFAULT_SETTINGS
    );
    expect("diff" in result).toBe(true);
    if (!("diff" in result)) return;
    expect(result.financed).toBe(0);
    expect(result.creative_ok).toBe(false);
  });

  it("rejects underwater cash", () => {
    const result = underwrite(
      { address: "1", home_value: 100000, loan_balance: 90000, monthly_rent: 2000 },
      DEFAULT_SETTINGS
    );
    expect("diff" in result).toBe(true);
    if (!("diff" in result)) return;
    expect(result.cash_ok).toBe(false);
  });

  it("uses asking price when > 20000", () => {
    const result = underwrite(
      { ...base, asking: 280000 },
      DEFAULT_SETTINGS
    );
    expect("diff" in result).toBe(true);
    if (!("diff" in result)) return;
    expect(result.price).toBe(280000);
    expect(result.financed).toBe(50000);
  });

  it("ignores asking <= 20000 (likely rent mismatch)", () => {
    const result = underwrite(
      { ...base, asking: 1800 },
      DEFAULT_SETTINGS
    );
    expect("diff" in result).toBe(true);
    if (!("diff" in result)) return;
    expect(result.price).toBe(300000);
  });
});

describe("mapper", () => {
  it("maps PropStream headers exactly", () => {
    const headers = [
      "Property Address",
      "Estimated Market Value",
      "Remaining Balance of Open Loans",
      "MLS Agent Email",
    ];
    const mappings = autoMapHeaders(headers);
    const map = mappingToRecord(mappings);
    expect(map.address).toBe("Property Address");
    expect(map.home_value).toBe("Estimated Market Value");
    expect(map.loan_balance).toBe("Remaining Balance of Open Loans");
    expect(map.agent_email).toBe("MLS Agent Email");
    expect(classifyFile(mappings)).toBe("base");
  });

  it("maps PropWire headers via fuzzy match", () => {
    const headers = ["Site Address", "EMV", "Owner Email Address"];
    const mappings = autoMapHeaders(headers);
    const map = mappingToRecord(mappings);
    expect(map.address).toBe("Site Address");
    expect(map.home_value).toBe("EMV");
    expect(map.owner_email).toBe("Owner Email Address");
  });

  it("does not reverse-match generic email to agent_email", () => {
    const headers = ["Email"];
    const mappings = autoMapHeaders(headers);
    const map = mappingToRecord(mappings);
    expect(map.owner_email).toBe("Email");
    expect(map.agent_email).toBeUndefined();
  });

  it("classifies enrichment files", () => {
    const mappings = autoMapHeaders(["Address", "Owner Cell"]);
    expect(classifyFile(mappings)).toBe("enrichment");
  });
});

describe("normalize", () => {
  it("builds owner_full from first + last", () => {
    const rows = [
      {
        Address: "1 Oak",
        EMV: "250000",
        "Owner First": "Jane",
        "Owner Last": "Doe",
      },
    ];
    const map = mappingToRecord(
      autoMapHeaders(["Address", "EMV", "Owner First", "Owner Last"])
    );
    const props = normalizeWithMap(rows, map);
    expect(props[0].owner_full).toBe("Jane Doe");
    expect(props[0].home_value).toBe(250000);
  });
});

describe("export", () => {
  it("emits GHL contract headers for creative mode", () => {
    const props = normalizeWithMap(
      [{ Address: "1 Oak", EMV: "300000", "Loan Balance": "200000", Rent: "2200" }],
      mappingToRecord(
        autoMapHeaders(["Address", "EMV", "Loan Balance", "Rent", "Agent Email"])
      )
    );
    props[0].agent_email = "agent@test.com";
    props[0].monthly_rent = 2200;
    props[0].loan_balance = 200000;
    props[0].equity = 100000;
    props[0].loan_payment = 1200;

    const csv = exportToCsv(props, DEFAULT_SETTINGS, "agent", "creative");
    const headerLine = csv.split("\n")[0];
    expect(headerLine).toContain("Seller Profit Difference");
    expect(headerLine).toContain("Contact DNC");
    expect(headerLine).toContain("Listings For Contact");
  });

  it("omits creative fields in cash mode", () => {
    const props = [
      {
        address: "1 Oak",
        home_value: 300000,
        loan_balance: 100000,
        agent_email: "a@test.com",
      },
    ];
    const csv = exportToCsv(props, DEFAULT_SETTINGS, "agent", "cash");
    const headerLine = csv.split("\n")[0];
    expect(headerLine).not.toContain("Has Creative");
    expect(headerLine).toContain("Cash Scenario");
  });
});
