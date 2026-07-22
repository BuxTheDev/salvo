import { describe, expect, it } from "vitest";
import { autoMap, classify, normalizeHeader } from "./mapper";

describe("normalizeHeader", () => {
  it("lowercases and strips non-alphanumeric characters", () => {
    expect(normalizeHeader("Estimated Market Value")).toBe("estimatedmarketvalue");
    expect(normalizeHeader("Phone 1 - DNC")).toBe("phone1dnc");
  });
});

describe("autoMap", () => {
  it("exact-maps canonical PropStream headers", () => {
    const headers = [
      "Property Address",
      "Property City",
      "Property State",
      "Property Zip",
      "Estimated Market Value",
      "Estimated Loan Balance",
      "Estimated Equity",
      "Owner Full Name",
    ];
    const map = autoMap(headers);
    expect(map.address?.header).toBe("Property Address");
    expect(map.address?.confidence).toBe("auto");
    expect(map.home_value?.header).toBe("Estimated Market Value");
    expect(map.loan_balance?.header).toBe("Estimated Loan Balance");
    expect(map.equity?.header).toBe("Estimated Equity");
    expect(map.owner_full?.header).toBe("Owner Full Name");
  });

  it("maps foreign PropWire-style headers via fuzzy substring matching", () => {
    const headers = ["Site Address", "Site City", "Site State", "Site Zip", "AVM", "Market Rent"];
    const map = autoMap(headers);
    expect(map.address?.header).toBe("Site Address");
    expect(map.home_value?.header).toBe("AVM");
    expect(map.monthly_rent?.header).toBe("Market Rent");
  });

  it("never lets a generic 'Email' header hijack Agent Email (synonym must be a subset of the header, not the reverse)", () => {
    const headers = ["Listing Agent Email", "Email"];
    const map = autoMap(headers);
    expect(map.agent_email?.header).toBe("Listing Agent Email");
    expect(map.owner_email?.header).toBe("Email");
  });

  it("maps each header to at most one field", () => {
    const headers = ["Address", "Street"];
    const map = autoMap(headers);
    // "Address" is claimed first (exact match, earlier in synonym list); "Street" is left unused
    // rather than double-mapping the address field.
    expect(map.address?.header).toBe("Address");
  });

  it("marks unmatched headers as unmapped", () => {
    const headers = ["Some Totally Unrelated Column"];
    const map = autoMap(headers);
    expect(Object.keys(map).length).toBe(0);
  });
});

describe("classify", () => {
  it("classifies a fully-mapped file as base", () => {
    const map = autoMap(["Property Address", "Estimated Market Value"]);
    expect(classify(map).kind).toBe("base");
  });

  it("classifies an address + contact file with no value as enrichment", () => {
    const map = autoMap(["Site Address", "Phone 1", "Email 1"]);
    const c = classify(map);
    expect(c.missing).toContain("home_value");
    expect(c.hasContact).toBe(true);
    expect(c.kind).toBe("enrichment");
  });

  it("classifies a file missing required fields with no contact as incomplete", () => {
    const map = autoMap(["City", "State"]);
    const c = classify(map);
    expect(c.kind).toBe("incomplete");
  });
});
