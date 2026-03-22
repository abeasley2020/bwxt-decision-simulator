/**
 * Operation Iron Horizon — Round 2: Disruption
 *
 * Decisions: regulatory issue, competitor move, talent gap, operational stress
 */

import type { ScenarioRound } from "@/engine/types";

const round2: ScenarioRound = {
  roundNumber: 2,
  title: "Disruption",
  description: "Navigate compounding external and internal shocks at Day 45.",
  briefingContent: `
It's Day 45. Three disruptions have arrived simultaneously.

REGULATORY: The nuclear safety audit has been moved up by 30 days.
One auditor has flagged a potential Category 2 finding in your coolant systems documentation.
If unresolved, it could trigger a production hold.

COMPETITOR: A major competitor has publicly announced a 15% price reduction on
defense manufacturing contracts and is targeting three of your top-10 accounts.
Your sales team is asking for authorization to match pricing.

TALENT: Your Head of Engineering has announced he's retiring in 60 days.
No internal successor is ready. The role is critical for both the audit and the
digital transformation program.

You must respond to all three. Time is compressed.
  `.trim(),
  eventContent: `
Your COO is on the line: "We can't manage all three at once without your clear direction.
Which do we protect first? Which do we accept risk on?"
  `.trim(),
  sortOrder: 2,
  decisions: [
    // ─── D2-1: Regulatory Response ────────────────────────────────────────
    {
      key: "r2_regulatory",
      title: "Nuclear Safety Audit Response",
      prompt:
        "The audit has been moved up 30 days and a Category 2 finding is possible. How do you respond?",
      decisionType: "single_select",
      isRequired: true,
      sortOrder: 1,
      options: [
        {
          key: "r2_reg_fullstop",
          label: "Declare an internal hold and fix it completely",
          description:
            "Stop affected production lines. Assign a full remediation team. Accept the short-term cost to eliminate the compliance risk entirely.",
          sortOrder: 1,
          effectRules: [
            { effectType: "kpi", targetKey: "safety_compliance_confidence", effectValue: 15 },
            { effectType: "kpi", targetKey: "financial_performance_outlook", effectValue: -8 },
            { effectType: "kpi", targetKey: "operational_throughput", effectValue: -7 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 5 },
            {
              effectType: "hidden_trait",
              targetKey: "compliance_first_leader",
              effectValue: 1,
            },
          ],
        },
        {
          key: "r2_reg_targeted",
          label: "Fix the specific finding, maintain operations",
          description:
            "Target only the flagged documentation gap. Keep all other lines running. Accept residual risk in exchange for operational continuity.",
          sortOrder: 2,
          effectRules: [
            { effectType: "kpi", targetKey: "safety_compliance_confidence", effectValue: 7 },
            { effectType: "kpi", targetKey: "operational_throughput", effectValue: 2 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 2 },
            { effectType: "score", targetKey: "decision_velocity_with_discipline", effectValue: 2 },
          ],
        },
        {
          key: "r2_reg_external",
          label: "Engage external audit counsel to negotiate",
          description:
            "Bring in outside regulatory counsel to work with the auditor directly. Buy time to remediate while managing the finding behind the scenes.",
          sortOrder: 3,
          effectRules: [
            { effectType: "kpi", targetKey: "safety_compliance_confidence", effectValue: 4 },
            { effectType: "kpi", targetKey: "executive_confidence", effectValue: -4 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 1 },
            {
              effectType: "hidden_trait",
              targetKey: "risk_deflector",
              effectValue: 1,
            },
          ],
        },
      ],
    },

    // ─── D2-2: Competitor Response ────────────────────────────────────────
    {
      key: "r2_competitor",
      title: "Competitor Price Reduction Response",
      prompt:
        "A major competitor has cut defense manufacturing prices by 15% and is targeting your key accounts. Your sales team wants to match. What do you do?",
      decisionType: "single_select",
      isRequired: true,
      sortOrder: 2,
      options: [
        {
          key: "r2_comp_match",
          label: "Match pricing on all at-risk accounts",
          description:
            "Authorize a price match to protect market share. Accept margin compression now to prevent account attrition.",
          sortOrder: 1,
          effectRules: [
            { effectType: "kpi", targetKey: "financial_performance_outlook", effectValue: -10 },
            { effectType: "kpi", targetKey: "operational_throughput", effectValue: 4 },
            { effectType: "score", targetKey: "financial_strategic_acumen", effectValue: 1 },
          ],
        },
        {
          key: "r2_comp_selective",
          label: "Defend top 3 accounts only, let others compete",
          description:
            "Prioritize your three most strategic accounts with tailored retention offers. Accept potential loss of smaller accounts. Preserve overall margin.",
          sortOrder: 2,
          effectRules: [
            { effectType: "kpi", targetKey: "financial_performance_outlook", effectValue: -3 },
            { effectType: "kpi", targetKey: "executive_confidence", effectValue: 3 },
            { effectType: "score", targetKey: "financial_strategic_acumen", effectValue: 4 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 3 },
            { effectType: "hidden_trait", targetKey: "selective_strategist", effectValue: 1 },
          ],
        },
        {
          key: "r2_comp_differentiate",
          label: "Reframe the value proposition, do not match price",
          description:
            "Brief your account teams on BWXT's unique quality and safety capabilities. Compete on differentiation, not price. Accept potential short-term attrition.",
          sortOrder: 3,
          effectRules: [
            { effectType: "kpi", targetKey: "financial_performance_outlook", effectValue: -5 },
            { effectType: "kpi", targetKey: "executive_confidence", effectValue: 5 },
            { effectType: "score", targetKey: "financial_strategic_acumen", effectValue: 3 },
            { effectType: "score", targetKey: "communication_alignment", effectValue: 3 },
            {
              effectType: "hidden_trait",
              targetKey: "differentiation_oriented",
              effectValue: 1,
            },
          ],
        },
      ],
    },

    // ─── D2-3: Engineering Succession ─────────────────────────────────────
    {
      key: "r2_engineering_succession",
      title: "Head of Engineering Succession",
      prompt:
        "Your Head of Engineering retires in 60 days. No internal successor is ready. This role is critical for audit compliance and your digital transformation. How do you fill it?",
      decisionType: "single_select",
      isRequired: true,
      sortOrder: 3,
      options: [
        {
          key: "r2_eng_interim",
          label: "Appoint an internal interim and begin external search",
          description:
            "Appoint your most senior engineering director as interim. Immediately open a confidential external search. Accept 6-month transition risk.",
          sortOrder: 1,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 3 },
            { effectType: "kpi", targetKey: "operational_throughput", effectValue: -3 },
            { effectType: "score", targetKey: "talent_leadership", effectValue: 3 },
            { effectType: "score", targetKey: "decision_velocity_with_discipline", effectValue: 2 },
          ],
        },
        {
          key: "r2_eng_accelerate_internal",
          label: "Fast-track an internal candidate with coaching support",
          description:
            "Name an internal candidate into the permanent role early with a structured 90-day coaching plan. Invest in development over search costs.",
          sortOrder: 2,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 7 },
            { effectType: "kpi", targetKey: "cross_functional_alignment", effectValue: 4 },
            { effectType: "score", targetKey: "talent_leadership", effectValue: 5 },
            { effectType: "score", targetKey: "continuous_improvement_orientation", effectValue: 3 },
            { effectType: "hidden_trait", targetKey: "people_first_leader", effectValue: 1 },
          ],
        },
        {
          key: "r2_eng_contract",
          label: "Bring in a contract engineering executive",
          description:
            "Immediately engage a specialized executive staffing firm for a contract engineering leader. Bridge the gap while running a permanent search.",
          sortOrder: 3,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 5 },
            { effectType: "kpi", targetKey: "financial_performance_outlook", effectValue: -4 },
            { effectType: "score", targetKey: "talent_leadership", effectValue: 2 },
            { effectType: "score", targetKey: "decision_velocity_with_discipline", effectValue: 4 },
          ],
        },
      ],
    },

    // ─── D2-4: Operating Rhythm ───────────────────────────────────────────
    {
      key: "r2_operating_model",
      title: "Operating Model Under Pressure",
      prompt:
        "With three simultaneous disruptions, your leadership team is feeling overwhelmed. How do you adjust your operating model to manage execution?",
      decisionType: "multi_select",
      minChoices: 1,
      maxChoices: 2,
      isRequired: true,
      sortOrder: 4,
      options: [
        {
          key: "r2_ops_warroom",
          label: "Stand up a cross-functional crisis team",
          description:
            "Activate a dedicated leadership war room to manage all three disruptions in parallel. Daily stand-ups, clear owners, visible scorecards.",
          sortOrder: 1,
          effectRules: [
            { effectType: "kpi", targetKey: "cross_functional_alignment", effectValue: 7 },
            { effectType: "kpi", targetKey: "decision_velocity", effectValue: 5 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 3 },
            { effectType: "score", targetKey: "communication_alignment", effectValue: 2 },
          ],
        },
        {
          key: "r2_ops_delegate",
          label: "Delegate two of three issues to direct reports",
          description:
            "Own one issue personally. Fully delegate the other two with clear decision rights and check-ins. Demonstrate trust and build leadership depth.",
          sortOrder: 2,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 5 },
            { effectType: "kpi", targetKey: "cross_functional_alignment", effectValue: 3 },
            { effectType: "score", targetKey: "talent_leadership", effectValue: 4 },
            { effectType: "score", targetKey: "decision_velocity_with_discipline", effectValue: 3 },
            { effectType: "hidden_trait", targetKey: "delegating_leader", effectValue: 1 },
          ],
        },
        {
          key: "r2_ops_triage",
          label: "Formally triage and sequence the three issues",
          description:
            "Publish an explicit prioritization order — regulatory first, talent second, commercial third — and communicate it to the organization.",
          sortOrder: 3,
          effectRules: [
            { effectType: "kpi", targetKey: "executive_confidence", effectValue: 5 },
            { effectType: "kpi", targetKey: "decision_velocity", effectValue: 3 },
            { effectType: "score", targetKey: "decision_velocity_with_discipline", effectValue: 4 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 2 },
          ],
        },
        {
          key: "r2_ops_slow",
          label: "Slow the pace to reduce errors",
          description:
            "Call a 48-hour operational pause to reset. Allow the team to catch up, avoid mistakes from fatigue, and set a more sustainable cadence.",
          sortOrder: 4,
          effectRules: [
            { effectType: "kpi", targetKey: "decision_velocity", effectValue: -5 },
            { effectType: "kpi", targetKey: "operational_throughput", effectValue: -3 },
            { effectType: "kpi", targetKey: "executive_confidence", effectValue: -3 },
            { effectType: "score", targetKey: "continuous_improvement_orientation", effectValue: 2 },
          ],
        },
      ],
    },
  ],
};

export default round2;
