# BWXT Enterprise Decision Simulator — Product Specification (MVP)

## 1. Overview

The BWXT Enterprise Decision Simulator is a web-based executive leadership diagnostic tool used as asynchronous pre-work for the BWXT Leadership Academy.

It immerses senior leaders in a realistic, high-stakes enterprise scenario where they must make strategic decisions across:

- Strategy
- Finance
- Operations
- AI / Digital Transformation
- Talent
- Regulatory complexity

The simulator is:

- Deterministic and rules-based (no AI dependency in MVP)
- Scenario-driven (single continuous narrative)
- Diagnostic (captures decision patterns and leadership tendencies)
- Action-oriented (produces outputs used in live academy sessions)

This is not a game. It is a structured enterprise decision environment designed to surface blind spots and improve leadership alignment before the live experience.

---

## 2. Core User Flows

### 1. Participant completes full simulation

login (magic link) → orientation → context briefing + KPI baseline → self-assessment →  
round 1 briefing → decisions → consequence reveal →  
round 2 briefing (disruption) → decisions → consequence reveal →  
round 3 briefing (AI inflection) → decisions → final consequences →  
executive recommendation → performance dashboard → download report → complete

---

### 2. Participant resumes simulation

login → load existing simulation_run → restore state → continue → complete simulation

---

### 3. Faculty reviews cohort insights

login → cohort dashboard → view completion + KPIs + scores →  
review decision patterns → drill into participant profiles →  
review recommendations → export insights

---

### 4. Admin manages cohort

login → create cohort → assign scenario → invite participants →  
track status (not started / in progress / complete)

---

### 5. Admin monitors readiness

login → cohort view → completion metrics → identify gaps → confirm readiness

---

## 3. Tech Stack

### Frontend
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS

### Backend
- Next.js server routes (unified full-stack approach)
- Separate simulation engine layer inside codebase

### Database
- PostgreSQL (via Supabase)

### Authentication
- Magic link (email invite)
- Role-based access (participant, faculty, admin)
- Session persistence required

### Hosting
- Vercel (frontend + API)
- Supabase (database + auth)

### AI (MVP)
- None in core simulation
- Deterministic rules only

### Future AI (optional)
- Cohort summaries
- Participant summaries
- Facilitator briefings
- Writing feedback

---

## 4. Data Model

### Participant / Runtime Entities

#### User
- email, name, role
- relationships:
  - many-to-many with cohorts via CohortMembership
  - has many SimulationRuns

#### Cohort
- name, dates, deadline, scenario_version_id
- relationships:
  - has many users via CohortMembership
  - has many SimulationRuns

#### CohortMembership
- cohort_role, invitation_status
- relationships:
  - belongs to User
  - belongs to Cohort

#### SimulationRun
- status, current_round, timestamps
- relationships:
  - belongs to User
  - belongs to Cohort
  - belongs to ScenarioVersion
  - has many DecisionResponses
  - has many KPISnapshots
  - has many ScoreSnapshots
  - has one ExecutiveRecommendation
  - resolves to PerformanceProfile

#### DecisionResponse
- selected options, rationale, allocation
- relationships:
  - belongs to SimulationRun
  - belongs to DecisionTemplate

#### KPISnapshot
- kpi_values, snapshot_type
- relationships:
  - belongs to SimulationRun

---

### Scenario / Configuration Entities

#### Scenario
- key, title
- relationships:
  - has many ScenarioVersions

#### ScenarioVersion
- version_label, intro/outro
- relationships:
  - belongs to Scenario
  - has many Rounds
  - has many Cohorts

#### ScenarioRound
- round_number, briefing, event
- relationships:
  - belongs to ScenarioVersion
  - has many DecisionTemplates

#### DecisionTemplate
- prompt, type, constraints
- relationships:
  - belongs to ScenarioRound
  - has many DecisionOptions

#### DecisionOption
- label, description
- relationships:
  - belongs to DecisionTemplate
  - has many DecisionEffectRules

#### DecisionEffectRule
- target, value, conditions
- relationships:
  - belongs to DecisionOption

---

### Output / Evaluation Entities

#### ScoreSnapshot
- score_values
- relationships:
  - belongs to SimulationRun

#### PerformanceProfile
- label, strengths, blind_spots
- relationships:
  - assigned to SimulationRun

#### ProfileRule
- rule_logic
- relationships:
  - belongs to PerformanceProfile

#### ExecutiveRecommendation
- strategy, plan, risks, talent, communication
- relationships:
  - belongs to SimulationRun

---

## 5. Simulation Design

### Scenario: Operation Iron Horizon

### Structure
- Single continuous scenario
- 3 rounds
- 8–12 total decisions

### Round 1: Set Direction
- prioritization
- capital allocation
- talent deployment
- communication

### Round 2: Disruption
- regulatory issue
- competitor move
- talent gap
- operational stress

### Round 3: AI Inflection
- AI adoption
- governance vs speed
- modernization sequencing
- workforce implications

### Decision Types
- multi-select
- single-select
- resource allocation
- ranking
- short rationale

### KPI Set (0–100 scale)
- Decision Velocity
- Safety & Compliance
- Financial Outlook
- Operational Throughput
- Talent Readiness
- Digital Maturity
- Alignment
- Executive Confidence

### Scoring Dimensions
- Enterprise Judgment
- Decision Velocity with Discipline
- Financial Acumen
- Technology Leadership
- Talent Leadership
- Communication
- Continuous Improvement

---

## 6. AI Architecture (Future)

AI is an augmentation layer, not core logic.

### Principles
- No AI in simulation engine
- AI generates derived artifacts only
- Core data remains source of truth

### AI Outputs
- cohort summaries
- facilitator briefings
- participant summaries
- writing feedback

### Storage
- ai_generated_artifacts table
- versioned and auditable

### Triggers
- on-demand (primary)
- optional background jobs (later)

### Provider Strategy
- abstracted service layer
- OpenAI or Azure OpenAI later

---

## 7. Success Criteria

### Participant Experience
- ≥90% completion rate
- 90–120 min completion time
- resume works 100%
- ≥80% meaningful engagement (rationales + final output)

---

### Faculty Utility
Faculty must have:
- completion status
- KPI trends
- score averages
- decision patterns
- leadership profile distribution

Faculty must:
- identify 2–3 cohort blind spots quickly
- use outputs in live sessions

---

### Technical Reliability
- ≥99% uptime during cohort window
- zero data loss
- <2s page loads
- <500ms decision response time
- deterministic outcomes

---

### Operational Readiness
- ready 7–10 days before academy
- supports 20–30 participants
- <5 min cohort setup
- testing completed before launch

---

### Post-Academy Validation
- faculty use insights in sessions
- participants reference simulation decisions
- improved discussion quality
- reused for future cohorts

---

## 8. Primary Success Definition

This MVP succeeds if:

- ≥90% of participants complete it
- faculty gain clear, actionable insight into the cohort
- those insights directly shape the live academy

---

## 9. Guiding Principles

- deterministic over AI-driven
- clarity over complexity
- speed to MVP over overengineering
- executive-grade experience (not gamified)
- portable architecture for future enterprise needs