/**
 * Generates docs/iron-horizon-walkthrough.docx, the scenario walkthrough for
 * instructional designers and SMEs, directly from the engine and content
 * modules so the document always matches the shipped scenario.
 *
 * Usage (the docx package is not a project dependency; install it transiently):
 *   npm install --no-save docx
 *   node scripts/generate-walkthrough-docx.js
 *
 * The script first compiles src/engine and src/content/iron-horizon to CJS in
 * a temp directory (path-alias imports are type-only, so they erase), then
 * builds the document from the compiled data. Regenerate whenever scenario
 * content, KPI/dimension definitions, or profiles change.
 */
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync } = require("child_process");

const REPO = path.join(__dirname, "..");
const COMPILED = fs.mkdtempSync(path.join(os.tmpdir(), "iron-horizon-doc-"));

const tsconfig = {
  compilerOptions: {
    module: "commonjs",
    target: "es2020",
    outDir: COMPILED,
    rootDir: path.join(REPO, "src"),
    skipLibCheck: true,
    ignoreDeprecations: "6.0",
    esModuleInterop: true,
    baseUrl: path.join(REPO, "src"),
    paths: { "@/*": ["*"] },
  },
  include: [
    path.join(REPO, "src/engine/**/*.ts"),
    path.join(REPO, "src/content/iron-horizon/**/*.ts"),
  ],
};
const tsconfigPath = path.join(COMPILED, "tsconfig.json");
fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig));
execFileSync("npx", ["tsc", "-p", tsconfigPath], { cwd: REPO, stdio: "inherit" });
const round1 = require(path.join(COMPILED, "content/iron-horizon/rounds/round-1.js")).default;
const round2 = require(path.join(COMPILED, "content/iron-horizon/rounds/round-2.js")).default;
const round3 = require(path.join(COMPILED, "content/iron-horizon/rounds/round-3.js")).default;
const scenario = require(path.join(COMPILED, "content/iron-horizon/scenario.js"));
const { IRON_HORIZON_CONSEQUENCES } = require(path.join(COMPILED, "content/iron-horizon/consequences.js"));
const { PERFORMANCE_PROFILES } = require(path.join(COMPILED, "content/iron-horizon/profiles.js"));
const { KPI_DEFINITIONS } = require(path.join(COMPILED, "engine/kpi.js"));
const { SCORING_DIMENSIONS } = require(path.join(COMPILED, "engine/scoring.js"));

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table,
  TableRow, TableCell, WidthType, ShadingType, BorderStyle, PageBreak,
  LevelFormat, TableOfContents, Footer, Header, PageNumber, VerticalAlign,
} = require("docx");

const ROUNDS = [round1, round2, round3];

// ── Palette / typography ────────────────────────────────────────────────────
const NAVY = "17153A";
const CRIMSON = "9E3039";
const GRAY = "6B7280";
const LIGHT = "F4F4F7";
const BODY_FONT = "Calibri";
const DISPLAY_FONT = "Georgia";

const PAGE_W = 12240; // US Letter DXA
const PAGE_H = 15840;
const CONTENT_W = 9360; // 1" margins

// ── Label helpers ───────────────────────────────────────────────────────────
const TRAIT_LABELS = {
  compliance_first_leader: "Compliance-First Leader",
  digital_first_leader: "Digital-First Leader",
  people_first_leader: "People-First Leader",
  structured_negotiator: "Structured Negotiator",
  transparent_communicator: "Transparent Communicator",
  vision_leader: "Vision Leader",
  disciplined_innovator: "Disciplined Innovator",
  innovation_without_guardrails: "Innovation Without Guardrails",
  data_enabled_builder: "Data-Enabled Builder",
  strategic_communicator: "Strategic Communicator",
};
const traitLabel = (k) => TRAIT_LABELS[k] || k.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
const kpiLabel = (k) => (KPI_DEFINITIONS[k] ? KPI_DEFINITIONS[k].label : k);
const dimLabel = (k) => (SCORING_DIMENSIONS[k] ? SCORING_DIMENSIONS[k].label : k);
const signed = (v) => (v > 0 ? `+${v}` : `${v}`);

