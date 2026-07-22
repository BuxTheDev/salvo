import { describe, expect, it } from "vitest";
import { autoMap, fileReport, FIELD_ORDER, SPEC } from "@/lib/engine/mapper";
import { SEED } from "@/lib/seed";

describe("autoMap (spec §5.1–5.2)", () => {
  it("maps PropStream headers", () => {
    const m = autoMap(Object.keys(SEED[0]));
    expect(m.address?.header).toBe("Address");
    expect(m.home_value?.header).toBe("Est. Value");
    expect(m.loan_balance?.header).toBe("Est. Remaining balance of Open Loans");
    expect(m.equity?.header).toBe("Est. Equity");
    expect(m.monthly_rent?.header).toBe("Monthly Rent");
    expect(m.loan_payment?.header).toBe("Est. Total Monthly Payments");
    expect(m.asking?.header).toBe("MLS Amount");
    expect(m.agent_email?.header).toBe("MLS Agent E-Mail");
    expect(fileReport(m).kind).toBe("base");
  });

  it("maps foreign PropWire-style headers fuzzily", () => {
    const m = autoMap(["Situs Address", "Situs City", "Estimated Value", "Estimated Loan Balance", "Rent Estimate", "Listing Agent Email"]);
    expect(m.address?.header).toBe("Situs Address");
    expect(m.home_value?.header).toBe("Estimated Value");
    expect(m.loan_balance?.header).toBe("Estimated Loan Balance");
    expect(m.monthly_rent?.header).toBe("Rent Estimate");
    expect(m.agent_email?.header).toBe("Listing Agent Email");
  });

  it("never lets a generic `Email` header hijack agent_email", () => {
    const m = autoMap(["Address", "Est. Value", "MLS Agent E-Mail", "Email"]);
    expect(m.agent_email?.header).toBe("MLS Agent E-Mail");
    expect(m.owner_email?.header).toBe("Email");
  });

  it("maps each header to at most one field", () => {
    const m = autoMap(["Address", "Est. Value"]);
    const used = Object.values(m).map((e) => e!.header);
    expect(new Set(used).size).toBe(used.length);
  });

  it("classifies a skip-trace file as enrichment", () => {
    const m = autoMap(["Input_Property_Address", "Phone1_Number", "Email1"]);
    const rep = fileReport(m);
    expect(rep.kind).toBe("enrichment");
    expect(rep.missing).toContain("home_value");
  });

  it("classifies a contactless partial file as incomplete", () => {
    const rep = fileReport(autoMap(["Address", "City"]));
    expect(rep.kind).toBe("incomplete");
  });

  it("field order in SPEC drives priority and covers all 18 fields", () => {
    expect(FIELD_ORDER.length).toBe(18);
    expect(FIELD_ORDER[0]).toBe("address");
    expect(Object.keys(SPEC)).toEqual(FIELD_ORDER);
  });
});
