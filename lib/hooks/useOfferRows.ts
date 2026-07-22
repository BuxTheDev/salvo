"use client";

import { useMemo } from "react";
import { underwrite } from "@/lib/engine/underwrite";
import { contactFor, groupDuplicateContacts, isDnc, isReachable, isReady, sortKey } from "@/lib/engine/modes";
import type { Offer, Property, Settings, Target, UnderwriteResult, Contact } from "@/lib/engine/types";

export interface OfferRow {
  property: Property;
  underwrite: UnderwriteResult;
  contact: Contact;
  ready: boolean;
  reachable: boolean;
  dnc: boolean;
  sort: number;
  listingsForContact: number;
}

export interface OfferRowsResult {
  rows: OfferRow[];
  reachableRows: OfferRow[];
  readyCount: number;
  reachableCount: number;
  dncCount: number;
  duplicateContactCount: number;
}

export function useOfferRows(
  properties: Property[],
  settings: Settings,
  target: Target,
  offer: Offer,
  reachableOnly: boolean,
): OfferRowsResult {
  return useMemo(() => {
    const base = properties.map((property) => {
      const u = underwrite(property, settings);
      const contact = contactFor(property, target);
      return { property, underwrite: u, contact };
    });

    const groups = groupDuplicateContacts(base);

    const rows: OfferRow[] = base.map((row) => {
      const key = row.contact.email?.trim().toLowerCase();
      const listings = key ? groups.get(key)?.length ?? 1 : 1;
      return {
        ...row,
        ready: isReady(offer, row.underwrite),
        reachable: isReachable(row.contact, row.property.owner_dnc),
        dnc: isDnc(row.contact, row.property.owner_dnc),
        sort: sortKey(offer, row.underwrite),
        listingsForContact: listings,
      };
    });

    const ready = rows.filter((r) => r.ready).sort((a, b) => b.sort - a.sort);
    const reachableRows = reachableOnly ? ready.filter((r) => r.reachable) : ready;

    const duplicateContactCount = Array.from(groups.values()).filter((g) => g.length > 1).length;

    return {
      rows: reachableRows,
      reachableRows: ready.filter((r) => r.reachable),
      readyCount: ready.length,
      reachableCount: ready.filter((r) => r.reachable).length,
      dncCount: ready.filter((r) => r.dnc).length,
      duplicateContactCount,
    };
  }, [properties, settings, target, offer, reachableOnly]);
}