// ── Paragraph helpers ───────────────────────────────────────────────────────
function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 160, before: opts.before ?? 0 },
    alignment: opts.align,
    indent: opts.indent,
    children: [new TextRun({
      text,
      font: opts.font || BODY_FONT,
      size: opts.size || 22,
      bold: opts.bold || false,
      italics: opts.italics || false,
      color: opts.color || "222222",
    })],
  });
}

function runsPara(runs, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 160 },
    children: runs.map((r) => new TextRun({ font: BODY_FONT, size: 22, color: "222222", ...r })),
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, font: DISPLAY_FONT, size: 34, bold: true, color: NAVY })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, font: DISPLAY_FONT, size: 27, bold: true, color: CRIMSON })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 220, after: 120 },
    children: [new TextRun({ text, font: BODY_FONT, size: 23, bold: true, color: NAVY })],
  });
}

function bullets(items) {
  return items.map((t) => new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80 },
    children: (Array.isArray(t) ? t : [{ text: t }]).map(
      (r) => new TextRun({ font: BODY_FONT, size: 22, color: "222222", ...r })
    ),
  }));
}

// Verbatim in-app text: indented block with a crimson left border.
function quoteBlock(text, label) {
  const out = [];
  if (label) out.push(para(label, { bold: true, size: 20, color: GRAY, after: 60 }));
  const paras = text.split(/\n\s*\n/);
  for (const p of paras) {
    const lines = p.split("\n").map((l) => l.trim()).filter(Boolean);
    out.push(new Paragraph({
      indent: { left: 360 },
      spacing: { after: 120 },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color: CRIMSON, space: 12 } },
      children: lines.flatMap((line, i) => {
        const run = new TextRun({ text: line, font: BODY_FONT, size: 22, italics: true, color: "333333" });
        return i === 0 ? [run] : [new TextRun({ break: 1 }), run];
      }),
    }));
  }
  return out;
}

// Callout box (single-cell shaded table).
function callout(title, paragraphs) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    borders: allBorders("D8B4B8"),
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: "FBF3F4" },
        margins: cellMargins(),
        children: [
          para(title, { bold: true, color: CRIMSON, after: 100 }),
          ...paragraphs,
        ],
      })],
    })],
  });
}

function allBorders(color) {
  const b = { style: BorderStyle.SINGLE, size: 4, color };
  return { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b };
}
function cellMargins() {
  return { top: 100, bottom: 100, left: 140, right: 140 };
}

function headerCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: NAVY },
    margins: cellMargins(),
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      spacing: { after: 0 },
      children: [new TextRun({ text, font: BODY_FONT, size: 20, bold: true, color: "FFFFFF" })],
    })],
  });
}

function bodyCell(content, width, fill) {
  const children = (Array.isArray(content) ? content : [content]).map((c) => {
    if (c instanceof Paragraph) return c;
    return new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ font: BODY_FONT, size: 20, color: "222222", ...(typeof c === "string" ? { text: c } : c) })],
    });
  });
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    margins: cellMargins(),
    children,
  });
}

function makeTable(headers, rows, columnWidths) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths,
    borders: allBorders("C9C9D2"),
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((t, i) => headerCell(t, columnWidths[i])),
      }),
      ...rows.map((cells, r) => new TableRow({
        children: cells.map((c, i) => bodyCell(c, columnWidths[i], r % 2 === 1 ? LIGHT : undefined)),
      })),
    ],
  });
}

// ── Decision rendering ──────────────────────────────────────────────────────
function selectionRule(d) {
  if (d.decisionType === "single_select") return "Choose one option.";
  if (d.decisionType === "multi_select") {
    if (d.minChoices === d.maxChoices) return `Choose exactly ${d.maxChoices} options.`;
    return `Choose ${d.minChoices ?? 1} to ${d.maxChoices} options.`;
  }
  if (d.decisionType === "resource_allocation") {
    return "Allocate 100% of the budget across the areas below, in any split. Effects scale with the share allocated: the values shown are for a 100% allocation, so putting 25% on an area applies one quarter of its listed effects.";
  }
  return d.decisionType;
}

