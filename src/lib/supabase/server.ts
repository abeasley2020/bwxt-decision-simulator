/**
 * Supabase server-side client (Next.js App Router / Server Components)
 * Uses @supabase/ssr for cookie-based session management.
 *
 * Next 15 made next/headers cookies() async, so createClient() is async too
 * and must be awaited. Resolving the cookie store here rather than inside the
 * getAll/setAll callbacks is what lets Next detect the dynamic usage at the
 * right point and mark these routes server-rendered without throwing during
 * static generation.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from a Server Component, where cookies are
            // read-only. Middleware handles session refresh in that case.
          }
        },
      },
    }
  );
}
