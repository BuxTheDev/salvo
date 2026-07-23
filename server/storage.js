/* Storage abstraction for rendered LOIs.
 *
 * Default: local filesystem driver (writes under out/server-store/files/),
 * with "signed URLs" that point back at this server's /files route — enough to
 * run and test the whole flow with no external services.
 *
 * If SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set (e.g. via Cursor
 * secrets), it switches to a Supabase Storage driver: real uploads + real
 * time-limited signed URLs. Bucket defaults to "loi" (SUPABASE_LOI_BUCKET).
 *
 * The API is identical either way, so the rest of the service is
 * storage-agnostic and productionizing is just setting env vars.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_ROOT = path.join(ROOT, "out", "server-store", "files");
const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 8787}`;

function localDriver() {
  const full = (key) => path.join(LOCAL_ROOT, key);
  return {
    kind: "local",
    async put(key, buf) {
      const p = full(key);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, buf);
    },
    async exists(key) {
      return fs.existsSync(full(key));
    },
    async getBuffer(key) {
      return fs.promises.readFile(full(key));
    },
    // No real signing locally — return a URL to this server's /files route.
    async signedUrl(key) {
      return `${PUBLIC_BASE}/files/${key.split("/").map(encodeURIComponent).join("/")}`;
    },
  };
}

function supabaseDriver(url, serviceKey) {
  const bucket = process.env.SUPABASE_LOI_BUCKET || "loi";
  const expiresIn = Number(process.env.SUPABASE_SIGNED_URL_TTL || 60 * 60 * 24 * 7); // 7 days
  let clientPromise = null;
  const client = async () => {
    if (!clientPromise) {
      clientPromise = import("@supabase/supabase-js").then(({ createClient }) => createClient(url, serviceKey));
    }
    return clientPromise;
  };
  return {
    kind: "supabase",
    async put(key, buf) {
      const supa = await client();
      const { error } = await supa.storage.from(bucket).upload(key, buf, { contentType: "application/pdf", upsert: true });
      if (error) throw error;
    },
    async exists(key) {
      const supa = await client();
      const { error } = await supa.storage.from(bucket).createSignedUrl(key, 60);
      return !error;
    },
    async getBuffer(key) {
      const supa = await client();
      const { data, error } = await supa.storage.from(bucket).download(key);
      if (error) throw error;
      return Buffer.from(await data.arrayBuffer());
    },
    async signedUrl(key) {
      const supa = await client();
      const { data, error } = await supa.storage.from(bucket).createSignedUrl(key, expiresIn);
      if (error) throw error;
      return data.signedUrl;
    },
  };
}

// Accept the classic service-role key or the newer Supabase secret key naming.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
export const storage = url && key ? supabaseDriver(url, key) : localDriver();
export const storageKind = storage.kind;