function effectParas(option) {
  const out = [];
  for (const rule of option.effectRules) {
    if (rule.effectType === "kpi") {
      out.push({ text: `${kpiLabel(rule.targetKey)} ${signed(rule.effectValue)}` });
    } else if (rule.effectType === "score") {
      out.push({ text: `${dimLabel(rule.targetKey)} ${signed(rule.effectValue)}`, color: "5A3A7E" });
    } else if (rule.effectType === "hidden_trait") {
      out.push({ text: `Hidden trait: ${traitLabel(rule.targetKey)}`, italics: true, color: CRIMSON });
    }
  }
  return out;
}

function decisionBlock(roundNo, idx, d) {
  const out = [];
  out.push(h3(`Decision ${roundNo}.${idx}: ${d.title}`));
  out.push(...quoteBlock(d.prompt, "Participant prompt"));
  out.push(runsPara([
    { text: "Response format: ", bold: true },
    { text: selectionRule(d) },
  ]));
  const widths = [2200, 3900, 3260];
  const rows = d.options.map((o) => [
    [{ text: o.label, bold: true }],
    [{ text: o.description }],
    effectParas(o),
  ]);
  out.push(makeTable(["Option", "What the participant reads", "Engine effects (hidden from participant)"], rows, widths));
  out.push(para("", { after: 60 }));
  return out;
}

function consequenceBlock(roundNo) {
  const c = IRON_HORIZON_CONSEQUENCES[roundNo];
  const out = [];
  out.push(h3(`After Round ${roundNo}: Consequence Reveal`));
  if (!c) {
    out.push(callout("Open content gap: SME input needed", [
      para("No consequence narrative has been authored for Round 3 yet, so the app currently shows a generic fallback message after the AI Inflection round instead of a written aftermath. To match Rounds 1 and 2, we need: a headline, a 4 to 6 paragraph narrative that acknowledges the participant's AI posture without depending on specific choices, and four stakeholder reactions (for example the CEO, CFO, union leadership, and the CTO or Head of Operations).", { after: 0 }),
    ]));
    return out;
  }
  out.push(para("Once the round is submitted, the participant sees updated KPI meters plus this pre-authored narrative. The text is intentionally choice-agnostic: it acknowledges that decisions landed without branching per option.", {}));
  out.push(...quoteBlock(c.headline, "Headline"));
  out.push(...quoteBlock(c.narrative, "Narrative"));
  out.push(para("Stakeholder reactions shown with the narrative:", { bold: true, after: 100 }));
  out.push(makeTable(
    ["Stakeholder", "Reaction"],
    c.stakeholderReactions.map((s) => [
      [{ text: s.name, bold: true }, { text: `  (${s.role})`, color: GRAY }],
      [{ text: s.reaction, italics: true }],
    ]),
    [2600, 6760]
  ));
  return out;
}

function roundSection(round) {
  const out = [];
  out.push(h1(`${4 + round.roundNumber}. Round ${round.roundNumber}: ${round.title}`));
  out.push(para(round.description));
  out.push(...quoteBlock(round.briefingContent, "Round briefing (shown before the decisions)"));
  out.push(...quoteBlock(round.eventContent, "Triggering event"));
  round.decisions
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach((d, i) => out.push(...decisionBlock(round.roundNumber, i + 1, d)));
  out.push(...consequenceBlock(round.roundNumber));
  return out;
}

// ── Trait inventory (collected from content so it cannot drift) ─────────────
function traitInventory() {
  const map = new Map();
  for (const round of ROUNDS) {
    for (const d of round.decisions) {
      for (const o of d.options) {
        for (const r of o.effectRules) {
          if (r.effectType !== "hidden_trait") continue;
          if (!map.has(r.targetKey)) map.set(r.targetKey, []);
          map.get(r.targetKey).push(`R${round.roundNumber}: ${d.title} > "${o.label}"`);
        }
      }
    }
  }
  return map;
}

