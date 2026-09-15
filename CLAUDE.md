# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Tracker Project: BWXT Enterprise Decision Simulator

## What this is

Executive leadership diagnostic for the BWXT Leadership Academy, used as async pre-work. Participants play Operation Iron Horizon (3 rounds, 12 decisions), get scored across 8 KPIs and 7 leadership dimensions, and are assigned 1 of 8 performance profiles. Faculty and admin surfaces aggregate the results. The engine is deterministic; there is no AI in the core simulation, by design.

Source of truth for scope and data model: `bwxt-spec.md` and `schema-map.md`. Follow schema-map naming exactly. Read `STATUS.md` at session start for current state and next steps.

## Commands

```bash
npm run dev          # dev server on :3000
npm run build        # production build (the main verification gate)
npm run type-check   # tsc --noEmit
npm run lint
```

There is no test suite. Engine changes are verified by compiling `src/engine/` + `src/content/` to CJS with tsc (path-alias imports are type-only, so they erase) and running assertion scripts against the compiled output. See the pattern in git history around commit `aff3be5`'s follow-up fixes.

Database: Supabase, applied manually in the SQL editor. See "Database provisioning" below for the file order; it is no longer a single seed file. `.env.local` needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. `RESEND_API_KEY` was listed here previously and is read by no code; nothing in this app sends email.

## Database provisioning

Apply in this order. Every file is idempotent.

1. `src/db/schema.sql` (fresh database only)
2. `src/db/policies.sql` (**required**, see below)
3. `src/db/seed.sql` scenario, version, rounds, all 12 decision templates, 8 profiles and their rules
4. `src/db/seed-round-1.sql`, `seed-round-2.sql`, `seed-round-3.sql` options and effect rules
5. `src/db/seed-verify.sql` read the row counts it prints
6. `src/db/seed-dev-cohort.sql` local and staging only, never production

On an existing database also apply `src/db/migrations/` in numeric order.

The scenario version UUID is **not** hardcoded anywhere any more. Production's only `scenario_versions` row is `fad1d4c9-a52b-42b2-96da-ff596aef7c86`; the seeds resolve it by `(scenario key, version_label)` so the same files work against production, a fresh local database, or a future v1.1. Earlier revisions of the seeds and of this file named `20000000-0000-0000-0000-000000000001`, which exists nowhere, and following that procedure against production would have created a second parallel scenario version. Round, template, option, rule and profile UUIDs are still deterministic and are referenced by foreign keys from participant data, so they stay literal.

**RLS is applied out of band.** Row level security lives only in `src/db/policies.sql` and is not part of any migration the app runs. It must be applied by hand after `schema.sql`. Until it is, the public anon key can read and write every table, including `users` and `invitations`. Read the header of that file before applying it; it carries the verification and rollback procedure.

The app reads far less from these tables than the seeds write. It selects only `id, round_number` from `scenario_rounds` and `id, key, scenario_round_id` from `decision_templates`, and never queries `decision_options` or `decision_effect_rules` at all. All narrative text and all scoring effects come from `src/content/iron-horizon`, which the API routes import directly. `kpi_definitions` and `scoring_dimensions` are empty in production by design; the engine defines both in code.

## Architecture

Three layers, strictly separated:

1. **Content** (`src/content/iron-horizon/`): authored scenario text, decisions, options, effect rules, profiles. Never hardcode scenario content in components or pages; it lives here, and the engine reads it directly. Orientation copy in particular is fully structured in `scenario.ts` (`SCENARIO_ROLE_TITLE`, `SCENARIO_BRIEF_PARAGRAPHS`, `SCENARIO_CHALLENGES`, `SCENARIO_PREFLIGHT_NOTES`); the orientation page renders from those exports. It used to restate them inline and the two copies drifted, so an SME editing the content file saw no change in the product.
2. **Engine** (`src/engine/`): pure functions, no framework imports, mirrors schema-map types. `effects.ts` applies option effect rules (kpi / score / hidden_trait) to state; resource-allocation effects scale by allocated percent. `profiling.ts` assigns profiles by priority-ordered first-match rules, with a highest-dimension fallback.
3. **App** (`src/app/`): App Router pages and API routes. Server components query Supabase directly; mutations go through `/api/` routes which re-validate against content and re-run the engine server-side.

### State model (the part that bites)

- KPI/score state is snapshot-based: `initial` then one `round_end` per round. **No `final` snapshot type is ever written**; final values are round 3's `round_end`. Round N baselines come from round N-1's `round_end`.
- `selected_option_ids_json` stores option **keys** (e.g. `r1_pri_revenue`), not UUIDs. `allocation_json` is keyed by option key with percent values.
- **Hidden traits are not persisted.** Round submit computes them and drops them. Anything needing traits (profile assignment) must replay stored `decision_responses` through `deriveAcquiredTraits` in `src/engine/effects.ts`; the server helper is `src/lib/simulation/loadAcquiredTraits.ts`.
- Profile assignment persists `final_profile_id` on first results/dashboard view and short-circuits afterward. Clearing that column forces reassignment on next view.

