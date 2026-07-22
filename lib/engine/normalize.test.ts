import { describe, expect, it } from "vitest";
import { autoMap } from "./mapper";
import { addressKey, enrich, normalizeWithMap, pickPhone } from "./normalize";

describe("normalizeWithMap", () => {
  it("normalizes numeric fields and builds owner_full from first + last name", () => {
    const headers = ["Property Address", "Estimated Market Value", "Owner First Name", "Owner Last Name"];
    const map = autoMap(headers);
    const rows = [
      {
        "Property Address": "123 Main St",
        "Estimated Market Value": "$200,000.00",
        "Owner First Name": "Jane",
        "Owner Last Name": "Doe",
      },
    ];
    const [prop] = normalizeWithMap(rows, map, headers);
    expect(prop.home_value).toBe(200000);
    expect(prop.owner_full).toBe("Jane Doe");
  });

  it("drops rows with no address", () => {
    const headers = ["Property Address", "Estimated Market Value"];
    const map = autoMap(headers);
    const rows = [
      { "Property Address": "", "Estimated Market Value": "100000" },
      { "Property Address": "456 Oak Ave", "Estimated Market Value": "100000" },
    ];
    const props = normalizeWithMap(rows, map, headers);
    expect(props).toHaveLength(1);
    expect(props[0].address).toBe("456 Oak Ave");
  });
});

describe("pickPhone", () => {
  it("prefers the first mobile, non-DNC number in a PropStream Phone block", () => {
    const headers = ["Phone 1", "Phone 1 Type", "Phone 1 DNC", "Phone 2", "Phone 2 Type", "Phone 2 DNC"];
    const row = {
      "Phone 1": "5551110000",
      "Phone 1 Type": "Landline",
      "Phone 1 DNC": "N",
      "Phone 2": "5552220000",
      "Phone 2 Type": "Mobile",
      "Phone 2 DNC": "N",
    };
    const result = pickPhone(row, headers, {});
    expect(result.owner_cell).toBe("5552220000");
    expect(result.owner_dnc).toBe(false);
  });

  it("falls back to the first non-DNC number when no mobile is available", () => {
    const headers = ["Phone 1", "Phone 1 Type", "Phone 1 DNC", "Phone 2", "Phone 2 Type", "Phone 2 DNC"];
    const row = {
      "Phone 1": "5551110000",
      "Phone 1 Type": "Landline",
      "Phone 1 DNC": "Y",
      "Phone 2": "5552220000",
      "Phone 2 Type": "Landline",
      "Phone 2 DNC": "N",
    };
    const result = pickPhone(row, headers, {});
    expect(result.owner_cell).toBe("5552220000");
    expect(result.owner_dnc).toBe(false);
  });

  it("falls back to Phone 1 flagged DNC when every number is on the DNC list", () => {
    const headers = ["Phone 1", "Phone 1 Type", "Phone 1 DNC"];
    const row = { "Phone 1": "5551110000", "Phone 1 Type": "Mobile", "Phone 1 DNC": "Y" };
    const result = pickPhone(row, headers, {});
    expect(result.owner_cell).toBe("5551110000");
    expect(result.owner_dnc).toBe(true);
  });

  it("uses the single mapped owner_cell column when no Phone block is present", () => {
    const headers = ["Cell Phone"];
    const map = autoMap(headers);
    const row = { "Cell Phone": "5559990000" };
    const result = pickPhone(row, headers, map);
    expect(result.owner_cell).toBe("5559990000");
    expect(result.owner_dnc).toBe(false);
  });
});

describe("addressKey", () => {
  it("normalizes addresses for join matching", () => {
    expect(addressKey("123 Main St.")).toBe(addressKey("123 MAIN ST"));
  });
});

describe("enrich", () => {
  it("fills blank owner contact fields from a skip-trace file by address match", () => {
    const base = [{ address: "123 Main St", home_value: 200000 }];
    const skip = [{ address: "123 Main St", home_value: 0, owner_cell: "5551234567", owner_email: "jane@x.com" }];
    const [merged] = enrich(base, skip);
    expect(merged.owner_cell).toBe("5551234567");
    expect(merged.owner_email).toBe("jane@x.com");
  });

  it("never overwrites existing contact info", () => {
    const base = [{ address: "123 Main St", home_value: 200000, owner_cell: "5550000000" }];
    const skip = [{ address: "123 Main St", home_value: 0, owner_cell: "5559999999" }];
    const [merged] = enrich(base, skip);
    expect(merged.owner_cell).toBe("5550000000");
  });
});
