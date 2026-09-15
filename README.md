# BWXT Enterprise Decision Simulator

An executive leadership diagnostic built for the BWXT Leadership Academy, used
as async pre-work before the live session.

Participants play **Operation Iron Horizon**: three rounds, twelve decisions,
as the newly appointed Acting President of BWXT's largest operating division.
Their choices move eight KPIs, score across seven leadership dimensions, and
resolve to one of eight performance profiles. Faculty and admin surfaces
aggregate the results across a cohort.

The scoring engine is deterministic. There is no AI in the core simulation,
by design.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14, App Router |
| Language | TypeScript |
| Styling | Tailwind, `bwxt-*` token palette (navy `#17153A`, crimson `#9E3039`) |
| Type | Playfair Display for headings, Inter for body |
| Database and auth | Supabase (Postgres, GoTrue email/password) |
| Hosting | Vercel |

Accessibility is a hard requirement, not a nice-to-have: WCAG 2.2 AA on every
surface. Labeled inputs, `role="progressbar"` with aria values, state conveyed
by symbol plus text rather than colour alone, `aria-live` for dynamic totals.

---

## Repository layout

```
src/
  content/iron-horizon/   Authored scenario. Rounds, decisions, options,
                          effect rules, profiles, orientation copy.
  engine/                 Pure scoring functions. No framework imports.
  app/                    App Router pages and API routes.
  lib/                    Supabase clients, auth resolution, report loaders.
  components/             UI.
  db/                     schema.sql, policies.sql, seeds, migrations.
public/walkthrough.html   Self-contained no-login recreation for SME review.
bwxt-spec.md              Scope, source of truth.
schema-map.md             Data model, source of truth. Follow its naming.
STATUS.md                 Current state, known issues, next steps.
CLAUDE.md                 Working notes and architectural gotchas.
```

Three layers, strictly separated. Content is authored in
`src/content/iron-horizon` and nowhere else. The engine is pure functions over
that content. The app queries Supabase in server components and mutates through
`/api/` routes that re-validate against content and re-run the engine
server-side.

---

## Local setup

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.local.example` to `.env.local` and fill in all three values from the
Supabase dashboard (Project Settings > API).

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL. Ships to the browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key. Ships to the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Never prefix with `NEXT_PUBLIC_`. |

The service role key is not optional. `createAdminClient()` reads it, and six
admin and faculty pages call that at render time, so a clone without it throws
on every admin page rather than degrading gracefully.

`NEXT_PUBLIC_APP_URL` and `RESEND_API_KEY` appeared in earlier docs. No code
reads either. Nothing in this app sends email.

### 3. Database

All SQL is applied by hand in the Supabase SQL editor. There is no migration
runner. Every file is idempotent and safe to re-run.

| Order | File | Purpose |
|---|---|---|
| 1 | `src/db/schema.sql` | Tables, indexes, triggers. Fresh database only. |
| 2 | `src/db/policies.sql` | **Row level security. Required.** |
| 3 | `src/db/seed.sql` | Scenario, version, 3 rounds, all 12 decision templates, 8 profiles and their rules. |
| 4 | `src/db/seed-round-1.sql` | Round 1 options (15) and effect rules (54). |
| 5 | `src/db/seed-round-2.sql` | Round 2 options (13) and effect rules (36). |
| 6 | `src/db/seed-round-3.sql` | Round 3 options (14) and effect rules (40). |
| 7 | `src/db/seed-verify.sql` | Read-only. Prints expected vs actual row counts. |
| 8 | `src/db/seed-dev-cohort.sql` | Local and staging only. Never production. |

On a database that already exists, also apply everything in
`src/db/migrations/` in numeric order.

#### Which scenario version the SQL targets

None of the seeds hardcode a scenario version UUID. They resolve it from
`(scenario key = 'operation_iron_horizon', version_label = 'v1.0')`, so the
same files apply unchanged to production, a fresh local database, or a future
v1.1.

This matters because earlier revisions of the seeds named
`20000000-0000-0000-0000-000000000001`, a UUID that exists in no database.
Production's only `scenario_versions` row is
`fad1d4c9-a52b-42b2-96da-ff596aef7c86`. Following the old documented procedure
against production would have inserted a second, parallel scenario version and
orphaned every existing run.

UUIDs that *are* deterministic and still written literally, because
participant data carries foreign keys to them:

| Entity | Range |
|---|---|
| Scenario rounds | `30000000-...-0001` through `-0003` |
| Decision templates | `40000000-...-0001` through `-0012` |
| Decision options | `60000000-...-0001` through `-0042` |
| Effect rules | `70000000-...-0001` through `-0130` |
| Performance profiles | `80000000-...-0001` through `-0008` |
| Profile rules | `90000000-...-0001` through `-0008` |

Per round: R1 options 0001-0015 and rules 001-054, R2 options 0016-0028 and
rules 055-090, R3 options 0029-0042 and rules 091-130.

#### Row level security is applied out of band

`src/db/policies.sql` is not run by anything automatically. It has to be
applied by hand, and it has to be applied. Until it is, the public anon key,
which ships in the client bundle, can read and write every table, including
`users` and the single-use tokens in `invitations`.

Read that file's header before running it. It carries the before/after
verification queries, an anon-key smoke test, and a rollback block.

### 4. Run

```bash
npm run dev
```

Dev server on `http://localhost:3000`. To play as a participant, follow the
attachment instructions at the bottom of `src/db/seed-dev-cohort.sql`, then
visit `/simulation`.

