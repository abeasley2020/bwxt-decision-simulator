/**
 * Operation Iron Horizon — Round 3: AI Inflection
 *
 * Decisions: AI adoption, governance vs speed, modernization sequencing, workforce implications
 */

import type { ScenarioRound } from "@/engine/types";

const round3: ScenarioRound = {
  roundNumber: 3,
  title: "AI Inflection",
  description: "Navigate the enterprise's AI moment — governance, speed, and workforce.",
  briefingContent: `
It's Day 75. The audit is behind you. The competitor situation has stabilized.

Now the Board has issued a mandate: BWXT must define its AI strategy within 30 days.

Three scenarios are converging:

AI ADOPTION: A leading AI vendor is offering a 12-month pilot program for
predictive maintenance and quality inspection at a significant discount.
Your CTO says it's the fastest path to Digital Maturity. Your Head of Operations
says the workforce isn't ready.

GOVERNANCE: Your legal team is advising a formal AI governance framework before
any deployment. Your digital team says that will add 9 months and you'll fall behind.

WORKFORCE: The operations union has formally raised concerns about AI-driven
automation. 40% of the affected workforce has flagged anxiety about job displacement.
Your Talent team says this must be addressed before deployment.

The Board wants your recommendation in 30 days. But the vendor offer expires in 10.
  `.trim(),
  eventContent: `
The CEO has sent you a direct message: "I need to know if we're leading on AI or reacting.
Give me your definitive position."
  `.trim(),
  sortOrder: 3,
  decisions: [
    // ─── D3-1: AI Adoption Decision ───────────────────────────────────────
    {
      key: "r3_ai_adoption",
      title: "AI Pilot Program Decision",
      prompt:
        "The AI vendor pilot offer expires in 10 days. Do you move forward?",
      decisionType: "single_select",
      isRequired: true,
      sortOrder: 1,
      options: [
        {
          key: "r3_ai_accept_full",
          label: "Accept the full pilot — move fast, learn by doing",
          description:
            "Authorize the full pilot across two production lines. Accept that governance and workforce preparation will lag. Prioritize competitive positioning.",
          sortOrder: 1,
          effectRules: [
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: 15 },
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: -6 },
            { effectType: "kpi", targetKey: "safety_compliance_confidence", effectValue: -4 },
            { effectType: "score", targetKey: "technology_data_leadership", effectValue: 5 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: -2 },
            { effectType: "hidden_trait", targetKey: "digital_first_leader", effectValue: 1 },
          ],
        },
        {
          key: "r3_ai_accept_limited",
          label: "Accept a limited pilot — one line, with governance conditions",
          description:
            "Negotiate a single production line pilot with explicit governance checkpoints and workforce communication requirements built into the contract.",
          sortOrder: 2,
          effectRules: [
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: 8 },
            { effectType: "kpi", targetKey: "safety_compliance_confidence", effectValue: 3 },
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 2 },
            { effectType: "score", targetKey: "technology_data_leadership", effectValue: 3 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 3 },
            { effectType: "score", targetKey: "decision_velocity_with_discipline", effectValue: 3 },
            {
              effectType: "hidden_trait",
              targetKey: "disciplined_innovator",
              effectValue: 1,
            },
          ],
        },
        {
          key: "r3_ai_defer",
          label: "Decline and build the governance framework first",
          description:
            "Pass on this offer. Spend the next 60 days building a proper AI governance framework and workforce plan before pursuing any vendor partnerships.",
          sortOrder: 3,
          effectRules: [
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: -3 },
            { effectType: "kpi", targetKey: "safety_compliance_confidence", effectValue: 7 },
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 5 },
            { effectType: "kpi", targetKey: "executive_confidence", effectValue: -4 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 2 },
            { effectType: "score", targetKey: "continuous_improvement_orientation", effectValue: 3 },
            { effectType: "hidden_trait", targetKey: "compliance_first_leader", effectValue: 1 },
          ],
        },
      ],
    },

    // ─── D3-2: Governance vs Speed ────────────────────────────────────────
    {
      key: "r3_ai_governance",
      title: "AI Governance Approach",
      prompt:
        "How do you handle the tension between legal's governance requirements and the digital team's speed-to-market pressure?",
      decisionType: "single_select",
      isRequired: true,
      sortOrder: 2,
      options: [
        {
          key: "r3_gov_full_framework",
          label: "Implement full governance framework before any deployment",
          description:
            "Build a comprehensive AI policy, review board, and risk framework. All deployments require formal approval. Accept the 9-month delay.",
          sortOrder: 1,
          effectRules: [
            { effectType: "kpi", targetKey: "safety_compliance_confidence", effectValue: 10 },
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: -5 },
            { effectType: "kpi", targetKey: "executive_confidence", effectValue: -3 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 4 },
            { effectType: "score", targetKey: "continuous_improvement_orientation", effectValue: 2 },
          ],
        },
        {
          key: "r3_gov_lean",
          label: "Implement a lean governance process — 30 days",
          description:
            "Create a streamlined AI governance checklist with a 2-week review cycle. Lightweight, but structured. Balance speed with accountability.",
          sortOrder: 2,
          effectRules: [
            { effectType: "kpi", targetKey: "safety_compliance_confidence", effectValue: 5 },
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: 3 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 3 },
            { effectType: "score", targetKey: "decision_velocity_with_discipline", effectValue: 4 },
            { effectType: "hidden_trait", targetKey: "disciplined_innovator", effectValue: 1 },
          ],
        },
        {
          key: "r3_gov_skip",
          label: "Skip formal governance — use legal sign-off per project",
          description:
            "Deal with governance on a case-by-case basis with legal sign-off. Avoid institutional overhead in favor of speed.",
          sortOrder: 3,
          effectRules: [
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: 6 },
            { effectType: "kpi", targetKey: "safety_compliance_confidence", effectValue: -7 },
            { effectType: "kpi", targetKey: "executive_confidence", effectValue: 3 },
            { effectType: "score", targetKey: "technology_data_leadership", effectValue: 2 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: -3 },
            {
              effectType: "hidden_trait",
              targetKey: "innovation_without_guardrails",
              effectValue: 1,
            },
          ],
        },
      ],
    },

    // ─── D3-3: Modernization Sequencing ───────────────────────────────────
    {
      key: "r3_modernization",
      title: "Digital Modernization Sequencing",
      prompt:
        "Select up to two areas where you will focus digital modernization investment in the next 12 months.",
      decisionType: "multi_select",
      minChoices: 1,
      maxChoices: 2,
      isRequired: true,
      sortOrder: 3,
      options: [
        {
          key: "r3_mod_ops",
          label: "Operations — predictive maintenance and quality inspection AI",
          description:
            "Deploy AI tools to reduce unplanned downtime and inspection labor costs.",
          sortOrder: 1,
          effectRules: [
            { effectType: "kpi", targetKey: "operational_throughput", effectValue: 8 },
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: 8 },
            { effectType: "score", targetKey: "technology_data_leadership", effectValue: 4 },
            { effectType: "score", targetKey: "financial_strategic_acumen", effectValue: 2 },
          ],
        },
        {
          key: "r3_mod_data",
          label: "Data infrastructure — enterprise data platform",
          description:
            "Build the underlying data infrastructure first. Slower visible impact, but creates the foundation for future AI capability.",
          sortOrder: 2,
          effectRules: [
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: 10 },
            { effectType: "kpi", targetKey: "decision_velocity", effectValue: 4 },
            { effectType: "score", targetKey: "technology_data_leadership", effectValue: 5 },
            { effectType: "score", targetKey: "continuous_improvement_orientation", effectValue: 3 },
            { effectType: "hidden_trait", targetKey: "data_enabled_builder", effectValue: 1 },
          ],
        },
        {
          key: "r3_mod_talent",
          label: "Workforce digital upskilling program",
          description:
            "Invest in training 500 employees on digital tools and data literacy before deploying new technology.",
          sortOrder: 3,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 10 },
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: 5 },
            { effectType: "score", targetKey: "talent_leadership", effectValue: 4 },
            { effectType: "score", targetKey: "technology_data_leadership", effectValue: 2 },
            { effectType: "hidden_trait", targetKey: "people_first_leader", effectValue: 1 },
          ],
        },
        {
          key: "r3_mod_commercial",
          label: "Commercial — AI-powered bid optimization",
          description:
            "Use AI to improve proposal win rates and pricing accuracy on defense contracts.",
          sortOrder: 4,
          effectRules: [
            { effectType: "kpi", targetKey: "financial_performance_outlook", effectValue: 7 },
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: 4 },
            { effectType: "score", targetKey: "financial_strategic_acumen", effectValue: 4 },
            { effectType: "score", targetKey: "technology_data_leadership", effectValue: 2 },
          ],
        },
      ],
    },

    // ─── D3-4: Workforce Communication ───────────────────────────────────
    {
      key: "r3_workforce_comms",
      title: "Workforce AI Communication",
      prompt:
        "40% of your operations workforce has raised concerns about AI-driven automation. How do you respond?",
      decisionType: "single_select",
      isRequired: true,
      sortOrder: 4,
      options: [
        {
          key: "r3_wf_commit",
          label: "Commit publicly: no involuntary job losses from AI for 24 months",
          description:
            "Make a formal, Board-approved commitment that AI deployment will not result in involuntary separations for at least 24 months.",
          sortOrder: 1,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 10 },
            { effectType: "kpi", targetKey: "cross_functional_alignment", effectValue: 7 },
            { effectType: "kpi", targetKey: "financial_performance_outlook", effectValue: -3 },
            { effectType: "score", targetKey: "talent_leadership", effectValue: 5 },
            { effectType: "score", targetKey: "communication_alignment", effectValue: 5 },
            { effectType: "hidden_trait", targetKey: "people_first_leader", effectValue: 1 },
          ],
        },
        {
          key: "r3_wf_reskill",
          label: "Announce a formal reskilling and redeployment program",
          description:
            "Launch a workforce redeployment program that retrains displaced workers for new digital and data roles within the division.",
          sortOrder: 2,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 7 },
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: 4 },
            { effectType: "kpi", targetKey: "cross_functional_alignment", effectValue: 5 },
            { effectType: "score", targetKey: "talent_leadership", effectValue: 4 },
            { effectType: "score", targetKey: "continuous_improvement_orientation", effectValue: 4 },
            { effectType: "hidden_trait", targetKey: "disciplined_innovator", effectValue: 1 },
          ],
        },
        {
          key: "r3_wf_engage_union",
          label: "Engage the union leadership directly in the AI roadmap design",
          description:
            "Invite union leadership to co-design the AI deployment roadmap. Slower, but builds lasting trust and reduces resistance.",
          sortOrder: 3,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 5 },
            { effectType: "kpi", targetKey: "cross_functional_alignment", effectValue: 8 },
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: -3 },
            { effectType: "score", targetKey: "talent_leadership", effectValue: 3 },
            { effectType: "score", targetKey: "communication_alignment", effectValue: 5 },
            { effectType: "hidden_trait", targetKey: "strategic_communicator", effectValue: 1 },
          ],
        },
        {
          key: "r3_wf_minimal",
          label: "Issue a brief statement and move forward",
          description:
            "Issue a short statement acknowledging the concerns, then proceed with the AI program. Let results speak for themselves.",
          sortOrder: 4,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: -5 },
            { effectType: "kpi", targetKey: "cross_functional_alignment", effectValue: -6 },
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: 4 },
            { effectType: "score", targetKey: "communication_alignment", effectValue: -3 },
            { effectType: "score", targetKey: "technology_data_leadership", effectValue: 2 },
          ],
        },
      ],
    },
  ],
};

export default round3;
