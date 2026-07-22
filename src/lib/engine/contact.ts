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

export function isReachable(c: ContactInfo, ownerDnc?: boolean): boolean {
  const email = !!c.email;
  const phone = !!c.phone;
  // DNC owner phone without email is not reachable for SMS; email still counts
  if (email) return true;
  if (phone && !(ownerDnc && !c.viaAgent)) return true;
  return false;
}

export function isDncContact(c: ContactInfo, ownerDnc?: boolean): boolean {
  // Resolved contact is a DNC owner phone with no email fallback
  return !c.viaAgent && !!ownerDnc && !!c.phone && !c.email;
}
