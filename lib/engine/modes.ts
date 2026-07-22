import type { Contact, Offer, Property, Target, UnderwriteResult } from "./types";

/** §4.5 — resolve who the offer is addressed to. */
export function contactFor(r: Property, target: Target): Contact {
  if (target === "agent") {
    return { name: r.agent_name, email: r.agent_email, phone: r.agent_phone, viaAgent: true };
  }
  if (r.owner_email || r.owner_cell) {
    return { name: r.owner_full, email: r.owner_email, phone: r.owner_cell, viaAgent: false };
  }
  // fallback
  return { name: r.agent_name, email: r.agent_email, phone: r.agent_phone, viaAgent: true };
}

/** §6 — Ready per row: creative -> creative_ok; cash -> cash_ok; both -> either. */
export function isReady(offer: Offer, u: UnderwriteResult): boolean {
  if (offer === "creative") return u.creative_ok;
  if (offer === "cash") return u.cash_ok;
  return u.creative_ok || u.cash_ok;
}

/**
 * §6 — Sort key: cash -> net_cash; creative -> diff;
 * both -> max(diff if creative_ok, net_cash if cash_ok).
 */
export function sortKey(offer: Offer, u: UnderwriteResult): number {
  if (offer === "cash") return u.net_cash ?? -Infinity;
  if (offer === "creative") return u.diff ?? -Infinity;
  const candidates: number[] = [];
  if (u.creative_ok) candidates.push(u.diff ?? -Infinity);
  if (u.cash_ok) candidates.push(u.net_cash ?? -Infinity);
  return candidates.length ? Math.max(...candidates) : -Infinity;
}

/** §6 — Contactability. */
export function isReachable(contact: Contact, ownerDnc: boolean | undefined): boolean {
  const hasEmail = !!contact.email;
  const hasUsablePhone = !!contact.phone && !(ownerDnc && !contact.viaAgent);
  return hasEmail || hasUsablePhone;
}

/**
 * §6 — DNC: the resolved contact is a DNC owner phone with no email fallback.
 */
export function isDnc(contact: Contact, ownerDnc: boolean | undefined): boolean {
  return !contact.viaAgent && !!ownerDnc && !contact.email;
}

export interface RowWithContact {
  property: Property;
  underwrite: UnderwriteResult;
  contact: Contact;
}

/**
 * §6 — Duplicate contact: group ready rows by contact email; rows sharing an
 * email are badged x N and export "Listings For Contact" so GHL consolidates
 * them under one contact instead of blind-spamming one inbox.
 */
export function groupDuplicateContacts<T extends RowWithContact>(rows: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = row.contact.email?.trim().toLowerCase();
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return groups;
}

export function listingsForContact<T extends RowWithContact>(row: T, groups: Map<string, T[]>): number {
  const key = row.contact.email?.trim().toLowerCase();
  if (!key) return 1;
  return groups.get(key)?.length ?? 1;
}

export interface SuppressionEntry {
  kind: "email" | "phone";
  value: string;
}

function normalizePhoneKey(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * §9 — suppression check performed on every export/push: skip any contact
 * whose email/phone is in the org's suppression list.
 */
export function isSuppressed(contact: Contact, suppressions: SuppressionEntry[]): boolean {
  const email = contact.email?.trim().toLowerCase();
  const phone = contact.phone ? normalizePhoneKey(contact.phone) : undefined;

  return suppressions.some((s) => {
    if (s.kind === "email") return !!email && s.value.trim().toLowerCase() === email;
    return !!phone && normalizePhoneKey(s.value) === phone;
  });
}
