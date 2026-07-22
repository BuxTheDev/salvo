import { describe, expect, it } from "vitest";
import { underwrite } from "./underwrite";
import { DEFAULT_SETTINGS, type Property } from "./types";

const base: Property = {
  address: "123 Main St",
  home_value: 200000,
  loan_balance: 100000,
  equity: 100000,
  monthly_rent: 1600,
  loan_payment: 700,
};

describe("underwrite", () => {
  it("qualifies both creative and cash on a healthy deal", () => {
    const u = underwrite(base, DEFAULT_SETTINGS);
    expect(u.creative_ok).toBe(true);
    expect(u.cash_ok).toBe(true);
    expect(u.price).toBe(200000);
    expect(u.down).toBe(30000); // 50% of 100k equity, capped at 30k
    expect(u.financed).toBe(70000); // 200k - 100k loan - 30k down
    expect(u.m2s).toBeCloseTo(70000 / 360, 5);
    expect(u.total).toBeCloseTo(70000 / 360 + 700, 5);
    expect(u.industry_costs).toBe(24000); // 12% of 200k
    expect(u.net_trad).toBe(76000); // 200k - 24k - 100k
    expect(u.net_crea).toBe(100000); // 200k - 100k
    expect(u.diff).toBe(24000); // the Seller Finance Difference
    expect(u.cash).toBe(160000); // 80% of 200k
    expect(u.net_cash).toBe(60000); // 160k - 100k
  });

  it("derives equity from home_value - loan_balance when equity is absent", () => {
    const u = underwrite({ ...base, equity: undefined }, DEFAULT_SETTINGS);
    expect(u.down).toBe(30000);
    expect(u.financed).toBe(70000);
  });

  it("caps down payment at downCap even when equity is large", () => {
    const u = underwrite({ ...base, equity: 200000 }, DEFAULT_SETTINGS);
    expect(u.down).toBe(30000); // 50% of 200k = 100k, capped at 30k
  });

  it("disqualifies creative when equity is negative (down = null)", () => {
    const u = underwrite({ ...base, home_value: 100000, loan_balance: 150000, equity: undefined }, DEFAULT_SETTINGS);
    expect(u.down).toBeNull();
    expect(u.creative_ok).toBe(false);
  });

  it("disqualifies creative when financed <= 0 and requirePositiveFinanced is true", () => {
    const u = underwrite(
      { ...base, home_value: 100000, loan_balance: 75000, equity: 80000 },
      DEFAULT_SETTINGS,
    );
    expect(u.financed).toBe(0); // clamped at 0 for display (raw financed was -5000)
    expect(u.creative_ok).toBe(false);
  });

  it("disqualifies creative when the total monthly payment exceeds rent + tolerance", () => {
    const u = underwrite({ ...base, monthly_rent: 200 }, DEFAULT_SETTINGS);
    expect(u.creative_ok).toBe(false);
  });

  it("disqualifies creative when rent is unknown", () => {
    const u = underwrite({ ...base, monthly_rent: undefined }, DEFAULT_SETTINGS);
    expect(u.creative_ok).toBe(false);
  });

  it("disqualifies cash when net_cash <= 0 (requireCashClears)", () => {
    const u = underwrite({ ...base, home_value: 100000, loan_balance: 90000, equity: 10000 }, DEFAULT_SETTINGS);
    expect(u.cash).toBe(80000);
    expect(u.net_cash).toBe(-10000);
    expect(u.cash_ok).toBe(false);
  });

  it("disqualifies cash when loan is unknown and requireKnownLoan is true", () => {
    const settings = { ...DEFAULT_SETTINGS, requireKnownLoan: true };
    const u = underwrite({ ...base, loan_balance: undefined }, settings);
    expect(u.cash_ok).toBe(false);
  });

  it("does not require a known loan for cash by default", () => {
    const u = underwrite({ ...base, loan_balance: undefined }, DEFAULT_SETTINGS);
    expect(u.cash_ok).toBe(true);
    expect(u.net_cash).toBe(160000); // no loan to subtract
  });

  it("treats an asking price <= 20000 as a mismapped rent value and falls back to home_value", () => {
    const u = underwrite({ ...base, asking: 15000 }, DEFAULT_SETTINGS);
    expect(u.price).toBe(200000);
  });

  it("uses asking price when it is a plausible sale price (> 20000)", () => {
    const u = underwrite({ ...base, asking: 225000 }, DEFAULT_SETTINGS);
    expect(u.price).toBe(225000);
    expect(u.net_crea).toBe(125000); // 225k - 100k loan
  });

  it("returns not-ok when home_value is missing", () => {
    const u = underwrite({ ...base, home_value: 0 }, DEFAULT_SETTINGS);
    expect(u.creative_ok).toBe(false);
    expect(u.cash_ok).toBe(false);
  });
});