// ── Profile rule prose ──────────────────────────────────────────────────────
function ruleProse(logic) {
  const items = [];
  if (logic.scoreThresholds) {
    for (const [k, v] of Object.entries(logic.scoreThresholds)) {
      items.push(`${dimLabel(k)} score of ${v} or higher`);
    }
  }
  if (logic.scoreCeilings) {
    for (const [k, v] of Object.entries(logic.scoreCeilings)) {
      items.push(`${dimLabel(k)} score of ${v} or lower (a ceiling, signaling underinvestment)`);
    }
  }
  if (logic.kpiThresholds) {
    for (const [k, v] of Object.entries(logic.kpiThresholds)) {
      items.push(v === 0
        ? `${kpiLabel(k)} at ${v} or higher (effectively no constraint)`
        : `${kpiLabel(k)} KPI at ${v} or higher`);
    }
  }
  if (logic.requiredTraits) {
    items.push(`Acquired hidden trait${logic.requiredTraits.length > 1 ? "s" : ""}: ${logic.requiredTraits.map(traitLabel).join(", ")}`);
  }
  if (logic.dominantDimensions && logic.dominantDimensions.length > 0) {
    items.push(`${logic.dominantDimensions.map(dimLabel).join(", ")} must stand above the participant's other dimensions on average`);
  }
  return items;
}

// ── Build the document ──────────────────────────────────────────────────────
const children = [];

// Section 1: About
children.push(h1("1. About This Document"));
children.push(para("This walkthrough is a complete, readable transcription of the BWXT Enterprise Decision Simulator scenario, Operation Iron Horizon, prepared for instructional designers and subject matter experts. Every participant-facing word in this document (briefings, prompts, option text, consequence narratives, profile write-ups) is pulled directly from the shipped content files, and every scoring effect is pulled from the same data the engine executes. Nothing here is paraphrased."));
children.push(para("How to use it:"));
children.push(...bullets([
  "Read Sections 2 through 4 first for the shape of the experience and the scoring model. The scoring material is designer-facing; participants never see numbers, effect values, or trait names.",
  "Sections 5 through 7 walk each round decision by decision. Text in bordered italic blocks is exactly what the participant reads. The right-hand column of each option table shows what the engine does with that choice.",
  "Sections 9 through 11 cover how results, profiles, and faculty views work, and list the specific feedback we are asking reviewers for.",
]));
children.push(para("There is also a live, no-login interactive version of the simulator for reviewers at the /walkthrough URL of the deployed app. It includes a Designer Notes toggle that reveals the same mechanics documented here while you play. This document is the reference copy; the interactive page is the experience."));

// Section 2: At a glance
children.push(h1("2. The Experience at a Glance"));
const totalDecisions = ROUNDS.reduce((n, r) => n + r.decisions.length, 0);
const traits = traitInventory();
children.push(...bullets([
  [{ text: "Audience: ", bold: true }, { text: "BWXT Leadership Academy participants. Completed individually as asynchronous pre-work before the live session." }],
  [{ text: "Premise: ", bold: true }, { text: "The participant is named Acting President of BWXT's largest operating division and has 90 days to earn permanent confirmation from the Board." }],
  [{ text: "Structure: ", bold: true }, { text: `3 rounds, ${totalDecisions} decisions, scored across ${Object.keys(KPI_DEFINITIONS).length} KPIs and ${Object.keys(SCORING_DIMENSIONS).length} leadership dimensions, ending in 1 of ${PERFORMANCE_PROFILES.length} performance profiles.` }],
  [{ text: "Estimated duration: ", bold: true }, { text: `about ${scenario.ESTIMATED_DURATION_MINUTES} minutes, including the written executive recommendation.` }],
  [{ text: "Deterministic by design: ", bold: true }, { text: "there is no AI and no randomness in the simulation. The same choices always produce the same KPI trajectory, dimension scores, and profile. This keeps cohort results comparable and debriefable." }],
]));
children.push(h3("Participant flow"));
children.push(...bullets([
  "Orientation: scenario premise, role, and ground rules.",
  "Round 1, Set Direction (Day 1): four decisions on priorities, budget, retention, and communication, then a consequence reveal.",
  "Round 2, Disruption (Day 45): four decisions responding to simultaneous regulatory, competitive, talent, and operational shocks, then a consequence reveal.",
  "Round 3, AI Inflection (Day 75): four decisions on AI adoption, governance, modernization sequencing, and workforce communication.",
  "Executive Recommendation: five short written responses summarizing the participant's strategy.",
  "Results: KPI trajectory, leadership dimension scores, assigned performance profile with strengths and watch-outs, and a printable report.",
]));

