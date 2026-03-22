/**
 * Operation Iron Horizon — Round 1: Set Direction
 *
 * Decisions: prioritization, capital allocation, talent deployment, communication
 */

import type { ScenarioRound } from "@/engine/types";

const round1: ScenarioRound = {
  roundNumber: 1,
  title: "Set Direction",
  description: "Establish your leadership priorities in the first 30 days.",
  briefingContent: `
It's Day 1. You've received your first executive briefing.

Key facts:
- Q1 revenue is tracking 6% below plan due to delayed defense contract closeouts
- The Safety & Compliance team has flagged two open non-conformances ahead of the audit
- Digital Transformation Program is requesting an emergency budget increase of $12M
- Your Head of Operations has tendered a conditional resignation — she will stay if given expanded authority

The Board expects a clear direction memo within 72 hours.
You must make four decisions now.
  `.trim(),
  eventContent: `
The Board's Operating Committee has convened an emergency call.
They want to know: What are your top priorities for the next 90 days,
and how are you allocating the available discretionary budget of $20M?
  `.trim(),
  sortOrder: 1,
  decisions: [
    // ─── D1-1: Strategic Prioritization ──────────────────────────────────
    {
      key: "r1_prioritization",
      title: "90-Day Priority Focus",
      prompt:
        "Select your top two priorities for the next 90 days. Your choices will shape resource allocation, communication, and operating rhythm across the division.",
      decisionType: "multi_select",
      minChoices: 2,
      maxChoices: 2,
      isRequired: true,
      sortOrder: 1,
      options: [
        {
          key: "r1_pri_revenue",
          label: "Recover revenue gap",
          description:
            "Close the $145M defense contract backlog and restore Q1 run rate. Focus sales and delivery teams on near-term contract closeouts.",
          sortOrder: 1,
          effectRules: [
            { effectType: "kpi", targetKey: "financial_performance_outlook", effectValue: 8 },
            { effectType: "kpi", targetKey: "decision_velocity", effectValue: 5 },
            { effectType: "score", targetKey: "financial_strategic_acumen", effectValue: 3 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 2 },
          ],
        },
        {
          key: "r1_pri_compliance",
          label: "Resolve compliance risk",
          description:
            "Address the two open non-conformances and pre-position for the audit. Assign a senior task force and freeze changes to affected processes.",
          sortOrder: 2,
          effectRules: [
            { effectType: "kpi", targetKey: "safety_compliance_confidence", effectValue: 12 },
            { effectType: "kpi", targetKey: "executive_confidence", effectValue: 5 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 4 },
            {
              effectType: "hidden_trait",
              targetKey: "compliance_first_leader",
              effectValue: 1,
            },
          ],
        },
        {
          key: "r1_pri_digital",
          label: "Accelerate digital transformation",
          description:
            "Prioritize the lagging DX program by assigning executive sponsorship and clearing blockers. Accept short-term cost to capture long-term capability.",
          sortOrder: 3,
          effectRules: [
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: 10 },
            { effectType: "score", targetKey: "technology_data_leadership", effectValue: 5 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 1 },
            {
              effectType: "hidden_trait",
              targetKey: "digital_first_leader",
              effectValue: 1,
            },
          ],
        },
        {
          key: "r1_pri_talent",
          label: "Stabilize the leadership team",
          description:
            "Immediately address the retention risk with your Head of Operations and the two other at-risk direct reports before any other initiative can succeed.",
          sortOrder: 4,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 10 },
            { effectType: "kpi", targetKey: "cross_functional_alignment", effectValue: 6 },
            { effectType: "score", targetKey: "talent_leadership", effectValue: 5 },
            {
              effectType: "hidden_trait",
              targetKey: "people_first_leader",
              effectValue: 1,
            },
          ],
        },
        {
          key: "r1_pri_ops",
          label: "Improve operational throughput",
          description:
            "Focus on removing production bottlenecks and improving on-time delivery metrics before addressing anything else.",
          sortOrder: 5,
          effectRules: [
            { effectType: "kpi", targetKey: "operational_throughput", effectValue: 9 },
            { effectType: "kpi", targetKey: "financial_performance_outlook", effectValue: 4 },
            { effectType: "score", targetKey: "financial_strategic_acumen", effectValue: 2 },
          ],
        },
      ],
    },

    // ─── D1-2: Capital Allocation ─────────────────────────────────────────
    {
      key: "r1_capital",
      title: "Discretionary Budget Allocation",
      prompt:
        "You have $20M in discretionary budget to allocate across four areas. Distribute it as you see fit. Your allocation signals what you value and where you are placing your bets.",
      decisionType: "resource_allocation",
      isRequired: true,
      sortOrder: 2,
      options: [
        {
          key: "r1_cap_compliance",
          label: "Safety & Compliance remediation",
          description: "Audit readiness, non-conformance resolution, and process hardening.",
          sortOrder: 1,
          effectRules: [
            { effectType: "kpi", targetKey: "safety_compliance_confidence", effectValue: 15 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 2 },
          ],
        },
        {
          key: "r1_cap_digital",
          label: "Digital Transformation Program",
          description: "Accelerate the lagging DX program milestones.",
          sortOrder: 2,
          effectRules: [
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: 15 },
            { effectType: "score", targetKey: "technology_data_leadership", effectValue: 3 },
          ],
        },
        {
          key: "r1_cap_talent",
          label: "Talent retention and development",
          description: "Retention packages, succession planning, leadership coaching.",
          sortOrder: 3,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 15 },
            { effectType: "score", targetKey: "talent_leadership", effectValue: 3 },
          ],
        },
        {
          key: "r1_cap_ops",
          label: "Operational capacity investment",
          description: "Equipment, tooling, and capacity upgrades to reduce throughput constraints.",
          sortOrder: 4,
          effectRules: [
            { effectType: "kpi", targetKey: "operational_throughput", effectValue: 15 },
            { effectType: "score", targetKey: "financial_strategic_acumen", effectValue: 2 },
          ],
        },
      ],
    },

    // ─── D1-3: Head of Operations Retention ──────────────────────────────
    {
      key: "r1_talent_hoo",
      title: "Head of Operations: Retention Decision",
      prompt:
        "Your Head of Operations has been with BWXT for 14 years and is operationally irreplaceable in the short term. She's offered to stay if given expanded authority over capital expenditure decisions. How do you respond?",
      decisionType: "single_select",
      isRequired: true,
      sortOrder: 3,
      options: [
        {
          key: "r1_hoo_expand",
          label: "Grant expanded authority",
          description:
            "Formally expand her scope to include capital expenditure sign-off up to $5M. Retain her and signal trust to the broader leadership team.",
          sortOrder: 1,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 8 },
            { effectType: "kpi", targetKey: "cross_functional_alignment", effectValue: 5 },
            { effectType: "kpi", targetKey: "operational_throughput", effectValue: 6 },
            { effectType: "score", targetKey: "talent_leadership", effectValue: 4 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 2 },
          ],
        },
        {
          key: "r1_hoo_negotiate",
          label: "Counter-offer with a defined transition path",
          description:
            "Offer a 12-month expanded role with a clear path to VP Operations, contingent on audit performance. Retain without creating an immediate governance precedent.",
          sortOrder: 2,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 6 },
            { effectType: "kpi", targetKey: "cross_functional_alignment", effectValue: 4 },
            { effectType: "score", targetKey: "talent_leadership", effectValue: 3 },
            { effectType: "score", targetKey: "decision_velocity_with_discipline", effectValue: 2 },
            { effectType: "hidden_trait", targetKey: "structured_negotiator", effectValue: 1 },
          ],
        },
        {
          key: "r1_hoo_decline",
          label: "Decline the condition and begin succession planning",
          description:
            "Hold the governance line. Thank her for her service, begin internal succession planning, and start a quiet external search.",
          sortOrder: 3,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: -8 },
            { effectType: "kpi", targetKey: "operational_throughput", effectValue: -5 },
            { effectType: "kpi", targetKey: "cross_functional_alignment", effectValue: -4 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 2 },
            { effectType: "score", targetKey: "decision_velocity_with_discipline", effectValue: 3 },
          ],
        },
      ],
    },

    // ─── D1-4: Leadership Communication ──────────────────────────────────
    {
      key: "r1_communication",
      title: "First Leadership Communication",
      prompt:
        "You are drafting your first all-hands message to the division's 3,200 employees. What is the primary tone and content of your opening communication?",
      decisionType: "single_select",
      isRequired: true,
      sortOrder: 4,
      options: [
        {
          key: "r1_comm_direct",
          label: "Transparent and direct about challenges",
          description:
            "Name the revenue gap, compliance issues, and talent situation explicitly. Set expectations for accountability and pace. Earn trust through honesty.",
          sortOrder: 1,
          effectRules: [
            { effectType: "kpi", targetKey: "cross_functional_alignment", effectValue: 8 },
            { effectType: "kpi", targetKey: "executive_confidence", effectValue: 4 },
            { effectType: "score", targetKey: "communication_alignment", effectValue: 5 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 2 },
            { effectType: "hidden_trait", targetKey: "transparent_communicator", effectValue: 1 },
          ],
        },
        {
          key: "r1_comm_vision",
          label: "Inspiring and vision-forward",
          description:
            "Lead with where the division is going, not where it has been. Inspire the team with a bold 3-year vision. Save the hard conversations for direct reports.",
          sortOrder: 2,
          effectRules: [
            { effectType: "kpi", targetKey: "cross_functional_alignment", effectValue: 5 },
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 4 },
            { effectType: "score", targetKey: "communication_alignment", effectValue: 3 },
            { effectType: "hidden_trait", targetKey: "vision_leader", effectValue: 1 },
          ],
        },
        {
          key: "r1_comm_focused",
          label: "Focused only on near-term priorities",
          description:
            "Communicate three specific operational priorities only. No vision, no backstory — just what we are doing in the next 90 days and why.",
          sortOrder: 3,
          effectRules: [
            { effectType: "kpi", targetKey: "decision_velocity", effectValue: 5 },
            { effectType: "score", targetKey: "decision_velocity_with_discipline", effectValue: 3 },
            { effectType: "score", targetKey: "communication_alignment", effectValue: 1 },
          ],
        },
      ],
    },
  ],
};

export default round1;
