/**
 * Batch LOI renderer (proof of concept for the "render thousands of PDFs" path).
 *
 * Pipeline: sample/CSV list -> shared engine (normalize + underwrite) -> pick
 * ready rows -> render a per-property LOI PDF with @react-pdf/renderer -> write
 * a clean manifest.csv that references each PDF (this is the CRM-agnostic export
 * described in the design notes; swap the local FS writes for Supabase Storage
 * uploads + signed URLs to productionize).
 *
 * Run: npm run render:lois -- [--offer both|creative|cash] [--target agent|seller]
 *                            [--copies N] [--concurrency N] [--csv path] [--out dir]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToFile } from "@react-pdf/renderer";
import Papa from "papaparse";
import React from "react";

import {
  SEED, autoMap, normalizeWithMap, underwrite, contactFor, buildExportRow, toCSV, keyOf, DEFAULTS,
} from "../lib/engine.js";
import CreativeLOI from "../lib/loi/CreativeLOI.jsx";
import CashLOI from "../lib/loi/CashLOI.jsx";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

function parseArgs(argv) {
  const a = { offer: "both", target: "agent", copies: 1, concurrency: 8, csv: null, out: "out/lois" };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--offer") a.offer = argv[++i];
    else if (k === "--target") a.target = argv[++i];
    else if (k === "--copies") a.copies = Math.max(1, parseInt(argv[++i], 10) || 1);
    else if (k === "--concurrency") a.concurrency = Math.max(1, parseInt(argv[++i], 10) || 8);
    else if (k === "--csv") a.csv = argv[++i];
    else if (k === "--out") a.out = argv[++i];
  }
  return a;
}

const slug = (str) => String(str || "property").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);

async function pool(items, concurrency, worker) {
  const results = [];
  let idx = 0, done = 0;
  const total = items.length;
  const runNext = async () => {
    while (idx < items.length) {
      const cur = idx++;
      results[cur] = await worker(items[cur], cur);
      done++;
      if (done % 25 === 0 || done === total) process.stdout.write(`\r  rendered ${done}/${total} PDFs`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runNext));
  process.stdout.write("\n");
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { target, offer } = args;

  // 1) Load rows and run the shared engine.
  let rawRows;
  if (args.csv) {
    const text = fs.readFileSync(path.resolve(ROOT, args.csv), "utf8");
    rawRows = Papa.parse(text, { header: true, skipEmptyLines: true }).data;
  } else {
    rawRows = SEED;
  }
  const mapping = autoMap(Object.keys(rawRows[0] || {}));
  const norm = normalizeWithMap(rawRows, mapping);

  const scored = norm.map((r) => {
    const u = underwrite(r, DEFAULTS);
    return { r, u, creativeOK: u.creative_ok, cashOK: u.cash_ok, contact: contactFor(r, target) };
  });

  // duplicate-contact counts among ready rows (mirrors the UI)
  const isReady = (x) => offer === "creative" ? x.creativeOK : offer === "cash" ? x.cashOK : (x.creativeOK || x.cashOK);
  const counts = new Map();
  scored.forEach((x) => { if (isReady(x) && x.contact.email) { const k = keyOf(x.contact.email); counts.set(k, (counts.get(k) || 0) + 1); } });
  const dupOf = (x) => (x.contact.email ? counts.get(keyOf(x.contact.email)) || 1 : 1);

  // 2) Expand into one render job per (property x template), honoring --copies.
  const jobs = [];
  const readyRows = scored.filter(isReady);
  for (let copy = 0; copy < args.copies; copy++) {
    for (const x of readyRows) {
      const templates = offer === "creative" ? ["creative"] : offer === "cash" ? ["cash"] : [
        ...(x.creativeOK ? ["creative"] : []), ...(x.cashOK ? ["cash"] : []),
      ];
      for (const t of templates) jobs.push({ x, template: t, copy });
    }
  }

  if (!jobs.length) {
    console.log("No ready offers for the current mode — nothing to render.");
    return;
  }

  const outDir = path.resolve(ROOT, args.out);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Salvo LOI batch — target=${target} offer=${offer} copies=${args.copies} concurrency=${args.concurrency}`);
  console.log(`  ${readyRows.length} ready properties -> ${jobs.length} PDF(s) into ${path.relative(ROOT, outDir)}/`);

  const t0 = Date.now();

  // 3) Render each PDF (concurrency-limited) and collect manifest rows.
  const manifest = await pool(jobs, args.concurrency, async (job, i) => {
    const d = buildExportRow(job.x, target, job.template, dupOf(job.x));
    const seq = String(i + 1).padStart(4, "0");
    const suffix = args.copies > 1 ? `-${job.copy + 1}` : "";
    const file = `${seq}-${slug(d.Address)}${suffix}-${job.template}.pdf`;
    const element = job.template === "creative"
      ? React.createElement(CreativeLOI, { d })
      : React.createElement(CashLOI, { d });
    await renderToFile(element, path.join(outDir, file));
    return { ...d, "LOI Template": job.template === "creative" ? "Creative" : "Cash", "LOI File": file };
  });

  // 4) Write the clean manifest CSV that references every PDF.
  const manifestPath = path.join(outDir, "manifest.csv");
  fs.writeFileSync(manifestPath, toCSV(manifest));

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  done: ${manifest.length} PDFs in ${secs}s (${(manifest.length / secs).toFixed(0)}/s)`);
  console.log(`  manifest: ${path.relative(ROOT, manifestPath)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
