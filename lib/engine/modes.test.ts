import { describe, expect, it } from "vitest";
import {
  contactFor,
  groupDuplicateContacts,
  isDnc,
  isReachable,
  isReady,
  listingsForContact,
  sortKey,
  type RowWithContact,
} from "./modes";
import type { Property, UnderwriteResult } from "./types";

describe("contactFor", () => {
  const property: Property = {
    address: "123 Main St",
    home_value: 200000,
    agent_name: "Alex Agent",
    agent_email: "alex@brokerage.com",
    agent_phone: "555-000-1111",
    owner_full: "Jane Owner",
    owner_email: "jane@owner.com",
    owner_cell: "555-000-2222",
  };

  it("resolves to the agent when target is agent", () => {
    const c = contactFor(property, "agent");
    expect(c.email).toBe("alex@brokerage.com");
    expect(c.viaAgent).toBe(true);
  });

  it("resolves to the owner when target is seller and owner contact exists", () => {
    const c = contactFor(property, "seller");
    expect(c.email).toBe("jane@owner.com");
    expect(c.viaAgent).toBe(false);
  });

  it("falls back to the agent when target is seller but owner has no contact info", () => {
    const c = contactFor({ ...property, owner_email: undefined, owner_cell: undefined }, "seller");
    expect(c.email).toBe("alex@brokerage.com");
    expect(c.viaAgent).toBe(true);
  });
});

describe("isReady / sortKey", () => {
  const creativeOnly: UnderwriteResult = { creative_ok: true, cash_ok: false, diff: 15000, net_cash: -1 };
  const cashOnly: UnderwriteResult = { creative_ok: false, cash_ok: true, diff: -1, net_cash: 42000 };
  const both: UnderwriteResult = { creative_ok: true, cash_ok: true, diff: 15000, net_cash: 42000 };

  it("computes readiness per offer mode", () => {
    expect(isReady("creative", creativeOnly)).toBe(true);
    expect(isReady("cash", creativeOnly)).toBe(false);
    expect(isReady("both", creativeOnly)).toBe(true);
    expect(isReady("both", { creative_ok: false, cash_ok: false })).toBe(false);
  });

  it("sorts creative by diff and cash by net_cash", () => {
    expect(sortKey("creative", creativeOnly)).toBe(15000);
    expect(sortKey("cash", cashOnly)).toBe(42000);
  });

  it("sorts 'both' by the max of the qualifying metrics", () => {
    expect(sortKey("both", both)).toBe(42000);
    expect(sortKey("both", creativeOnly)).toBe(15000);
    expect(sortKey("both", cashOnly)).toBe(42000);
  });
});

describe("isReachable / isDnc", () => {
  it("is reachable with an email even if the phone is DNC", () => {
    expect(isReachable({ email: "a@b.com", phone: undefined, viaAgent: false }, true)).toBe(true);
  });

  it("is not reachable when the only phone is an owner DNC number with no email", () => {
    expect(isReachable({ email: undefined, phone: "555-0000", viaAgent: false }, true)).toBe(false);
  });

  it("agent phones are always usable regardless of the owner DNC flag", () => {
    expect(isReachable({ email: undefined, phone: "555-0000", viaAgent: true }, true)).toBe(true);
  });

  it("flags DNC only when there is no email fallback", () => {
    expect(isDnc({ email: undefined, phone: "555-0000", viaAgent: false }, true)).toBe(true);
    expect(isDnc({ email: "a@b.com", phone: "555-0000", viaAgent: false }, true)).toBe(false);
  });
});

describe("duplicate contact grouping", () => {
  const rows: RowWithContact[] = [
    { property: { address: "1 A St", home_value: 1 }, underwrite: { creative_ok: true, cash_ok: false }, contact: { email: "agent@x.com", viaAgent: true } },
    { property: { address: "2 B St", home_value: 1 }, underwrite: { creative_ok: true, cash_ok: false }, contact: { email: "AGENT@X.com", viaAgent: true } },
    { property: { address: "3 C St", home_value: 1 }, underwrite: { creative_ok: true, cash_ok: false }, contact: { email: "other@y.com", viaAgent: true } },
  ];

  it("groups rows by case-insensitive contact email", () => {
    const groups = groupDuplicateContacts(rows);
    expect(groups.get("agent@x.com")).toHaveLength(2);
    expect(listingsForContact(rows[0], groups)).toBe(2);
    expect(listingsForContact(rows[2], groups)).toBe(1);
  });
});
