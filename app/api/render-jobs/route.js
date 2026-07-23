/* Vercel-appropriate server render endpoint.
 *
 * POST /api/render-jobs  { offer?, target?, copies?, rows? }
 * Renders the selected LOIs on the server, uploads each to storage (Supabase
 * when configured, else local FS in dev), and returns a manifest with signed
 * URLs. Runs synchronously within the request (fine for interactive batches);
 * for very large batches, offload to a queue/worker as in server/.
 */
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { SEED, toCSV } from "../../../lib/engine.js";
import { expandJobs, slugify } from "../../../lib/pipeline.js";
import { renderLOI } from "../../../server/render.js";
import { storage, storageKind } from "../../../server/storage.js";

export const runtime = "nodejs";
export const maxDuration = 60;

async function pool(items, concurrency, worker) {
  let idx = 0;
  const runNext = async () => {
    while (idx < items.length) {
      const cur = idx++;
      await worker(items[cur], cur);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runNext));
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { offer = "both", target = "agent", copies = 1, rows } = body || {};
  const raw = Array.isArray(rows) && rows.length ? rows : SEED;

  const jobs = expandJobs(raw, { target, offer, copies: Number(copies) || 1 });
  if (!jobs.length) return NextResponse.json({ error: "no ready offers for this selection" }, { status: 400 });

  const id = randomUUID();
  const manifest = new Array(jobs.length);
  await pool(jobs, 6, async (job, i) => {
    const d = job.d;
    const file = `${String(i + 1).padStart(4, "0")}-${slugify(d.Address)}-${job.kind}.pdf`;
    const key = `${id}/${file}`;
    await storage.put(key, await renderLOI(job.kind, d));
    manifest[i] = { ...d, "LOI Template": job.kind === "creative" ? "Creative + Cash" : "Cash", "LOI File": file, "LOI URL": await storage.signedUrl(key) };
  });
  await storage.put(`${id}/manifest.csv`, Buffer.from(toCSV(manifest), "utf8"));

  return NextResponse.json({ id, count: manifest.length, storage: storageKind, manifest });
}
