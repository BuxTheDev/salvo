import type { GhlContactPayload } from "./client";
import { buildExportRows, type ExportRow } from "@/lib/engine/export";
import type { Offer, Target } from "@/lib/engine/types";

/**
 * Maps a Salvo export row to a GHL contact payload (§8.2). `customFieldIds`
 * is the org's `ghl_connections.custom_field_ids` map: merge-tag column name
 * (e.g. "Seller Profit Difference") -> the GHL custom field ID created once
 * per account.
 */
export function toGhlContactPayload(
  row: ExportRow,
  target: Target,
  offer: Offer,
  customFieldIds: Record<string, string>,
): GhlContactPayload {
  const [exported] = buildExportRows([row], target, offer);
  const customFields: Record<string, string> = {};

  for (const [mergeTag, value] of Object.entries(exported)) {
    if (["Contact Name", "Contact Email", "Contact Phone", "Tags"].includes(mergeTag)) continue;
    const fieldId = customFieldIds[mergeTag];
    if (fieldId) customFields[fieldId] = value;
  }

  return {
    name: row.contact.name,
    email: row.contact.email,
    phone: row.contact.phone,
    tags: exported["Tags"].split(",").map((t) => t.trim()),
    customFields,
  };
}
