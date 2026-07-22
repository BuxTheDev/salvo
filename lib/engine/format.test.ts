import { describe, expect, it } from "vitest";
import { fcS, fcT, formatPhone } from "./format";

describe("fcT", () => {
  it("returns TBD for null, undefined, NaN, zero, and negative values", () => {
    expect(fcT(null)).toBe("TBD");
    expect(fcT(undefined)).toBe("TBD");
    expect(fcT(NaN)).toBe("TBD");
    expect(fcT(0)).toBe("TBD");
    expect(fcT(-100)).toBe("TBD");
  });

  it("formats positive currency with two decimals and thousands separators", () => {
    expect(fcT(1234.5)).toBe("$1,234.50");
    expect(fcT(30000)).toBe("$30,000.00");
  });
});

describe("fcS", () => {
  it("returns TBD only for null / undefined / NaN", () => {
    expect(fcS(null)).toBe("TBD");
    expect(fcS(undefined)).toBe("TBD");
    expect(fcS(NaN)).toBe("TBD");
  });

  it("allows negative and zero values", () => {
    expect(fcS(-5000)).toBe("-$5,000.00");
    expect(fcS(0)).toBe("$0.00");
    expect(fcS(76000)).toBe("$76,000.00");
  });
});

describe("formatPhone", () => {
  it("normalizes a 10-digit number to XXX-XXX-XXXX", () => {
    expect(formatPhone("1234567890")).toBe("123-456-7890");
  });

  it("strips a leading country code 1", () => {
    expect(formatPhone("+1 (123) 456-7890")).toBe("123-456-7890");
  });

  it("returns the original string when it cannot be normalized", () => {
    expect(formatPhone("12345")).toBe("12345");
  });

  it("returns empty string for empty input", () => {
    expect(formatPhone(undefined)).toBe("");
    expect(formatPhone("")).toBe("");
  });
});