---

## Verification

There is no test suite. These are the gates.

```bash
npm run build        # production build. The main gate.
npm run type-check   # tsc --noEmit
npm run lint
```

`npm run build` is the one that catches the most. Run it before every commit.

### Verifying engine changes

Changes to `src/engine/` or `src/content/` are verified by compiling both to
CommonJS and running assertion scripts against the compiled output. Path-alias
imports between the two are type-only, so they erase and the compiled modules
resolve without a bundler:

```bash
npx tsc src/content/iron-horizon/index.ts \
  --outDir /tmp/enginebuild \
  --module commonjs --target es2020 \
  --moduleResolution node --esModuleInterop --skipLibCheck
```

The `Cannot find module '@/engine/types'` errors this prints are expected and
harmless; the emit still happens. Then `require()` the compiled modules from a
throwaway Node script and assert on the results. The reference example is the
nine-check suite from commit `995aa89`, which simulated 20,000 random decision
paths to confirm a profile-rule change did not reassign any existing
participant. Look there before writing a new one.

### Verifying seed changes

Run `src/db/seed-verify.sql` and read the output. It prints expected against
actual counts for every entity and every round, lists the twelve decision
template keys in order, and checks the two snapshot invariants. It resolves the
scenario version by label, so unlike its predecessor it cannot silently return
zero for everything.

---

## Things that will bite you

These are summarised here; `CLAUDE.md` has the full set.

- **`auth.users.id` is not `public.users.id`** for accounts provisioned before
  the invite-flow fix. Every page and route resolves the public user by email
  first and falls back to the auth id. Use
  `src/lib/auth/resolvePublicUser.ts`; do not write `eq("id", user.id)`.
- **Snapshots are the state model.** One `initial`, then one `round_end` per
  round. No `final` snapshot is ever written; final values are round 3's
  `round_end`. Round N baselines come from round N-1's `round_end`.
- **Hidden traits are not persisted.** Round submit computes and drops them.
  Anything needing traits replays stored responses through
  `deriveAcquiredTraits`.
- **Two profile rule sets exist and are intentionally different.** The DB set
  in `profile_rules` is what production assignment uses. The richer trait-gated
  set in `src/content/iron-horizon/profiles.ts` is the unseeded fallback and
  the walkthrough's source. Do not reconcile them without deciding to.
- **Round 3 exists twice and the two versions disagree.** The DB rows and
  `src/content/iron-horizon/rounds/round-3.ts` differ in labels, prompts,
  decision type and effect values. Participants experience the content
  version, because the submit route scores against imported content and never
  reads `decision_options` or `decision_effect_rules`. Open SME decision.
- **The DB stores far more scenario content than the app reads.** Only
  `scenario_rounds.{id, round_number}` and
  `decision_templates.{id, key, scenario_round_id}` are ever selected.
  Everything else is documentation.
- **Supabase embedded joins return arrays** even for one-to-one FK
  relationships. Handle both shapes.
- **No em dashes** in comments, docs, or prose about the product. They are
  permitted only inside participant-facing scenario prose in
  `src/content/iron-horizon/**`, which is quoted verbatim from the authored
  source.
- **Do not add npm dependencies** without asking first.

---

## The public walkthrough

`/walkthrough` serves `public/walkthrough.html`, a self-contained no-login
recreation of the entire simulator for SME and instructional designer review.
The engine is ported verbatim and faculty data is synthetic and labeled
illustrative on screen. It is allowlisted in the middleware `publicPaths` and
rewritten in `next.config.mjs`.

It does not auto-update when the engine or content changes. Regenerate it
deliberately when the product diverges.

---

## Further reading

| File | What it is for |
|---|---|
| [`bwxt-spec.md`](./bwxt-spec.md) | Scope and product definition. Source of truth. |
| [`schema-map.md`](./schema-map.md) | Data model and naming. Follow it exactly. |
| [`STATUS.md`](./STATUS.md) | Current state, known issues, next steps. Read at session start. |
| [`CLAUDE.md`](./CLAUDE.md) | Architecture notes and the full list of gotchas. |
| `src/db/policies.sql` | RLS policy set, verification procedure, rollback. |
| `src/db/migrations/` | Changes for databases that already exist. |
