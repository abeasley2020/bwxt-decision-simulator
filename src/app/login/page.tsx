"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Wordmark */}
        <div className="mb-10 text-center">
          <div className="text-brand-gold text-sm font-semibold tracking-widest uppercase mb-2">
            BWXT Leadership Academy
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight">
            Enterprise Decision Simulator
          </h1>
        </div>

        {submitted ? (
          <div className="bg-white/10 border border-white/20 rounded-lg p-8 text-center">
            <div className="text-brand-gold text-4xl mb-4">✓</div>
            <h2 className="text-white text-xl font-semibold mb-2">
              Check your email
            </h2>
            <p className="text-white/70 text-sm">
              We sent a secure login link to{" "}
              <span className="text-white font-medium">{email}</span>. The link
              expires in 60 minutes.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white/10 border border-white/20 rounded-lg p-8"
          >
            <div className="mb-6">
              <label
                htmlFor="email"
                className="block text-white/80 text-sm font-medium mb-2"
              >
                Work email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@bwxt.com"
                className="w-full px-4 py-3 rounded-md bg-white/5 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
              />
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-brand-gold text-brand-navy font-semibold rounded-md hover:bg-brand-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Sending link..." : "Send login link"}
            </button>

            <p className="mt-4 text-center text-white/40 text-xs">
              You must be invited to access this system.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
