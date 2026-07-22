export function fcT(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) || value <= 0
    ? "TBD" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function fcS(value: number | null | undefined) {
  return value == null || !Number.isFinite(value)
    ? "TBD" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function phone(value?: string) {
  const digits = (value ?? "").replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` : value ?? "";
}

export function today() {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit", year: "numeric" }).format(new Date());
}