// Section 3: Premise
children.push(h1("3. Scenario Premise"));
children.push(para("The orientation screen presents this framing verbatim:"));
children.push(...quoteBlock(scenario.SCENARIO_INTRO, "Orientation text"));
children.push(para("At completion, the closing screen reads:"));
children.push(...quoteBlock(scenario.SCENARIO_OUTRO, "Completion text"));

// Section 4: Scoring
children.push(h1("4. How Scoring Works (Designer Notes)"));
children.push(para("Three kinds of state accumulate as the participant plays. All of it is invisible during play except the KPI meters, which participants see update after each round."));

children.push(h2("4.1 KPIs (visible to the participant)"));
children.push(para("Eight KPIs represent the health of the division on a 0 to 100 scale. Each starts at an authored baseline and moves as options add or subtract points. Values are clamped so they can never leave the 0 to 100 range. The final results dashboard charts the trajectory across the three rounds."));
children.push(makeTable(
  ["KPI", "Start", "What it measures"],
  Object.values(KPI_DEFINITIONS).map((k) => [
    [{ text: k.label, bold: true }],
    [{ text: String(k.defaultStartValue) }],
    [{ text: k.description }],
  ]),
  [3100, 800, 5460]
));

children.push(h2("4.2 Leadership dimensions (revealed at results)"));
children.push(para("Seven dimensions capture how the participant led, not just what happened to the business. Every dimension starts at zero and accumulates points from choices; there is no cap. For display, scores are normalized against the participant's highest dimension, so results emphasize the shape of the profile rather than raw totals."));
children.push(makeTable(
  ["Dimension", "What it measures"],
  Object.values(SCORING_DIMENSIONS).map((d) => [
    [{ text: d.label, bold: true }],
    [{ text: d.description }],
  ]),
  [3400, 5960]
));

children.push(h2("4.3 Hidden traits (never shown to the participant)"));
children.push(para(`Certain options also tag the participant with a hidden trait, a simple flag that records a leadership pattern. Traits carry no points. They exist solely to sharpen profile assignment: several profiles require specific traits before they can match. The scenario currently defines ${traits.size} traits:`));
children.push(makeTable(
  ["Hidden trait", "Earned by choosing"],
  [...traits.entries()].map(([k, sources]) => [
    [{ text: traitLabel(k), bold: true }],
    sources.map((s) => ({ text: s })),
  ]),
  [2900, 6460]
));

children.push(h2("4.4 Mechanics worth knowing"));
children.push(...bullets([
  "Every option carries a list of effect rules. Selecting the option applies all of its rules; in a pick-two decision, both selected options apply in full.",
  "In the budget allocation decision, effects scale linearly with the percentage allocated. A 50% allocation applies half of the listed values.",
  "The engine supports conditional effects gated on current KPI levels, but the current scenario does not use them; every listed effect always applies.",
  "KPI state snapshots at the end of each round become the baseline for the next round, so early choices genuinely constrain later positions.",
  "All scoring runs server-side on submission. Nothing about the mechanics is exposed in the participant experience.",
]));

// Sections 5-7: Rounds
for (const round of ROUNDS) children.push(...roundSection(round));

