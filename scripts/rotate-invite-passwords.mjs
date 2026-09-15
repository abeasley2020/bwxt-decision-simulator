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
 * afterwards.
 *
 * The new passwords are WRITTEN TO A LOCAL FILE, not discarded. That is
 * deliberate: this project's Supabase instance cannot currently send mail
 * (POST /auth/v1/recover returns 500, "Error sending recovery email"), so the
 * "forgot password" flow does not work. Discarding the new passwords would
 * lock every account out permanently with no recovery path.
 *
 * Distribute each password to its owner over a channel you trust, tell them to
 * change it on first sign-in, then DELETE the output file. Once Supabase SMTP
 * is configured, prefer --no-capture and let people self-serve a reset.
 *
 * Usage
 * -----
 *   node scripts/rotate-invite-passwords.mjs            # dry run, changes nothing
 *   node scripts/rotate-invite-passwords.mjs --apply    # rotate, capture to a file
 *   node scripts/rotate-invite-passwords.mjs --apply --no-capture   # discard passwords
 *   node scripts/rotate-invite-passwords.mjs --apply --email someone@example.com
 *
 * Captured output defaults to _audit/, which is gitignored.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL, which are
 * read from .env.local. Run it from the repository root.
 *
 * BEFORE YOU RUN WITH --apply
 * ---------------------------
 * Rotate one test account first with --email. Keep the capture file unless you
 * have verified that password-reset email actually delivers.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
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
const capture = !args.includes("--no-capture");
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
const captured = [];

for (const u of users) {
  const masked = (u.email || u.id).replace(/^(.).*(@.*)$/, "$1***$2");
  if (!apply) {
    console.log(`  would rotate  ${masked}`);
    continue;
  }
  const pw = newPassword();
  const res = await fetch(`${url}/auth/v1/admin/users/${u.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ password: pw }),
  });
  if (res.ok) {
    // Invalidate any live session so an already-signed-in browser cannot persist.
    await fetch(`${url}/auth/v1/admin/users/${u.id}/logout`, { method: "POST", headers }).catch(() => {});
    console.log(`  rotated       ${masked}`);
    if (capture) captured.push({ email: u.email ?? u.id, password: pw });
    ok++;
  } else {
    console.log(`  FAILED        ${masked}  ${res.status} ${await res.text()}`);
    failed++;
  }
}

if (apply) {
  console.log(`\nRotated ${ok}, failed ${failed}.`);
  if (capture && captured.length > 0) {
    mkdirSync("_audit", { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const out = `_audit/rotated-credentials-${stamp}.txt`;
    const body = [
      "BWXT Enterprise Decision Simulator - rotated temporary passwords",
      `Generated ${new Date().toISOString()}`,
      "",
      "These replace the shared password that was hardcoded in the invite route",
      "and is present in git history. Distribute each one to its owner over a",
      "channel you trust, tell them to change it on first sign-in, then DELETE",
      "THIS FILE.",
      "",
      "Password-reset email is not working on this Supabase project, so there is",
      "no self-service recovery path until SMTP is configured.",
      "",
      ...captured.map((r) => `${r.email}\t${r.password}`),
      "",
    ].join("\n");
    writeFileSync(out, body, { mode: 0o600 });
    console.log(`\nNew passwords written to ${out} (gitignored, mode 0600).`);
    console.log("Distribute them, then delete that file.");
  } else if (capture) {
    console.log("Nothing rotated, so no capture file was written.");
  } else {
    console.log("New passwords were discarded (--no-capture).");
    console.log("This is only safe if password-reset email is known to work.");
  }
} else {
  console.log("\nNothing was changed. Re-run with --apply to perform the rotation.");
}
