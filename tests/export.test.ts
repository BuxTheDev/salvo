import { describe, expect, it } from "vitest";
import { autoMap } from "@/lib/engine/mapper";
import { normalizeWithMap } from "@/lib/engine/normalize";
import { DEFAULT_SETTINGS } from "@/lib/engine/underwrite";
import { isReachable, modeStats, scoreRows } from "@/lib/engine/score";
import { buildExportRow, toCSV } from "@/lib/engine/export";
import { fcS, fcT, fmtPhone } from "@/lib/engine/format";
import { loiFields } from "@/lib/engine/loi";
import { SEED } from "@/lib/seed";

const norm = normalizeWithMap(SEED, autoMap(Object.keys(SEED[0])));

describe("scoreRows (spec §6)", () => {
  it("sorts ready-first then by SF Difference in creative mode", () => {
    const scored = scoreRows(norm, DEFAULT_SETTINGS, "agent", "creative");
    const readyFlags = scored.map((x) => x.ready);
    expect(readyFlags.slice(0, readyFlags.filter(Boolean).length).every(Boolean)).toBe(true);
    const readyVals = scored.filter((x) => x.ready).map((x) => x.sortVal);
    expect(readyVals).toEqual([...readyVals].sort((a, b) => b - a));
  });

  it("flags duplicate agent emails across listings (×N)", () => {
    const scored = scoreRows(norm, DEFAULT_SETTINGS, "agent", "creative");
    const minik = scored.filter((x) => x.contact.email?.toLowerCase() === "michelle@teamminik.com");
    expect(minik.length).toBe(2);
    expect(minik.every((x) => x.ready)).toBe(true);
    expect(minik.every((x) => x.dup === 2)).toBe(true);
  });

  it("computes mode stats", () => {
    const scored = scoreRows(norm, DEFAULT_SETTINGS, "agent", "creative");
    const stats = modeStats(scored, "creative", false);
    expect(stats.scanned).toBe(10);
    expect(stats.ready).toBe(scored.filter((x) => x.ready).length);
    expect(stats.dupContacts).toBe(1); // one shared contact (Michelle Minik)
  });

  it("marks a DNC owner phone with no email as unreachable", () => {
    const x = { r: { address: "x", home_value: 1, owner_dnc: true }, contact: { phone: "555", viaAgent: false } };
    expect(isReachable(x)).toBe(false);
    expect(isReachable({ ...x, contact: { ...x.contact, email: "a@b.c" } })).toBe(true);
  });
});

describe("export contract (spec §8.1)", () => {
  const scored = scoreRows(norm, DEFAULT_SETTINGS, "agent", "creative");
  const first = scored.find((x) => x.ready)!;

  it("cash mode emits exactly the cash column set, in order", () => {
    const row = buildExportRow(first, "agent", "cash", 1);
    expect(Object.keys(row)).toEqual([
      "Contact Name", "Contact Email", "Contact Phone", "Contact Type", "Contact DNC",
      "Listings For Contact", "City", "State", "Offer Type", "Tags", "Pipeline Stage",
      "Owner Full Name", "Address", "Date",
      "Has Cash", "Cash Scenario", "Net Cash", "Industry Costs", "Home Value",
    ]);
  });

  it("creative/both emit the full union including the creative block", () => {
    const row = buildExportRow(first, "agent", "creative", 2);
    expect(Object.keys(row)).toEqual([
      "Contact Name", "Contact Email", "Contact Phone", "Contact Type", "Contact DNC",
      "Listings For Contact", "City", "State", "Offer Type", "Tags", "Pipeline Stage",
      "Owner Full Name", "Address", "Date",
      "Has Creative", "Price", "Loan Balance", "Down", "Financed", "Payment", "Sub Payment",
      "Seller Profit Creative", "Seller Profit Traditional", "Seller Profit Difference",
      "Has Cash", "Cash Scenario", "Net Cash", "Industry Costs", "Home Value",
    ]);
    expect(row["Listings For Contact"]).toBe(2);
    expect(row["Tags"]).toBe("Salvo, Direct-to-Agent, Creative");
    expect(row["Pipeline Stage"]).toBe("Offer Ready");
  });

  it("normalizes phones to XXX-XXX-XXXX (Excel text-safe)", () => {
    const row = buildExportRow(first, "agent", "creative", 1);
    expect(String(row["Contact Phone"])).toMatch(/^\d{3}-\d{3}-\d{4}$|^$/);
    expect(fmtPhone("4803437653")).toBe("480-343-7653");
    expect(fmtPhone("14803437653")).toBe("480-343-7653");
    expect(fmtPhone("702-870-3226")).toBe("702-870-3226");
  });

  it("escapes CSV values containing commas/quotes", () => {
    const csv = toCSV([{ A: 'say "hi", ok', B: 1 }]);
    expect(csv).toBe('A,B\n"say ""hi"", ok",1');
  });
});

describe("currency merge formatting (spec §4.4)", () => {
  it("fcT renders TBD for null/NaN/non-positive", () => {
    expect(fcT(null)).toBe("TBD");
    expect(fcT(NaN)).toBe("TBD");
    expect(fcT(0)).toBe("TBD");
    expect(fcT(-5)).toBe("TBD");
    expect(fcT(433286)).toBe("$433,286.00");
  });
  it("fcS allows negatives (Seller Profit Traditional)", () => {
    expect(fcS(-12500)).toBe("$-12,500.00");
    expect(fcS(null)).toBe("TBD");
  });
});

describe("LOI merge fields (spec §7.3) — no blanks", () => {
  it("populates every merge tag for a ready creative row", () => {
    const scored = scoreRows(norm, DEFAULT_SETTINGS, "agent", "creative");
    const first = scored.find((x) => x.ready)!;
    const f = loiFields(first.r, first.u);
    for (const v of Object.values(f)) {
      expect(v).toBeTruthy();
    }
    expect(f.down).not.toBe("TBD");
    expect(f.sellerProfitDifference).not.toBe("TBD");
  });
});
