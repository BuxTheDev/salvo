/* Salvo LOI render service.
 *
 * Endpoints:
 *   GET  /health
 *   POST /api/render-jobs            { offer?, target?, copies?, rows? }  -> 202 { id, ... }
 *        (rows omitted => uses the built-in sample list)
 *   GET  /api/render-jobs/:id        -> job status/progress
 *   GET  /api/render-jobs/:id/manifest.csv   -> manifest (one row per PDF, with signed URLs)
 *   GET  /api/render-jobs/:id/bundle.zip     -> streamed ZIP of all PDFs + manifest.csv
 *   GET  /files/*                    -> serves locally-stored PDFs (local storage driver only)
 *
 * Run: npm run server   (PORT env optional, default 8787)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import JSZip from "jszip";

import { SEED } from "../lib/engine.js";
import { toCSV } from "../lib/engine.js";
import { storage, storageKind } from "./storage.js";
import { createJob, getJob, jobStatus, jobManifestRows } from "./jobs.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_FILES = path.join(ROOT, "out", "server-store", "files");
const PORT = Number(process.env.PORT || 8787);

const app = express();
app.use(express.json({ limit: "8mb" }));
app.use((req, res, next) => { res.set("Access-Control-Allow-Origin", "*"); next(); });

app.get("/health", (req, res) => res.json({ ok: true, storage: storageKind }));

app.post("/api/render-jobs", (req, res) => {
  const { offer = "both", target = "agent", copies = 1, rows } = req.body || {};
  const rawRows = Array.isArray(rows) && rows.length ? rows : SEED;
  const job = createJob(rawRows, { target, offer, copies: Number(copies) || 1 });
  res.status(202).json(jobStatus(job));
});

app.get("/api/render-jobs/:id", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: "job not found" });
  res.json(jobStatus(job));
});

app.get("/api/render-jobs/:id/manifest.csv", async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: "job not found" });
  const rows = await jobManifestRows(job);
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="manifest-${job.id}.csv"`);
  res.send(toCSV(rows));
});

app.get("/api/render-jobs/:id/bundle.zip", async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: "job not found" });
  res.set("Content-Type", "application/zip");
  res.set("Content-Disposition", `attachment; filename="salvo_lois_${job.id}.zip"`);

  const zip = new JSZip();
  // Read one file at a time to keep memory bounded even for large batches.
  for (const doc of job.docs) {
    if (!doc.key) continue;
    zip.file(doc.file, await storage.getBuffer(doc.key));
  }
  const rows = await jobManifestRows(job);
  zip.file("manifest.csv", toCSV(rows));
  zip.generateNodeStream({ type: "nodebuffer", streamFiles: true }).pipe(res);
});

// Local storage driver: serve stored PDFs (the target of local "signed URLs").
app.use("/files", express.static(LOCAL_FILES));

app.listen(PORT, () => {
  console.log(`Salvo LOI render service on http://localhost:${PORT}  (storage: ${storageKind})`);
});
