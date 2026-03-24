"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    // Look up role from public.users by email (source of truth).
    // Email lookup is used instead of ID to handle any case where
    // auth.users.id and public.users.id differ.
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("email", authData.user.email!)
      .single();

    const role = userData?.role;
    if (role === "admin") {
      router.push("/admin/dashboard");
    } else if (role === "faculty") {
      router.push("/faculty/dashboard");
    } else {
      router.push("/simulation");
    }
  }

  return (
    <div
      style={{ backgroundColor: "#17153A" }}
      className="relative min-h-screen flex items-center justify-center px-4"
    >
      {/* Subtle radial gradient texture overlay */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(158,48,57,0.08) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      {/* Card */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
          maxWidth: "420px",
          width: "100%",
          padding: "clamp(32px, 5vw, 48px)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* 1. Logo / wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700,
              fontSize: "22px",
              color: "#17153A",
              lineHeight: 1,
            }}
          >
            BWXT
          </span>
          <div
            aria-hidden="true"
            style={{
              width: "1px",
              height: "16px",
              backgroundColor: "#E0DFF0",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 400,
              fontSize: "13px",
              color: "#9896B0",
              lineHeight: 1,
            }}
          >
            Leadership Academy
          </span>
        </div>

        {/* 2. Heading */}
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 700,
            fontSize: "28px",
            color: "#17153A",
            textAlign: "center",
            marginBottom: "8px",
            lineHeight: 1.2,
          }}
        >
          Enterprise Decision Simulator
        </h1>

        {/* 3. Subheading */}
        <p
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            color: "#5A5880",
            textAlign: "center",
            marginBottom: "32px",
            lineHeight: 1.5,
          }}
        >
          Senior leadership pre-work for the BWXT Leadership Academy.
        </p>

        <form onSubmit={handleSubmit}>
            {/* Email field */}
            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontWeight: 500,
                  fontSize: "13px",
                  color: "#17153A",
                  marginBottom: "8px",
                }}
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
                style={{
                  display: "block",
                  width: "100%",
                  height: "44px",
                  border: "1px solid #E0DFF0",
                  borderRadius: "8px",
                  padding: "0 14px",
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: "15px",
                  color: "#17153A",
                  backgroundColor: "#FFFFFF",
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "border-color 100ms, box-shadow 100ms",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#17153A";
                  e.target.style.boxShadow = "0 0 0 3px rgba(23,21,58,0.10)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E0DFF0";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password field */}
            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontWeight: 500,
                  fontSize: "13px",
                  color: "#17153A",
                  marginBottom: "8px",
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  display: "block",
                  width: "100%",
                  height: "44px",
                  border: "1px solid #E0DFF0",
                  borderRadius: "8px",
                  padding: "0 14px",
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: "15px",
                  color: "#17153A",
                  backgroundColor: "#FFFFFF",
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "border-color 100ms, box-shadow 100ms",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#17153A";
                  e.target.style.boxShadow = "0 0 0 3px rgba(23,21,58,0.10)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E0DFF0";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  marginBottom: "16px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(158,48,57,0.07)",
                  border: "1px solid rgba(158,48,57,0.25)",
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: "13px",
                  color: "#5A5880",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                display: "block",
                width: "100%",
                height: "48px",
                backgroundColor: loading ? "#2E2B5E" : "#17153A",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: loading ? 400 : 600,
                fontStyle: loading ? "italic" : "normal",
                fontSize: "15px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 150ms",
              }}
              onMouseEnter={(e) => {
                if (!loading) (e.target as HTMLButtonElement).style.backgroundColor = "#0E0C27";
              }}
              onMouseLeave={(e) => {
                if (!loading) (e.target as HTMLButtonElement).style.backgroundColor = "#17153A";
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
      </div>
    </div>
  );
}
