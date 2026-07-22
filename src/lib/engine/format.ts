// Currency & value formatting — must match the LOI templates exactly.

/**
 * fcT — "TBD" if the value is null/NaN/<= 0, otherwise "$#,##0.00".
 * Use for all money that shouldn't show negatives (Price, Down, Financed,
 * Payment, Sub Payment, Seller Profit Creative/Difference, Industry Costs,
 * Home Value, Cash Scenario, Net Cash).
 */
export function fcT(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v) || v <= 0) return "TBD";
  return usd(v);
}

/**
 * fcS — signed. "TBD" only if null/NaN; allows (and shows) negatives.
 * Use for Seller Profit Traditional only (can legitimately be negative).
 */
export function fcS(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "TBD";
  return usd(v);
}

function usd(v: number): string {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Normalize a phone to XXX-XXX-XXXX to stop Excel scientific-notation corruption. */
export function fmtPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length === 10) {
    return `${ten.slice(0, 3)}-${ten.slice(3, 6)}-${ten.slice(6)}`;
  }
  return String(raw).trim();
}

/** Today formatted as "Month DD, YYYY" for LOI Date fields. */
export function offerDate(d: Date = new Date()): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
