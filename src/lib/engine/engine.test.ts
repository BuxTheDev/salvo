import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  underwrite,
  fcT,
  fcS,
  autoMap,
  classifyFile,
  normalizeWithMap,
  enrich,
  qualifyProperties,
  buildExportRows,
  exportColumnOrder,
  toCsv,
  formatPhone,
} from "@/lib/engine";

describe("underwrite math", () => {
  it("computes creative + cash for a typical deal", () => {
    const r = underwrite(
      {
        address: "123 Main St",
        home_value: 400000,
        loan_balance: 280000,
        equity: 120000,
        monthly_rent: 2800,
        loan_payment: 1600,
        asking: 410000,
      },
      DEFAULT_SETTINGS,
    );

    // down = min(120000 * 0.5, 30000) = 30000
    expect(r.down).toBe(30000);
    // financed = 410000 - 280000 - 30000 = 100000
    expect(r.financed).toBe(100000);
    // m2s = 100000 / 360
    expect(r.m2s).toBeCloseTo(100000 / 360, 6);
    expect(r.total).toBeCloseTo(100000 / 360 + 1600, 6);
    expect(r.creative_ok).toBe(true);

    // industry = 400000 * 0.12 = 48000
    expect(r.industry_costs).toBe(48000);
    // net_trad = 400000 - 48000 - 280000 = 72000
    expect(r.net_trad).toBe(72000);
    // net_crea = 410000 - 280000 = 130000
    expect(r.net_crea).toBe(130000);
    expect(r.diff).toBe(58000);

    // cash = 400000 * 0.8 = 320000
    expect(r.cash).toBe(320000);
    expect(r.net_cash).toBe(40000);
    expect(r.cash_ok).toBe(true);
  });

  it("rejects creative when payment exceeds rent + tolerance", () => {
    const r = underwrite({
      address: "1 A St",
      home_value: 500000,
      loan_balance: 100000,
      equity: 400000,
      monthly_rent: 500,
      loan_payment: 2000,
      asking: 500000,
    });
    // down = 30000, financed = 370000, m2s huge → fails
    expect(r.creative_ok).toBe(false);
  });

  it("rejects cash when net_cash <= 0 (underwater)", () => {
    const r = underwrite({
      address: "2 B St",
      home_value: 200000,
      loan_balance: 180000,
    });
    // cash = 160000, net = -20000
    expect(r.cash).toBe(160000);
    expect(r.net_cash).toBe(-20000);
    expect(r.cash_ok).toBe(false);
  });

  it("treats asking < 20000 as mismapped rent and uses home_value as price", () => {
    const r = underwrite({
      address: "3 C St",
      home_value: 300000,
      loan_balance: 200000,
      equity: 100000,
      monthly_rent: 2200,
      loan_payment: 1100,
      asking: 1800, // rent leaked into asking
    });
    expect(r.price).toBe(300000);
  });

  it("derives equity from value - loan when equity absent", () => {
    const r = underwrite({
      address: "4 D St",
      home_value: 350000,
      loan_balance: 250000,
      monthly_rent: 2500,
      loan_payment: 1400,
    });
    expect(r.down).toBe(30000); // min(100000*0.5, 30000)
  });

  it("returns early when home_value missing", () => {
    const r = underwrite({ address: "x", home_value: 0 });
    expect(r.creative_ok).toBe(false);
    expect(r.cash_ok).toBe(false);
  });
});

describe("formatters", () => {
  it("fcT blanks non-positive", () => {
    expect(fcT(null)).toBe("TBD");
    expect(fcT(0)).toBe("TBD");
    expect(fcT(-5)).toBe("TBD");
    expect(fcT(1234.5)).toBe("$1,234.50");
  });

  it("fcS allows negatives", () => {
    expect(fcS(-100)).toBe("-$100.00");
    expect(fcS(null)).toBe("TBD");
  });

  it("formatPhone is Excel-safe", () => {
    expect(formatPhone("6025551212")).toBe("602-555-1212");
    expect(formatPhone("+1 (602) 555-1212")).toBe("602-555-1212");
  });
});

