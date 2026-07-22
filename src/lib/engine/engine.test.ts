import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./types";
import { underwrite, contactFor } from "./underwrite";
import { fcT, fcS, fmtPhone } from "./format";
import { autoMap, classify, normHeader } from "./mapper";
import { normalizeWithMap, enrich } from "./normalize";
import { evaluate } from "./select";
import { toGhlCsv } from "./export";

describe("underwrite — the math (§4.3)", () => {
  it("computes a fully-qualifying creative + cash deal", () => {
    const uw = underwrite(
      { address: "1 A St", home_value: 300000, loan_balance: 150000, monthly_rent: 2000, loan_payment: 900 },
      DEFAULT_SETTINGS,
    );
    expect(uw.price).toBe(300000);
    expect(uw.down).toBe(30000); // capped at downCap
    expect(uw.financed).toBe(120000);
    expect(uw.m2s).toBeCloseTo(333.3333, 3);
    expect(uw.total).toBeCloseTo(1233.3333, 3);
    expect(uw.industry_costs).toBe(36000);
    expect(uw.net_trad).toBe(114000);
    expect(uw.net_crea).toBe(150000);
    expect(uw.diff).toBe(36000); // Seller Finance Difference
    expect(uw.cash).toBe(240000);
    expect(uw.net_cash).toBe(90000);
    expect(uw.creative_ok).toBe(true);
    expect(uw.cash_ok).toBe(true);
  });

  it("caps down at downPct of equity when equity is small", () => {
    const uw = underwrite(
      { address: "x", home_value: 200000, loan_balance: 160000, monthly_rent: 1500, loan_payment: 800 },
      DEFAULT_SETTINGS,
    );
    // eq = 40000 → down = min(20000, 30000) = 20000
    expect(uw.down).toBe(20000);
  });

  it("excludes a degenerate creative (financed <= 0) and underwater cash", () => {
    const uw = underwrite(
      { address: "y", home_value: 100000, loan_balance: 120000, monthly_rent: 1500 },
      DEFAULT_SETTINGS,
    );
    expect(uw.creative_ok).toBe(false); // eq < 0 → down null
    expect(uw.net_cash).toBe(-40000);
    expect(uw.cash_ok).toBe(false); // requireCashClears
  });

  it("fails creative when payment exceeds rent + tolerance", () => {
    const uw = underwrite(
      { address: "z", home_value: 500000, loan_balance: 100000, monthly_rent: 500, loan_payment: 1000 },
      DEFAULT_SETTINGS,
    );
    expect(uw.creative_ok).toBe(false);
  });

  it("guards against a mismapped asking figure below 20,000", () => {
    const uw = underwrite(
      { address: "g", home_value: 300000, loan_balance: 100000, monthly_rent: 2500, asking: 1800 },
      DEFAULT_SETTINGS,
    );
    expect(uw.price).toBe(300000); // asking ignored, falls back to home_value
  });

  it("uses a legitimate asking figure above 20,000 as price", () => {
    const uw = underwrite(
      { address: "g2", home_value: 300000, loan_balance: 100000, monthly_rent: 2500, asking: 350000 },
      DEFAULT_SETTINGS,
    );
    expect(uw.price).toBe(350000);
    expect(uw.net_crea).toBe(250000);
  });

  it("returns both-false when home_value is missing", () => {
    const uw = underwrite({ address: "n", home_value: 0 }, DEFAULT_SETTINGS);
    expect(uw.creative_ok).toBe(false);
    expect(uw.cash_ok).toBe(false);
  });
});

describe("contactFor", () => {
  const p = {
    address: "a",
    home_value: 1,
    agent_name: "Ann",
    agent_email: "ann@x.com",
    owner_full: "Ozzy",
    owner_email: "ozzy@x.com",
  };
  it("routes to agent for agent target", () => {
    expect(contactFor(p, "agent")).toMatchObject({ email: "ann@x.com", viaAgent: true });
  });
  it("routes to owner for seller target when owner is reachable", () => {
    expect(contactFor(p, "seller")).toMatchObject({ email: "ozzy@x.com", viaAgent: false });
  });
  it("falls back to agent for seller target when owner has no contact", () => {
    expect(contactFor({ ...p, owner_email: undefined }, "seller")).toMatchObject({ viaAgent: true });
  });
});

