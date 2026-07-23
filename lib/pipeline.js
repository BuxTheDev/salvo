/* Shared selection pipeline: raw list -> normalized -> underwritten -> the set
   of LOI render jobs. Used by both the CLI (scripts/render_lois.jsx) and the
   render service (server/) so routing/merge-field logic lives in one place. */
import {
  autoMap, normalizeWithMap, underwrite, contactFor, buildExportRow, keyOf, DEFAULTS,
} from "./engine.js";

/**
 * @param {object[]} rawRows  raw CSV/JSON rows (any recognized headers)
 * @param {{target?: "agent"|"seller", offer?: "both"|"creative"|"cash", copies?: number}} opts
 * @returns {{kind: "creative"|"cash", d: object}[]}  one entry per document to render.
 *   `kind` "creative" is a combined document (creative + appended cash); `d` is the
 *   merge-field object from buildExportRow (creative includes cash fields).
 */
export function expandJobs(rawRows, { target = "agent", offer = "both", copies = 1 } = {}) {
  if (!rawRows || !rawRows.length) return [];
  const mapping = autoMap(Object.keys(rawRows[0] || {}));
  const norm = normalizeWithMap(rawRows, mapping);

  const scored = norm.map((r) => {
    const u = underwrite(r, DEFAULTS);
    return { r, u, creativeOK: u.creative_ok, cashOK: u.cash_ok, contact: contactFor(r, target) };
  });

  const isReady = (x) => (offer === "creative" ? x.creativeOK : offer === "cash" ? x.cashOK : (x.creativeOK || x.cashOK));

  // duplicate-contact counts among ready rows (mirrors the UI/CLI)
  const counts = new Map();
  scored.forEach((x) => {
    if (isReady(x) && x.contact.email) { const k = keyOf(x.contact.email); counts.set(k, (counts.get(k) || 0) + 1); }
  });
  const dupOf = (x) => (x.contact.email ? counts.get(keyOf(x.contact.email)) || 1 : 1);

  const ready = scored.filter(isReady);
  const jobs = [];
  for (let c = 0; c < Math.max(1, copies); c++) {
    for (const x of ready) {
      const kind = offer === "cash" ? "cash" : offer === "creative" ? "creative" : (x.creativeOK ? "creative" : "cash");
      jobs.push({ kind, d: buildExportRow(x, target, kind, dupOf(x)) });
    }
  }
  return jobs;
}

export const slugify = (str) =>
  String(str || "property").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);
