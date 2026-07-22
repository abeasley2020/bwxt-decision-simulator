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

Database: Supabase. `src/db/seed.sql` is applied manually in the Supabase SQL editor (deterministic UUIDs; scenario version `20000000-...-0001`). `.env.local` needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`.

## Architecture

Three layers, strictly separated:

1. **Content** (`src/content/iron-horizon/`): authored scenario text, decisions, options, effect rules, profiles. Never hardcode scenario content in components or pages; it lives here and is loaded into the DB via seed.
2. **Engine** (`src/engine/`): pure functions, no framework imports, mirrors schema-map types. `effects.ts` applies option effect rules (kpi / score / hidden_trait) to state; resource-allocation effects scale by allocated percent. `profiling.ts` assigns profiles by priority-ordered first-match rules, with a highest-dimension fallback.
3. **App** (`src/app/`): App Router pages and API routes. Server components query Supabase directly; mutations go through `/api/` routes which re-validate against content and re-run the engine server-side.

### State model (the part that bites)

- KPI/score state is snapshot-based: `initial` then one `round_end` per round. **No `final` snapshot type is ever written**; final values are round 3's `round_end`. Round N baselines come from round N-1's `round_end`.
- `selected_option_ids_json` stores option **keys** (e.g. `r1_pri_revenue`), not UUIDs. `allocation_json` is keyed by option key with percent values.
- **Hidden traits are not persisted.** Round submit computes them and drops them. Anything needing traits (profile assignment) must replay stored `decision_responses` through `deriveAcquiredTraits` in `src/engine/effects.ts`; the server helper is `src/lib/simulation/loadAcquiredTraits.ts`.
- Profile assignment persists `final_profile_id` on first results/dashboard view and short-circuits afterward. Clearing that column forces reassignment on next view.

### Two profile-rule sets exist; the DB one wins

`performance_profiles` + `profile_rules` in the DB (seeded from `seed.sql`) are what production assignment uses. The richer trait-gated rules in `src/content/iron-horizon/profiles.ts` are the fallback when the DB is unseeded, and are used by the static walkthrough. The two sets are intentionally different today (DB rules are trait-free with a `{}` catch-all on functional_optimizer; content rules use traits and have no catch-all). If you change rule semantics, decide explicitly whether both layers change, and remember the live DB does not update itself from seed.sql.

### Auth and identity

- Magic-link auth via Supabase; middleware (`src/lib/supabase/middleware.ts`) only redirects unauthenticated users to `/login`. Role checks happen in page components, not middleware.
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
- No em dashes in any authored copy, comments, or docs.
