import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseServerConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Server-only Supabase client using the service role key. Used by API
 * routes / Edge Functions that need to bypass RLS (e.g. batch import,
 * GHL push queueing). Returns null until credentials are configured.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!supabaseServerConfigured) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false },
  });
}