describe("format helpers (§4.4)", () => {
  it("fcT returns TBD for null/NaN/<=0", () => {
    expect(fcT(null)).toBe("TBD");
    expect(fcT(0)).toBe("TBD");
    expect(fcT(-5)).toBe("TBD");
    expect(fcT(1234.5)).toBe("$1,234.50");
  });
  it("fcS is signed and only TBD for null/NaN", () => {
    expect(fcS(null)).toBe("TBD");
    expect(fcS(-1000)).toBe("-$1,000.00");
    expect(fcS(0)).toBe("$0.00");
  });
  it("normalizes phones to XXX-XXX-XXXX", () => {
    expect(fmtPhone("(602) 555-1234")).toBe("602-555-1234");
    expect(fmtPhone("16025551234")).toBe("602-555-1234");
  });
});

describe("mapper (§5)", () => {
  it("maps PropStream headers exactly", () => {
    const headers = [
      "Property Address",
      "Site City",
      "Estimated Market Value",
      "Estimated Loan Balance",
      "Monthly Rent",
      "MLS Agent Email",
    ];
    const { map, source } = autoMap(headers);
    expect(map.address).toBe("Property Address");
    expect(map.home_value).toBe("Estimated Market Value");
    expect(map.loan_balance).toBe("Estimated Loan Balance");
    expect(map.agent_email).toBe("MLS Agent Email");
    expect(source.address).toBe("auto");
  });

  it("maps foreign PropWire-style headers via fuzzy substring", () => {
    const headers = ["Situs Address", "AVM", "Listing Agent Email Address"];
    const { map, source } = autoMap(headers);
    expect(map.address).toBe("Situs Address");
    expect(map.home_value).toBe("AVM");
    expect(map.agent_email).toBe("Listing Agent Email Address");
    expect(source.agent_email).toBe("guess");
  });

  it("does not let a generic Email header hijack agent_email", () => {
    const headers = ["Agent Email", "Email"];
    const { map } = autoMap(headers);
    expect(map.agent_email).toBe("Agent Email");
    expect(map.owner_email).toBe("Email");
  });

  it("classifies a complete file as base", () => {
    const { map } = autoMap(["Property Address", "Market Value", "Agent Email"]);
    expect(classify({ map, source: {} }).kind).toBe("base");
  });

  it("classifies an address+contact file with no value as enrichment", () => {
    const { map } = autoMap(["Property Address", "Owner Email"]);
    expect(classify({ map, source: {} }).kind).toBe("enrichment");
  });

  it("classifies a file missing address as incomplete", () => {
    const { map } = autoMap(["Market Value", "Monthly Rent"]);
    expect(classify({ map, source: {} }).kind).toBe("incomplete");
  });

  it("normHeader strips non-alphanumerics", () => {
    expect(normHeader("MLS Agent Email #1")).toBe("mlsagentemail1");
  });
});

describe("normalize + enrich (§5.3)", () => {
  it("parses numerics, builds owner_full, drops address-less rows", () => {
    const { map } = autoMap(["Address", "Owner First Name", "Owner Last Name", "Market Value"]);
    const rows = [
      { Address: "1 A St", "Owner First Name": "Jane", "Owner Last Name": "Doe", "Market Value": "$300,000" },
      { Address: "", "Owner First Name": "No", "Owner Last Name": "Addr", "Market Value": "1" },
    ];
    const props = normalizeWithMap(rows, { map, source: {} });
    expect(props).toHaveLength(1);
    expect(props[0].owner_full).toBe("Jane Doe");
    expect(props[0].home_value).toBe(300000);
  });

  it("picks the first mobile non-DNC number from a Phone block", () => {
    const map = { map: { address: "Address" }, source: {} };
    const rows = [
      {
        Address: "1 A St",
        "Phone 1": "111-111-1111",
        "Phone 1 Type": "Landline",
        "Phone 1 DNC": "false",
        "Phone 2": "222-222-2222",
        "Phone 2 Type": "Mobile",
        "Phone 2 DNC": "false",
      },
    ];
    const props = normalizeWithMap(rows, map);
    expect(props[0].owner_cell).toBe("222-222-2222");
    expect(props[0].owner_dnc).toBe(false);
  });

  it("flags DNC when only a DNC phone exists", () => {
    const map = { map: { address: "Address" }, source: {} };
    const rows = [
      { Address: "1 A St", "Phone 1": "111-111-1111", "Phone 1 Type": "Mobile", "Phone 1 DNC": "true" },
    ];
    const props = normalizeWithMap(rows, map);
    expect(props[0].owner_dnc).toBe(true);
  });

  it("enriches base rows by address without overwriting existing contact", () => {
    const base = [
      { address: "1 A St", home_value: 1, owner_email: "keep@x.com" },
      { address: "2 B St", home_value: 1 },
    ];
    const add = [
      { address: "1 a st", home_value: 0, owner_email: "new@x.com", owner_cell: "999" },
      { address: "2 B St.", home_value: 0, owner_cell: "888" },
    ];
    const out = enrich(base, add);
    expect(out[0].owner_email).toBe("keep@x.com"); // not overwritten
    expect(out[0].owner_cell).toBe("999"); // blank filled
    expect(out[1].owner_cell).toBe("888"); // matched despite punctuation
  });
});

