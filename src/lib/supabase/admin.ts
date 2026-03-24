/**
 * Supabase admin client — uses the service-role key.
 *
 * Only import this from API routes (server-side). Never expose the
 * service_role key to the browser or include it in client bundles.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in your environment:
 *   Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
 *   (find it in Supabase Dashboard → Project Settings → API → service_role)
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local."
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
