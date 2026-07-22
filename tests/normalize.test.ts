import { describe, expect, it } from "vitest";
import { autoMap } from "@/lib/engine/mapper";
import { enrich, normalizeWithMap, pickPhone } from "@/lib/engine/normalize";
import { SEED } from "@/lib/seed";

describe("normalizeWithMap (spec §5.3)", () => {
  const map = autoMap(Object.keys(SEED[0]));
  const norm = normalizeWithMap(SEED, map);

  it("parses numerics and keeps all seeded rows", () => {
    expect(norm.length).toBe(10);
    expect(norm[0].home_value).toBe(562000);
    expect(norm[0].loan_payment).toBeCloseTo(554.35);
  });

  it("builds owner_full from first + last", () => {
    expect(norm[0].owner_full).toBe("Laurie Bitz");
    expect(norm[6].owner_full).toBe("Finnigan/Li Living Trust"); // first name null
  });

  it("drops rows with no address", () => {
    const rows = [...SEED, { ...SEED[0], Address: "" }];
    expect(normalizeWithMap(rows, map).length).toBe(10);
  });

  it("treats blank numerics as unknown, not zero", () => {
    const rows = [{ ...SEED[0], "Est. Remaining balance of Open Loans": "" }];
    expect(normalizeWithMap(rows, map)[0].loan_balance).toBeUndefined();
  });
});

describe("pickPhone — PropStream Phone 1..5 DNC block", () => {
  it("prefers the first mobile non-DNC number", () => {
    const p = pickPhone({
      "Phone 1": "111", "Phone 1 Type": "Landline", "Phone 1 DNC": "false",
      "Phone 2": "222", "Phone 2 Type": "Mobile", "Phone 2 DNC": "false",
    });
    expect(p).toEqual({ cell: "222", dnc: false });
  });
  it("falls back to first non-DNC of any type", () => {
    const p = pickPhone({
      "Phone 1": "111", "Phone 1 Type": "Mobile", "Phone 1 DNC": "true",
      "Phone 2": "222", "Phone 2 Type": "Landline", "Phone 2 DNC": "no",
    });
    expect(p).toEqual({ cell: "222", dnc: false });
  });
  it("returns Phone 1 flagged DNC when only DNC numbers exist", () => {
    const p = pickPhone({ "Phone 1": "111", "Phone 1 Type": "Mobile", "Phone 1 DNC": "true" });
    expect(p).toEqual({ cell: "111", dnc: true });
  });
});

describe("enrich — skip-trace join by address key", () => {
  const base = [
    { address: "11250 E. Prairie Ave", home_value: 500000, owner_cell: undefined, owner_email: undefined, owner_dnc: false },
    { address: "1 Main St", home_value: 300000, owner_cell: "999", owner_email: "keep@x.com", owner_dnc: false },
  ];
  const add = [
    { address: "11250 e prairie ave", home_value: NaN, owner_cell: "555", owner_email: "new@x.com", owner_dnc: false },
    { address: "1 main st", home_value: NaN, owner_cell: "000", owner_email: "clobber@x.com", owner_dnc: false },
  ];
  it("fills blanks by normalized address and never overwrites", () => {
    const out = enrich(base, add);
    expect(out[0].owner_cell).toBe("555");
    expect(out[0].owner_email).toBe("new@x.com");
    expect(out[1].owner_cell).toBe("999");        // untouched
    expect(out[1].owner_email).toBe("keep@x.com"); // untouched
  });
});
