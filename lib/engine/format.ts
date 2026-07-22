/**
 * `fcT` — "TBD" if v is null/NaN/<= 0, else "$#,##0.00".
 * Use for all money that shouldn't show negatives (Price, Down, Financed,
 * Payment, Sub Payment, Seller Profit Creative/Difference, Industry Costs,
 * Home Value, Cash Scenario, Net Cash).
 */
export function fcT(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v) || v <= 0) return "TBD";
  return currency(v);
}

/**
 * `fcS` — signed; "TBD" only if null/NaN; allows negatives.
 * Use for Seller Profit Traditional only (can legitimately be negative).
 */
export function fcS(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "TBD";
  return currency(v);
}

function currency(v: number): string {
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Normalize a phone number to XXX-XXX-XXXX (prevents Excel scientific-notation corruption). */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return raw;
  return `${ten.slice(0, 3)}-${ten.slice(3, 6)}-${ten.slice(6)}`;
}

/** Today's date formatted as "Month DD, YYYY" for LOI merge fields. */
export function todayLong(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
