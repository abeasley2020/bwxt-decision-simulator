"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out error:", error);
    }
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-[13px] font-normal text-white/60 hover:text-white transition-colors duration-150"
    >
      Sign out
    </button>
  );
}