// Section 8: Executive Recommendation
children.push(h1("8. Executive Recommendation"));
children.push(para("After Round 3, the participant writes a short executive recommendation: five free-text responses. These are not scored by the engine. They are captured for faculty review and used as debrief material in the live academy session, where written intent can be compared against the behavioral pattern the simulation actually recorded."));
children.push(makeTable(
  ["Field", "Prompt shown to the participant"],
  [
    ["Prioritized Strategy", "What is your top strategic priority for the next 12 months and why?"],
    ["90-Day Action Plan", "What are your three most important actions in the next 90 days?"],
    ["Key Risks", "What are the two biggest risks to your plan and how will you mitigate them?"],
    ["Talent Implications", "What talent decisions are most critical to your success?"],
    ["Communication Approach", "How will you communicate your direction to the organization?"],
  ].map(([a, b]) => [[{ text: a, bold: true }], [{ text: b }]]),
  [2900, 6460]
));

// Section 9: Results and profiles
children.push(h1("9. Results and Performance Profiles"));
children.push(para("The results dashboard shows the KPI trajectory across rounds, the normalized leadership dimension scores, the assigned performance profile with its strengths and watch-outs, and a printable report suitable for bringing to the live session."));
children.push(h2("9.1 How a profile is assigned"));
children.push(...bullets([
  "Profiles are checked in a fixed priority order, listed below from first-checked to last. The first profile whose criteria are all satisfied wins.",
  "Criteria can combine dimension score minimums, dimension score ceilings, KPI minimums, required hidden traits, and a dominance test (a named dimension must stand above the others on average).",
  "If no rule matches, the participant falls back to the profile mapped from their single highest dimension: Enterprise Judgment or Talent Leadership map to Enterprise Catalyst, Decision Velocity with Discipline to Disciplined Accelerator, Financial & Strategic Acumen to Functional Optimizer, Technology & Data Leadership to Data-Enabled Builder, Communication & Alignment to Strategic Communicator, and Continuous Improvement Orientation to Cautious Operator.",
]));
children.push(callout("Note on thresholds", [
  para("The criteria below are the rich, trait-aware rule set used by this walkthrough and the reviewer version of the simulator. Production assignment runs a simplified, trait-free variant of the same archetypes seeded in the database. The archetypes, descriptions, strengths, and watch-outs are identical in both; if reviewers want threshold changes, we will decide deliberately which layers to update.", { after: 0 }),
]));

PERFORMANCE_PROFILES.forEach((p, i) => {
  children.push(h3(`Profile ${i + 1} of ${PERFORMANCE_PROFILES.length}: ${p.label}`));
  children.push(para(p.description));
  children.push(runsPara([{ text: "Strengths shown to the participant: ", bold: true }, { text: p.strengthsText }]));
  children.push(runsPara([{ text: "Watch-outs shown to the participant: ", bold: true }, { text: p.blindSpotsText }]));
  const items = ruleProse(p.rules[0].ruleLogicJson);
  children.push(para("Assignment criteria (all must hold):", { bold: true, after: 80 }));
  children.push(...bullets(items));
});

// Section 10: Faculty and admin
children.push(h1("10. Faculty and Admin Views"));
children.push(para("Two staff-facing surfaces aggregate results for the live session and program operations. Reviewers do not need to evaluate these in depth, but they explain where the data goes:"));
children.push(...bullets([
  "Faculty dashboard: cohort-level KPI averages, dimension score distributions, profile mix, and per-decision choice breakdowns, plus per-participant drill-down including the written executive recommendation. In the public reviewer walkthrough, this data is synthetic and labeled illustrative.",
  "Admin panel: cohort creation and lifecycle (draft, active, closed), participant invitations by email magic link, and scenario version management.",
  "Printable report: each participant can print or save a PDF report of their own results for use in the live session.",
]));

