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

### Known issues

1. **Open:** `src/content/iron-horizon/consequences.ts` has no Round 3 entry, so
   the app shows a generic fallback after the AI Inflection round instead of a
   written consequence narrative. Needs authored content from an SME.
2. **Fixed 2026-07-22 (commit 995aa89):** profile assignment previously passed an
   empty traits array. Traits are now re-derived by replaying stored responses
   (`deriveAcquiredTraits` in the engine, `loadAcquiredTraits` server helper).
3. **Fixed 2026-07-22 (commit 995aa89):** the `talent_blind_spot` content rule
   used a minimum of 0 (always true) instead of a ceiling. Now a ceiling of 4,
   matching the DB rule. The profiling fallback map also no longer sends a top
   talent_leadership dimension to talent_blind_spot.

**Correction to the earlier framing of items 2 and 3:** the live DB profile
rules (what production actually uses) are trait-free and already had the
ceiling, so no real participant received a wrong profile through the DB path.
Verified by 20k-path simulation: zero assignment differences under DB rules
with and without traits. The defects were real but lived in the content layer:
the DB-unseeded fallback path and the walkthrough.

**Known divergence, intentional for now:** the DB rule set (`seed.sql`, what
production uses) and the content rule set (`profiles.ts`, richer, trait-gated)
are different rule systems. CLAUDE.md documents this.

**Walkthrough regenerated 2026-07-29** to match the fixed engine (commit
995aa89): talent_blind_spot ceiling rule and corrected fallback map ported,
designer notes refreshed (findings 2 and 3 now shown as fixed; a new note
explains the DB-vs-content rule-set nuance), authored chrome de-dashed
(verbatim product copy keeps its dashes), viewport meta added. Verified by
headless journey simulation against the page's own ported engine plus live
browser checks; artifact updated at its existing URL. Regeneration procedure
and scripts live in the `tool-walkthrough-builder` skill (claude-skills repo).

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
2. Commission the Round 3 consequence narrative from an SME.
3. Decide whether the walkthrough needs a passphrase gate before wider circulation.

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

## Closeout 2026-07-22 (session 2)

- **Window:** later the same day; commits `995aa89` and `92eef59` on top of
  `aff3be5`/`8549132`.
- **Completed:** Fixed walkthrough findings 2 and 3. Traits are now re-derived
  from stored responses and passed at all four profile-assignment call sites;
  `talent_blind_spot` content rule changed from an always-true minimum to a
  ceiling of 4; the profiling fallback map no longer inverts top talent
  strength into talent_blind_spot. Verified with a 9-check simulation suite
  against the compiled engine: old content rules assigned talent_blind_spot to
  66.5% of 20k random runs, fixed rules 2.7% with all 8 profiles reachable, and
  zero assignment changes under the live DB rules, so existing participant
  profiles are untouched. Confirmed against the live database that prod rules
  already used the ceiling, and corrected the previous closeout's overstated
  claim accordingly. Added CLAUDE.md.
- **In progress:** nothing.
- **Next action:** Send the `/walkthrough` link to Jess, Andrea, and Mickey.
- **Blocker:** none.
