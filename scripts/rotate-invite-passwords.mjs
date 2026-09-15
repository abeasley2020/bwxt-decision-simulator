#!/usr/bin/env node
/**
 * Rotate every Supabase Auth password.
 *
 * Why this exists
 * ---------------
 * Until commit 0408872, src/app/api/admin/cohorts/[cohortId]/invite/route.ts
 * provisioned every account with the literal password "Welcome2024!" and
 * email_confirm: true. That string is in the git history, so every account
 * created through the invite flow must be treated as exposed, whether or not
 * the person later changed their password.
 *
 * What it does
 * ------------
 * Assigns a fresh cryptographically random password to every auth user and
 * signs out their existing sessions. Nobody can sign in with the old string
 * afterwards. Because the new passwords are never displayed, each user
 * recovers through the normal "forgot password" flow.
 *
 * Usage
 * -----
 *   node scripts/rotate-invite-passwords.mjs            # dry run, changes nothing
 *   node scripts/rotate-invite-passwords.mjs --apply    # performs the rotation
 *   node scripts/rotate-invite-passwords.mjs --apply --email someone@example.com
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL, which are
 * read from .env.local. Run it from the repository root.
 *
 * BEFORE YOU RUN WITH --apply
 * ---------------------------
 * Confirm Supabase can actually send password-reset email (Authentication ->
 * Emails). If it cannot, everyone is locked out with no recovery path.
 * Rotate one test account first with --email.
 */

import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // fall through to process.env
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

const newPassword = () => `${randomBytes(24).toString("base64url")}Aa1!`;

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const onlyEmail = (() => {
  const i = args.indexOf("--email");
  return i !== -1 ? args[i + 1] : null;
})();

const { url, key } = loadEnv();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const listRes = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers });
if (!listRes.ok) {
  console.error(`Could not list users: ${listRes.status} ${await listRes.text()}`);
  process.exit(1);
}

let users = (await listRes.json()).users ?? [];
if (onlyEmail) {
  users = users.filter((u) => (u.email || "").toLowerCase() === onlyEmail.toLowerCase());
  if (users.length === 0) {
    console.error(`No account found for ${onlyEmail}.`);
    process.exit(1);
  }
}

console.log(`${apply ? "ROTATING" : "DRY RUN — would rotate"} ${users.length} account(s).\n`);

let ok = 0;
let failed = 0;

for (const u of users) {
  const masked = (u.email || u.id).replace(/^(.).*(@.*)$/, "$1***$2");
  if (!apply) {
    console.log(`  would rotate  ${masked}`);
    continue;
  }
  const res = await fetch(`${url}/auth/v1/admin/users/${u.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ password: newPassword() }),
  });
  if (res.ok) {
    // Invalidate any live session so an already-signed-in browser cannot persist.
    await fetch(`${url}/auth/v1/admin/users/${u.id}/logout`, { method: "POST", headers }).catch(() => {});
    console.log(`  rotated       ${masked}`);
    ok++;
  } else {
    console.log(`  FAILED        ${masked}  ${res.status} ${await res.text()}`);
    failed++;
  }
}

if (apply) {
  console.log(`\nRotated ${ok}, failed ${failed}.`);
  console.log("New passwords were not printed anywhere by design.");
  console.log("Tell each person to sign in via 'Forgot password' to set their own.");
} else {
  console.log("\nNothing was changed. Re-run with --apply to perform the rotation.");
}