describe("mapper", () => {
  it("exact-maps PropStream-like headers", () => {
    const headers = [
      "Property Address",
      "Estimated Market Value",
      "Estimated Loan Balance",
      "Estimated Equity",
      "Monthly Rent",
      "Est. Total Monthly Payments",
      "MLS Agent Email",
      "MLS Agent Name",
    ];
    const m = autoMap(headers);
    expect(m.address.header).toBe("Property Address");
    expect(m.address.confidence).toBe("auto");
    expect(m.home_value.header).toBe("Estimated Market Value");
    expect(m.loan_balance.header).toBe("Estimated Loan Balance");
    expect(m.agent_email.header).toBe("MLS Agent Email");
    expect(classifyFile(m).kind).toBe("base");
  });

  it("maps foreign PropWire-style headers via fuzzy", () => {
    const headers = [
      "Site Address",
      "EMV",
      "ELV",
      "EEV",
      "Market Rent",
      "AgentEmail",
    ];
    const m = autoMap(headers);
    expect(m.address.header).toBe("Site Address");
    expect(m.home_value.header).toBe("EMV");
    expect(m.loan_balance.header).toBe("ELV");
    expect(m.equity.header).toBe("EEV");
    expect(m.monthly_rent.header).toBe("Market Rent");
    expect(m.agent_email.header).toBe("AgentEmail");
  });

  it("does not let generic email hijack agent_email when owner email wins first", () => {
    // owner_email synonyms include "email"; agent_email comes later in FIELD_ORDER
    // so exact "email" should map to owner_email, not agent_email
    const m = autoMap(["Address", "Home Value", "email", "Agent Email"]);
    expect(m.owner_email.header).toBe("email");
    expect(m.agent_email.header).toBe("Agent Email");
  });

  it("classifies enrichment files", () => {
    const m = autoMap(["Property Address", "Phone 1", "Email 1"]);
    const c = classifyFile(m);
    expect(c.kind).toBe("enrichment");
    expect(c.missing).toContain("home_value");
  });
});

describe("normalize + enrich", () => {
  it("builds properties and joins skip-trace by address", () => {
    const headers = ["Property Address", "Estimated Market Value", "City"];
    const mapping = autoMap(headers);
    const base = normalizeWithMap(
      [
        {
          "Property Address": "123 Main St",
          "Estimated Market Value": "$400,000",
          City: "Phoenix",
        },
      ],
      mapping,
      headers,
    );
    expect(base[0].home_value).toBe(400000);
    expect(base[0].city).toBe("Phoenix");

    const enrichHeaders = ["Property Address", "Phone 1", "Email 1"];
    const enrichMap = autoMap(enrichHeaders);
    const add = normalizeWithMap(
      [
        {
          "Property Address": "123 Main St",
          "Phone 1": "6025559999",
          "Email 1": "owner@x.com",
        },
      ],
      enrichMap,
      enrichHeaders,
    );
    const joined = enrich(base, add);
    expect(joined[0].owner_cell).toBe("6025559999");
    expect(joined[0].owner_email).toBe("owner@x.com");
  });

  it("does not overwrite existing contact on enrich", () => {
    const joined = enrich(
      [
        {
          address: "1 A",
          home_value: 1,
          owner_cell: "111",
          owner_email: "a@a.com",
        },
      ],
      [
        {
          address: "1 A",
          home_value: 0,
          owner_cell: "222",
          owner_email: "b@b.com",
        },
      ],
    );
    expect(joined[0].owner_cell).toBe("111");
    expect(joined[0].owner_email).toBe("a@a.com");
  });
});

describe("qualify + export", () => {
  const props = [
    {
      address: "10 Ready St",
      home_value: 400000,
      loan_balance: 280000,
      equity: 120000,
      monthly_rent: 2800,
      loan_payment: 1600,
      agent_name: "Jane Agent",
      agent_email: "jane@broker.com",
      agent_phone: "6025551212",
      owner_full: "Sam Seller",
    },
    {
      address: "11 Also Jane St",
      home_value: 350000,
      loan_balance: 200000,
      equity: 150000,
      monthly_rent: 2600,
      loan_payment: 1400,
      agent_name: "Jane Agent",
      agent_email: "jane@broker.com",
      agent_phone: "6025551212",
    },
  ];

  it("groups duplicate agent emails", () => {
    const q = qualifyProperties(props, { target: "agent", mode: "creative" });
    expect(q.length).toBe(2);
    expect(q.every((r) => r.listingsForContact === 2)).toBe(true);
  });

  it("cash export omits creative columns", () => {
    const q = qualifyProperties(props, { target: "agent", mode: "cash" });
    const rows = buildExportRows(q, { target: "agent", mode: "cash" });
    const cols = exportColumnOrder("cash");
    expect(cols).not.toContain("Price");
    expect(cols).toContain("Cash Scenario");
    expect(rows[0]["Contact Phone"]).toBe("602-555-1212");
    expect(rows[0].Tags).toContain("Direct-to-Agent");
    const csv = toCsv(rows, "cash");
    expect(csv.split("\n")[0]).not.toContain("Seller Profit Difference");
  });

  it("creative export includes cash fields", () => {
    const q = qualifyProperties(props, { target: "agent", mode: "creative" });
    const cols = exportColumnOrder("creative");
    expect(cols).toContain("Seller Profit Difference");
    expect(cols).toContain("Cash Scenario");
    const rows = buildExportRows(q, { target: "agent", mode: "creative" });
    expect(rows[0]["Has Creative"]).toBe("true");
  });
});
