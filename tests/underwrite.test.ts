import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, underwrite, contactFor } from "@/lib/engine/underwrite";
import type { Property } from "@/lib/engine/types";

const S = DEFAULT_SETTINGS;

const prairie: Property = {
  address: "11250 E Prairie Ave",
  home_value: 562000, loan_balance: 91214, equity: 470786,
  monthly_rent: 2090, loan_payment: 554.35, asking: 554500,
};

describe("underwrite — creative math (spec §4.3)", () => {
  it("computes the reconciled numbers for a known PropStream row", () => {
    const u = underwrite(prairie, S);
    expect(u.price).toBe(554500);                       // asking > 20k → use asking
    expect(u.down).toBe(30000);                         // min(50% × 470,786, cap 30k)
    expect(u.financed).toBe(554500 - 91214 - 30000);    // 433,286
    expect(u.m2s).toBeCloseTo(433286 / 360, 6);         // 1,203.57 monthly to seller
    expect(u.total).toBeCloseTo(433286 / 360 + 554.35, 6);
    expect(u.creative_ok).toBe(true);                   // total ≤ rent + 200
    expect(u.industry_costs).toBeCloseTo(562000 * 0.12, 6);
    expect(u.net_trad).toBeCloseTo(562000 - 67440 - 91214, 6); // 403,346
    expect(u.net_crea).toBe(554500 - 91214);            // 463,286
    expect(u.diff).toBeCloseTo(463286 - 403346, 6);     // SF Difference = 59,940
  });

  it("ignores an asking figure below 20,000 (mismapped rent guard)", () => {
    const u = underwrite({ ...prairie, asking: 2900 }, S);
    expect(u.price).toBe(562000); // falls back to home value
  });

  it("derives equity from value − loan when equity is absent", () => {
    const u = underwrite({ ...prairie, equity: undefined }, S);
    expect(u.down).toBe(30000); // (562,000 − 91,214) × 50% still caps at 30k
    expect(u.creative_ok).toBe(true);
  });

  it("returns down = null and fails creative when equity is negative", () => {
    const u = underwrite({ address: "x", home_value: 499000, loan_balance: 536700, equity: -37700, monthly_rent: 1948, loan_payment: 3835.25, asking: 535000 }, S);
    expect(u.down).toBeNull();
    expect(u.creative_ok).toBe(false);
  });

  it("fails creative when total monthly exceeds rent + tolerance", () => {
    // 8148 W Hammond Ln: loan payment alone (4,477.58) blows past rent 1,461 + 200
    const u = underwrite({ address: "x", home_value: 370000, loan_balance: 355638, equity: 14362, monthly_rent: 1461, loan_payment: 4477.58, asking: 369000 }, S);
    expect(u.creative_ok).toBe(false);
  });

  it("skips degenerate creatives (financed ≤ 0) when the guard is on", () => {
    const r: Property = { address: "x", home_value: 100000, loan_balance: 95000, equity: 5000, monthly_rent: 2000, asking: 90000 };
    // financed = 90,000 − 95,000 − 2,500 < 0
    expect(underwrite(r, S).creative_ok).toBe(false);
    expect(underwrite(r, { ...S, requirePositiveFinanced: false }).creative_ok).toBe(true);
  });

  it("bails out entirely with no home value", () => {
    const u = underwrite({ address: "x", home_value: 0 }, S);
    expect(u).toEqual({ creative_ok: false, cash_ok: false });
  });
});

describe("underwrite — cash math", () => {
  it("offers 80% of value and nets against the loan", () => {
    const u = underwrite(prairie, S);
    expect(u.cash).toBeCloseTo(562000 * 0.8, 6);   // 449,600
    expect(u.net_cash).toBeCloseTo(449600 - 91214, 6);
    expect(u.cash_ok).toBe(true);
  });

  it("excludes underwater cash offers unless the guard is off", () => {
    const r: Property = { address: "x", home_value: 499000, loan_balance: 536700 };
    expect(underwrite(r, S).cash_ok).toBe(false); // 399,200 − 536,700 < 0
    expect(underwrite(r, { ...S, requireCashClears: false }).cash_ok).toBe(true);
  });

  it("requireKnownLoan skips blank-loan rows", () => {
    const r: Property = { address: "x", home_value: 400000 };
    expect(underwrite(r, S).cash_ok).toBe(true);
    expect(underwrite(r, { ...S, requireKnownLoan: true }).cash_ok).toBe(false);
  });
});

describe("contactFor (spec §4.5)", () => {
  const r: Property = {
    address: "x", home_value: 1,
    agent_name: "A", agent_email: "a@x.com", agent_phone: "1",
    owner_full: "O", owner_email: "o@x.com", owner_cell: "2",
  };
  it("agent target always goes to the agent", () => {
    expect(contactFor(r, "agent")).toEqual({ name: "A", email: "a@x.com", phone: "1", viaAgent: true });
  });
  it("seller target uses owner contact when present", () => {
    expect(contactFor(r, "seller").viaAgent).toBe(false);
    expect(contactFor(r, "seller").email).toBe("o@x.com");
  });
  it("seller target falls back to agent with no skip-trace hit", () => {
    const bare = { ...r, owner_email: undefined, owner_cell: undefined };
    expect(contactFor(bare, "seller").viaAgent).toBe(true);
  });
});
