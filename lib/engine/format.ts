/** Formatting + small parsing helpers shared by the engine, exports, and LOIs (spec §4.4). */

/** Loose numeric parse: strips $ , spaces; NaN when unparseable. */
export const num = (v: unknown): number => {
  if (v == null || v === "") return NaN;
  const n = parseFloat(String(v).replace(/[$,\s]/g, ""));
  return isNaN(n) ? NaN : n;
};

/** Normalize a header/synonym for matching: lowercase, strip non-alphanumeric. */
export const norm = (s: unknown): string =>
  String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Address / email dedupe key: lowercase, strip non-alphanumeric. */
export const keyOf = (s: unknown): string =>
  String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** "$562,000" or "—" — table display. */
export const usd = (n: number | null | undefined): string =>
  n != null && isFinite(n) && !isNaN(n)
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";

/** "$471k" — compact stat display. */
export const usdk = (n: number | null | undefined): string =>
  n != null && isFinite(n)
    ? (n < 0 ? "-" : "") + "$" + Math.abs(Math.round(n / 1000)) + "k"
    : "—";

/**
 * Merge-tag currency, TBD-when-nonpositive. Used for all LOI money that should
 * never show a negative (Price, Down, Financed, Payment, …).
 */
export const fcT = (v: number | null | undefined): string =>
  v == null || isNaN(v) || v <= 0
    ? "TBD"
    : "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Signed merge-tag currency; "TBD" only when unknown. Used for Seller Profit
 * Traditional only — it can legitimately be negative.
 */
export const fcS = (v: number | null | undefined): string =>
  v == null || isNaN(v)
    ? "TBD"
    : "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const mean = (a: number[]): number =>
  a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

/** "July 22, 2026" — the LOI {{Date}} format. */
export const fmtDate = (d: Date = new Date()): string =>
  d.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });

/** Normalize a phone to XXX-XXX-XXXX (text-safe for Excel/GHL); pass through otherwise. */
export const fmtPhone = (v: unknown): string => {
  if (v == null || v === "") return "";
  const d = String(v).replace(/\D/g, "");
  const t = d.length === 11 && d[0] === "1" ? d.slice(1) : d;
  return t.length === 10 ? `${t.slice(0, 3)}-${t.slice(3, 6)}-${t.slice(6)}` : String(v);
};
