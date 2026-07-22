// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { LOIDocument } from "@/components/pdf/LOIDocument";
import { autoMap } from "@/lib/engine/mapper";
import { normalizeWithMap } from "@/lib/engine/normalize";
import { DEFAULT_SETTINGS } from "@/lib/engine/underwrite";
import { scoreRows } from "@/lib/engine/score";
import { loiFields } from "@/lib/engine/loi";
import { SEED } from "@/lib/seed";

const norm = normalizeWithMap(SEED, autoMap(Object.keys(SEED[0])));
const scored = scoreRows(norm, DEFAULT_SETTINGS, "agent", "both");
const entries = scored
  .filter((x) => x.ready)
  .map((x) => ({ f: loiFields(x.r, x.u), creativeOK: x.creativeOK, cashOK: x.cashOK }));

describe("LOI PDF (spec §7, acceptance §14.5)", () => {
  it("renders a multi-property creative+cash document to a valid PDF", async () => {
    const buf = await renderToBuffer(
      <LOIDocument entries={entries} offer="both" includeCashPage={true} />,
    );
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(5000);
  });

  it("renders a cash-only document", async () => {
    const buf = await renderToBuffer(
      <LOIDocument entries={entries.filter((e) => e.cashOK)} offer="cash" includeCashPage={false} />,
    );
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("creative document can append the cash page (combined .docx behavior)", async () => {
    const single = await renderToBuffer(
      <LOIDocument entries={entries.slice(0, 1)} offer="creative" includeCashPage={false} />,
    );
    const combined = await renderToBuffer(
      <LOIDocument entries={entries.slice(0, 1)} offer="creative" includeCashPage={true} />,
    );
    expect(combined.length).toBeGreaterThan(single.length);
  });
});
