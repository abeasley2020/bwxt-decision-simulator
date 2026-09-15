/**
 * Supabase auth callback route
 * Handles magic link redirect and exchanges the code for a session.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Accepts only same-origin relative paths, so a crafted `next` parameter
 * cannot turn the callback into an open redirect.
 */
function safeNextPath(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return null;
  }
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If an explicit next param was provided, honour it; otherwise route by role
      const nextPath = safeNextPath(next);
      if (nextPath) {
        return NextResponse.redirect(`${origin}${nextPath}`);
      }

      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const role = userData?.role;
      if (role === "admin") {
        return NextResponse.redirect(`${origin}/admin/dashboard`);
      } else if (role === "faculty") {
        return NextResponse.redirect(`${origin}/faculty/dashboard`);
      } else {
        return NextResponse.redirect(`${origin}/simulation`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_link`);
}
