/* Verifies the Supabase wiring once SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are
 * present in the environment:
 *   1) ensures the private LOI storage bucket exists (creates it if missing),
 *   2) uploads a tiny object and prints a signed URL (proves Storage + signing),
 *   3) probes the core tables to confirm the schema migration was applied.
 *
 * Run: npm run supabase:check
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
const bucket = process.env.SUPABASE_LOI_BUCKET || "loi";

if (!url || !key) {
  console.log("Supabase env not present in this session (need SUPABASE_URL + a service/secret key).");
  console.log("Secrets are injected into a NEW agent session, so run this after the environment restarts.");
  process.exit(2);
}

const supa = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  console.log(`Supabase project: ${url}`);

  // 1) bucket
  const { data: buckets, error: be } = await supa.storage.listBuckets();
  if (be) throw be;
  if (!buckets.find((b) => b.name === bucket)) {
    const { error } = await supa.storage.createBucket(bucket, { public: false });
    if (error) throw error;
    console.log(`bucket: created "${bucket}" (private)`);
  } else {
    console.log(`bucket: "${bucket}" already exists`);
  }

  // 2) upload + signed url
  const keyPath = `_healthcheck/${Date.now()}.txt`;
  const up = await supa.storage.from(bucket).upload(keyPath, Buffer.from("salvo ok"), { contentType: "text/plain", upsert: true });
  if (up.error) throw up.error;
  const signed = await supa.storage.from(bucket).createSignedUrl(keyPath, 300);
  if (signed.error) throw signed.error;
  console.log("storage upload + signed URL: ok");
  console.log("  ", signed.data.signedUrl);

  // 3) schema probe
  for (const t of ["organizations", "properties", "offers", "loi_documents", "campaigns", "suppressions"]) {
    const { error } = await supa.from(t).select("*").limit(1);
    console.log(`table ${t}: ${error ? "MISSING/err — " + error.message : "ok"}`);
  }

  console.log("\nSupabase check complete.");
}

main().catch((e) => { console.error("Supabase check failed:", e.message || e); process.exit(1); });
