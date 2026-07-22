/** Currency formatters matching LOI templates. */

function isBlankMoney(v: number | null | undefined): boolean {
  return v == null || Number.isNaN(v) || v <= 0;
}

function usd(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

/** TBD if null/NaN/<=0; otherwise $#,##0.00. No negatives. */
export function fcT(v: number | null | undefined): string {
  if (isBlankMoney(v)) return "TBD";
  return usd(v!);
}

/** Signed; TBD only if null/NaN. Allows negatives (Seller Profit Traditional). */
export function fcS(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "TBD";
  return usd(v);
}

/** Normalize phone to XXX-XXX-XXXX for Excel-safe CSV. */
export function formatPhone(raw?: string | null): string {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  const d = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (d.length !== 10) return String(raw).trim();
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Today as Month DD, YYYY */
export function formatLoiDate(d = new Date()): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