// Section 11: Reviewer asks
children.push(h1("11. What We Need From Reviewers"));
children.push(para("The mechanics are stable; the highest-value feedback right now is on content fidelity and calibration. Specifically:"));
children.push(...bullets([
  [{ text: "Authenticity (SMEs): ", bold: true }, { text: "does the scenario read true to BWXT's world? Flag any terminology, org structure, dollar figures, timelines, or regulatory posture that would break credibility with an executive audience." }],
  [{ text: "Option balance (SMEs and IDs): ", bold: true }, { text: "within each decision, is there a defensible case for every option? An option no reasonable executive would pick is a wasted distractor." }],
  [{ text: "Effect calibration (SMEs): ", bold: true }, { text: "do the KPI and dimension effects match the real-world consequences of each choice, in direction and rough magnitude? Use the effect columns in Sections 5 through 7." }],
  [{ text: "Round 3 consequence narrative (SMEs): ", bold: true }, { text: "this is the one open content gap. Rounds 1 and 2 end with an authored aftermath; Round 3 currently falls back to a generic message. See the callout at the end of Section 7 for exactly what is needed." }],
  [{ text: "Profile resonance (IDs and faculty): ", bold: true }, { text: "are the eight profiles distinct, developmentally useful, and phrased so a senior leader will accept the mirror rather than argue with it?" }],
  [{ text: "Debrief fit (IDs and faculty): ", bold: true }, { text: "does the executive recommendation step capture what faculty need to run the live-session comparison of stated strategy versus simulated behavior?" }],
]));
children.push(para("Please route feedback through the program team, referencing decisions by their number in this document (for example, Decision 2.3) so comments map cleanly to the content files."));

// ── Cover section ───────────────────────────────────────────────────────────
const cover = [
  new Paragraph({ spacing: { before: 3200, after: 200 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "BWXT Enterprise Decision Simulator", font: BODY_FONT, size: 26, color: CRIMSON, bold: true, allCaps: true })] }),
  new Paragraph({ spacing: { after: 240 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Operation Iron Horizon", font: DISPLAY_FONT, size: 72, bold: true, color: NAVY })] }),
  new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Scenario Walkthrough for Instructional Designers", font: BODY_FONT, size: 30, color: "333333" })] }),
  new Paragraph({ spacing: { after: 1200 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "and Subject Matter Experts", font: BODY_FONT, size: 30, color: "333333" })] }),
  new Paragraph({ spacing: { after: 80 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: `Scenario version ${scenario.SCENARIO_VERSION_LABEL}  |  BWXT Leadership Academy`, font: BODY_FONT, size: 22, color: GRAY })] }),
  new Paragraph({ spacing: { after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "July 2026  |  For internal review. Contains scoring mechanics not shown to participants.", font: BODY_FONT, size: 22, color: GRAY })] }),
];

const tocSection = [
  new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Contents", font: DISPLAY_FONT, size: 34, bold: true, color: NAVY })] }),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  para("If page numbers are missing, right-click the table in Word and choose Update Field.", { size: 18, color: GRAY, italics: true, before: 200 }),
];

const pageProps = { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } };

const runningHeader = new Header({
  children: [new Paragraph({
    spacing: { after: 0 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "C9C9D2" } },
    children: [new TextRun({ text: "Operation Iron Horizon  |  Simulator Walkthrough for IDs and SMEs", font: BODY_FONT, size: 16, color: GRAY })],
  })],
});
const runningFooter = new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 0 },
    children: [
      new TextRun({ text: "Page ", font: BODY_FONT, size: 16, color: GRAY }),
      new TextRun({ children: [PageNumber.CURRENT], font: BODY_FONT, size: 16, color: GRAY }),
    ],
  })],
});

const doc = new Document({
  creator: "BWXT Leadership Academy",
  title: "Operation Iron Horizon: Simulator Walkthrough for IDs and SMEs",
  description: "Complete content and scoring walkthrough of the BWXT Enterprise Decision Simulator",
  styles: {
    default: {
      document: { run: { font: BODY_FONT, size: 22, color: "222222" } },
    },
  },
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: "•",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 460, hanging: 230 } } },
      }],
    }],
  },
  features: { updateFields: true },
  sections: [
    { properties: pageProps, children: cover },
    { properties: pageProps, headers: { default: runningHeader }, footers: { default: runningFooter }, children: tocSection },
    { properties: pageProps, headers: { default: runningHeader }, footers: { default: runningFooter }, children },
  ],
});

const OUT = path.join(REPO, "docs/iron-horizon-walkthrough.docx");
fs.mkdirSync(path.dirname(OUT), { recursive: true });
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log(`Wrote ${OUT} (${buf.length} bytes)`);
});
