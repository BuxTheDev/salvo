/* In-process render-job queue with a bounded-concurrency worker.
 *
 * This models the production pattern (enqueue -> worker renders in parallel,
 * bounded, idempotent, resumable -> store each PDF -> write a manifest) while
 * running in a single Node process. To scale horizontally, swap this module for
 * a real queue (Supabase Queues / pgmq, Inngest, Trigger.dev, QStash) and run
 * the same renderLOI() in workers — the rest of the service is unchanged.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { expandJobs, slugify } from "../lib/pipeline.js";
import { toCSV } from "../lib/engine.js";
import { renderLOI } from "./render.js";
import { storage } from "./storage.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JOBS_DIR = path.join(ROOT, "out", "server-store", "jobs");
const CONCURRENCY = Math.max(1, Number(process.env.RENDER_CONCURRENCY || 8));

const jobs = new Map();

function persist(job) {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
  const { docs, ...meta } = job; // keep the on-disk record lightweight
  fs.writeFileSync(path.join(JOBS_DIR, `${job.id}.json`), JSON.stringify({ ...meta, count: docs?.length ?? 0 }, null, 2));
}

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

export function createJob(rawRows, { target = "agent", offer = "both", copies = 1 } = {}) {
  const id = randomUUID();
  const specs = expandJobs(rawRows, { target, offer, copies });
  const docs = specs.map((spec, i) => ({
    seq: i + 1,
    kind: spec.kind,
    d: spec.d,
    file: `${String(i + 1).padStart(4, "0")}-${slugify(spec.d.Address)}-${spec.kind}.pdf`,
  }));
  const job = {
    id, status: "queued", target, offer, copies,
    total: docs.length, done: 0, failed: 0,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    docs,
  };
  jobs.set(id, job);
  persist(job);
  // Kick off processing without blocking the request.
  setImmediate(() => processJob(id).catch((e) => {
    job.status = "error"; job.error = String(e?.message || e); job.updatedAt = new Date().toISOString(); persist(job);
  }));
  return job;
}

async function processJob(id) {
  const job = jobs.get(id);
  if (!job || job.status === "running") return;
  job.status = "running"; job.updatedAt = new Date().toISOString(); persist(job);

  await pool(job.docs, CONCURRENCY, async (doc) => {
    try {
      const key = `${id}/${doc.file}`;
      if (!(await storage.exists(key))) {
        const buf = await renderLOI(doc.kind, doc.d);
        await storage.put(key, buf);
      }
      doc.key = key;
      job.done++;
    } catch (e) {
      doc.error = String(e?.message || e);
      job.failed++;
    }
    job.updatedAt = new Date().toISOString();
    if ((job.done + job.failed) % 25 === 0) persist(job);
  });

  // Write the manifest CSV (with signed URLs) into storage too.
  const rows = [];
  for (const doc of job.docs) {
    if (!doc.key) continue;
    rows.push({ ...doc.d, "LOI Template": doc.kind === "creative" ? "Creative + Cash" : "Cash", "LOI File": doc.file, "LOI URL": await storage.signedUrl(doc.key) });
  }
  const manifestKey = `${id}/manifest.csv`;
  await storage.put(manifestKey, Buffer.from(toCSV(rows), "utf8"));
  job.manifestKey = manifestKey;
  job.status = job.failed && !job.done ? "error" : "done";
  job.updatedAt = new Date().toISOString();
  persist(job);
}

export function getJob(id) {
  return jobs.get(id);
}

export function jobStatus(job) {
  if (!job) return null;
  const { id, status, target, offer, copies, total, done, failed, createdAt, updatedAt, error } = job;
  return { id, status, target, offer, copies, total, done, failed, createdAt, updatedAt, error };
}

export async function jobManifestRows(job) {
  const rows = [];
  for (const doc of job.docs) {
    if (!doc.key) continue;
    rows.push({ ...doc.d, "LOI Template": doc.kind === "creative" ? "Creative + Cash" : "Cash", "LOI File": doc.file, "LOI URL": await storage.signedUrl(doc.key) });
  }
  return rows;
}
