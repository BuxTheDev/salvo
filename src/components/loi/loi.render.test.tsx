import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { DEFAULT_SETTINGS, type Property } from "@/lib/engine/types";
import { underwrite } from "@/lib/engine/underwrite";
import { BulkLoiDocument, LoiDocument } from "./LoiDocument";

const P: Property = {
  address: "1 Test St, Phoenix, AZ",
  home_value: 425000,
  loan_balance: 210000,
  monthly_rent: 2650,
  loan_payment: 1180,
  owner_full: "Test Owner",
};

describe("LOI PDF rendering", () => {
  it("renders a combined creative + cash LOI to a valid PDF buffer", async () => {
    const uw = underwrite(P, DEFAULT_SETTINGS);
    const buf = await renderToBuffer(
      <LoiDocument property={P} uw={uw} offer="creative" combineCash />,
    );
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("renders a batch document for multiple properties", async () => {
    const items = [P, { ...P, address: "2 Test St" }].map((p) => ({
      property: p,
      uw: underwrite(p, DEFAULT_SETTINGS),
    }));
    const buf = await renderToBuffer(<BulkLoiDocument items={items} offer="both" />);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