describe("select — dedupe, reachable, sort (§6)", () => {
  const props = [
    { address: "1 A St", home_value: 300000, loan_balance: 150000, monthly_rent: 2000, loan_payment: 900, agent_email: "ann@x.com", agent_name: "Ann" },
    { address: "2 B St", home_value: 400000, loan_balance: 100000, monthly_rent: 2500, loan_payment: 800, agent_email: "ann@x.com", agent_name: "Ann" },
    { address: "3 C St", home_value: 250000, loan_balance: 120000, monthly_rent: 1800, loan_payment: 700, agent_email: "bob@x.com", agent_name: "Bob" },
  ];

  it("flags ×N duplicate contacts and sorts by SF Difference for creative", () => {
    const rows = evaluate(props, DEFAULT_SETTINGS, "agent", "creative");
    const ann = rows.filter((r) => r.contact.email === "ann@x.com");
    expect(ann.every((r) => r.dupCount === 2)).toBe(true);
    const bob = rows.find((r) => r.contact.email === "bob@x.com");
    expect(bob?.dupCount).toBe(1);
    // sorted descending by diff
    const readyDiffs = rows.filter((r) => r.ready).map((r) => r.sortKey);
    expect(readyDiffs).toEqual([...readyDiffs].sort((a, b) => b - a));
  });

  it("marks reachable via email even when phone is DNC", () => {
    const rows = evaluate(
      [{ address: "d", home_value: 300000, loan_balance: 100000, monthly_rent: 2500, owner_email: "o@x.com", owner_cell: "123", owner_dnc: true }],
      DEFAULT_SETTINGS,
      "seller",
      "cash",
    );
    expect(rows[0].reachable).toBe(true);
  });

  it("marks a DNC owner-phone with no email as not reachable and dnc=true", () => {
    const rows = evaluate(
      [{ address: "e", home_value: 300000, loan_balance: 100000, monthly_rent: 2500, owner_cell: "123", owner_dnc: true }],
      DEFAULT_SETTINGS,
      "seller",
      "cash",
    );
    expect(rows[0].reachable).toBe(false);
    expect(rows[0].dnc).toBe(true);
  });
});

describe("export — GHL CSV contract (§8.1)", () => {
  const rows = evaluate(
    [{ address: "1 A St", city: "Mesa", state: "AZ", home_value: 300000, loan_balance: 150000, monthly_rent: 2000, loan_payment: 900, agent_email: "ann@x.com", agent_name: "Ann", agent_phone: "6025551234" }],
    DEFAULT_SETTINGS,
    "agent",
    "creative",
  );

  it("emits the full union of headers for creative and text-safe phones", () => {
    const csv = toGhlCsv(rows, "agent", "creative");
    const header = csv.split("\n")[0];
    expect(header).toContain("Seller Profit Difference");
    expect(header).toContain("Has Cash");
    const dataRow = csv.split("\n")[1];
    expect(dataRow).toContain("602-555-1234");
    expect(dataRow).toContain("Salvo, Direct-to-Agent, Creative");
    expect(dataRow).toContain("Offer Ready");
  });

  it("omits creative fields in cash mode", () => {
    const csv = toGhlCsv(rows, "agent", "cash");
    const header = csv.split("\n")[0];
    expect(header).not.toContain("Seller Profit Difference");
    expect(header).toContain("Cash Scenario");
  });
});