### Round 3 exists twice, and the two versions disagree

`src/content/iron-horizon/rounds/round-3.ts` and the Round 3 rows in production are different authored sets: different option labels and descriptions, different prompts, `r3_modernization` is `multi_select` in content and `single_select` in the DB, 77 effect rules in content against 40 in the DB, and the DB has zero `hidden_trait` rules for Round 3 where content has 8. Participants experience the **content** version, because the submit route scores against `IRON_HORIZON_VERSION` and never reads `decision_options` or `decision_effect_rules`. The DB rows are inert today but are now captured in `src/db/seed-round-3.sql` (they previously existed in no file at all, having been applied to production by hand). Picking a canonical Round 3 and regenerating the other from it is an open SME decision, not a mechanical merge.

### Two profile-rule sets exist; the DB one wins

`performance_profiles` + `profile_rules` in the DB (seeded from `src/db/seed.sql`) are what production assignment uses. The richer trait-gated rules in `src/content/iron-horizon/profiles.ts` are the fallback when the DB is unseeded, and are used by the static walkthrough. The two sets are intentionally different today (DB rules are trait-free with a `{}` catch-all on functional_optimizer; content rules use traits and have no catch-all). If you change rule semantics, decide explicitly whether both layers change, and remember the live DB does not update itself from seed.sql.

### Auth and identity

- **Email and password auth** via Supabase. `src/app/login/page.tsx` calls `signInWithPassword`; nothing anywhere requests a magic link. (This file previously said magic link. It was never true of the shipped login.) There is no self-service signup: accounts are provisioned by `/api/admin/cohorts/[cohortId]/invite` using the service-role client, and credentials are delivered out of band.
- `src/app/auth/callback/route.ts` is a leftover from the magic-link design and is currently **unreachable**: `/auth/callback` is not in the middleware `publicPaths` allowlist (which lists `/auth/verify`, a route that does not exist), so an unauthenticated visitor is redirected to `/login` before it runs. Either allowlist it or delete it; do not assume it works.
- Middleware (`src/lib/supabase/middleware.ts`) only redirects unauthenticated users to `/login`. Role checks happen in page components, not middleware.
- `auth.users.id` and `public.users.id` are **not** the same. Every page/route resolves the public user by email first (`.eq("email", user.email)`) and falls back to the auth id. Follow this pattern in any new page.
- Admin/faculty pages that display other users' data must use the service-role client (`createAdminClient()` from `src/lib/supabase/admin.ts`) for the user-join queries; RLS on `users` silently empties embedded joins on the user-scoped client. Keep auth/role checks on the user-scoped client.
- Supabase embedded joins return arrays even for one-to-one FK relationships; handle both shapes.
- Cohort status transitions are draft → active → closed only, enforced in `/api/admin/cohorts/[cohortId]/status`.
- The `invitations` table has no role column; role is not tracked for not-yet-registered users.

### Public walkthrough

`/walkthrough` serves `public/walkthrough.html`, a self-contained no-login recreation of the whole simulator for SME/ID review (engine ported verbatim, synthetic faculty data labeled illustrative). It is allowlisted in middleware `publicPaths` and rewritten in `next.config.mjs`. It does not auto-update when engine or content changes; regenerate it deliberately when the product diverges.

## Conventions

- TypeScript throughout; Tailwind with the `bwxt-*` token palette in `tailwind.config.ts` (navy `#17153A`, crimson `#9E3039`); Playfair for display headings, Inter for body.
- WCAG 2.2 AA is a hard requirement on every surface: labeled inputs, `role="progressbar"` with aria values, state conveyed by symbol + text rather than color alone, `aria-live` for dynamic totals.
- Client components that mutate call `router.refresh()` afterward so server components re-render.
- Do not add npm dependencies without asking first.
- **Em dashes:** banned in code comments, SQL comments, commit messages, docs, and any prose written *about* the product. Permitted in one place only: participant-facing scenario prose inside `src/content/iron-horizon/**` string literals, and the copies of that prose in the seed files and `public/walkthrough.html`. That text is authored narrative quoted verbatim, and de-dashing it would silently edit content an SME signed off on. The carve-out was applied on 2026-07-29 ("authored chrome de-dashed, verbatim product copy keeps its dashes") and is now stated here precisely so it is not re-litigated. When in doubt: if a participant reads it in the simulation, leave the dash; otherwise remove it.
