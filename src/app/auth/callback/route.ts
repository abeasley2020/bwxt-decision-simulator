/**
 * Supabase auth callback route
 * Handles magic link redirect and exchanges the code for a session.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If an explicit next param was provided, honour it; otherwise route by role
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
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
