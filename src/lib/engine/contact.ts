import type { ContactInfo, Property, Target } from "./types";

export function contactFor(r: Property, target: Target): ContactInfo {
  if (target === "agent") {
    return {
      name: r.agent_name,
      email: r.agent_email,
      phone: r.agent_phone,
      viaAgent: true,
    };
  }
  if (r.owner_email || r.owner_cell) {
    return {
      name: r.owner_full,
      email: r.owner_email,
      phone: r.owner_cell,
      viaAgent: false,
    };
  }
  return {
    name: r.agent_name,
    email: r.agent_email,
    phone: r.agent_phone,
    viaAgent: true,
  };
}

export function isReachable(
  contact: ContactInfo,
  ownerDnc: boolean | undefined
): boolean {
  const email = contact.email?.trim();
  const phone = contact.phone?.trim();
  if (email) return true;
  if (phone && !(ownerDnc && !contact.viaAgent)) return true;
  return false;
}
