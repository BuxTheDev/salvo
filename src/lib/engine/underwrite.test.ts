import assert from "node:assert/strict";
import test from "node:test";
import { smartMap } from "./mapper";
import { underwrite } from "./underwrite";
import { DEFAULT_SETTINGS } from "./types";

test("underwrites the documented creative and cash math", () => {
  const result = underwrite({ address: "1 Main", home_value: 300000, loan_balance: 150000, monthly_rent: 2500, loan_payment: 1000, asking: 310000 }, DEFAULT_SETTINGS);
  assert.equal(result.down, 30000);
  assert.equal(result.financed, 130000);
  assert.equal(result.m2s, 130000 / 360);
  assert.equal(result.creative_ok, true);
  assert.equal(result.cash, 240000);
  assert.equal(result.net_cash, 90000);
  assert.equal(result.cash_ok, true);
  assert.equal(result.diff, 46000);
});

test("does not let generic email hijack agent email", () => {
  const map = smartMap(["Property Address", "Estimated Market Value", "Listing Agent Email", "Email"]);
  assert.equal(map.agent_email?.header, "Listing Agent Email");
  assert.equal(map.owner_email?.header, "Email");
});
