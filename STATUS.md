# STATUS: BWXT Enterprise Decision Simulator

Tracker Project: BWXT Enterprise Decision Simulator

Repo: https://github.com/abeasley2020/bwxt-decision-simulator
Stack: Next.js 14 (App Router), TypeScript, Tailwind, Supabase, Vercel
Source of truth for scope: `bwxt-spec.md` and `schema-map.md`

## Current State

**Status: Active. MVP complete and in demo phase.**

All seven build slices are delivered and deployed: scaffold and engine, orientation
and Round 1, Rounds 2 and 3 plus results, faculty dashboard, admin panel, printable
PDF report, and admin navigation.

Scenario is Operation Iron Horizon: 3 rounds, 12 decisions, 8 KPIs, 7 scoring
dimensions, 8 performance profiles. The engine is deterministic with no AI in the
core, per spec.

**New as of 2026-07-22:** a public, no-login walkthrough of the entire simulator is
live at `/walkthrough`, built for SME and instructional designer review. It is a
single self-contained page in `public/walkthrough.html` that ports the scoring
engine verbatim and transcribes the authored content, so reviewers actually play
the scenario rather than reading screenshots. It carries a Designer Notes toggle
that exposes the KPI and scoring mechanics behind each option. Faculty cohort data
in it is synthetic and labeled illustrative on screen.

Access control: `/walkthrough` is in the middleware `publicPaths` allowlist. Every
other route still requires auth (verified: `/faculty/dashboard` redirects to
`/login`). Anyone with the walkthrough URL can view it, so treat the link as
semi-public.

### Known issues found while porting the engine

These are real defects in production code, surfaced by recreating the engine
faithfully. None are fixed yet.

1. `src/content/iron-horizon/consequences.ts` has no Round 3 entry, so the app
   shows a generic fallback after the AI Inflection round instead of a written
   consequence narrative. Needs authored content from an SME.
2. `src/app/simulation/[runId]/results/page.tsx` calls `assignPerformanceProfile()`
   with an empty traits array, so the four trait-gated profiles are unreachable
   except through the fallback path.
3. The `talent_blind_spot` rule in `profiles.ts` uses `talent_leadership: 0` as a
   minimum, which is always true, where a ceiling was almost certainly intended.
   At priority 60 it acts as a near catch-all, so people-first runs can land on it.

### Carry-over from the 2026-05-07 session (verify before acting)

- Manual SQL still pending in Supabase to patch two participant names that were
  seeded with email-prefix placeholders (Tammy Norfolk, Christine Rupert).
- Multiple simulation runs per user was discussed and deferred. Five query sites
  assume one run per user and would silently collapse duplicates if it ships.
- Weekly database backup via GitHub Actions and `pg_dump` was recommended but not
  started, pending a decision on cadence and whether to include the auth schema.

## Next Steps

1. **Send the `/walkthrough` link to Jess, Andrea, and Mickey for review.** The
   draft email is written; it needs the production domain substituted in.
2. Fix the two code defects above (empty traits array, and the `talent_blind_spot`
   minimum that should be a ceiling). Both affect which profile a real participant
   is assigned.
3. Commission the Round 3 consequence narrative from an SME.
4. Decide whether the walkthrough needs a passphrase gate before wider circulation.

---

## Closeout 2026-07-22

- **Window:** 2026-07-22 only. Previous commit on this repo was 2026-05-07, so this
  was a single-day session after a long gap.
- **Completed:** Built the full SME/ID walkthrough of the simulator and published it
  two ways: as a Claude artifact, then self-hosted at `/walkthrough` after Andre
  confirmed reviewers should not need Claude accounts. Shipped in commit `aff3be5`
  (`public/walkthrough.html`, middleware allowlist, next.config rewrite), pushed and
  confirmed working in production. Separately committed two new skills to the
  claude-skills repo (`email-writing`, `tool-walkthrough-builder`, commit `8752c4a`).
  Surfaced three engine and content defects, documented above.
- **In progress:** Nothing on product code. Local tooling only: `.claude/launch.json`
  (dev server config, untracked) and a modified `.claude/settings.local.json`.
- **Next action:** Send the `/walkthrough` link to Jess, Andrea, and Mickey.
- **Blocker:** none.
