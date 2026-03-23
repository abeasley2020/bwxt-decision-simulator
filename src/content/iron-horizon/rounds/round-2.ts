/**
 * Operation Iron Horizon — Round 2: Disruption
 *
 * Decisions: regulatory response, competitor threat, talent gap, operational stress
 */

import type { ScenarioRound } from "@/engine/types";

const round2: ScenarioRound = {
  roundNumber: 2,
  title: "Disruption",
  description: "Navigate compounding external and internal shocks at Day 45.",
  briefingContent: `
Three simultaneous disruptions have hit the division.

A federal regulator has issued a preliminary inquiry into a safety documentation gap discovered during the compliance audit.

A well-funded competitor has announced a direct move into your core defense market with a lower-cost manufacturing model.

Two of your remaining direct reports are showing signs of disengagement following the HOO situation.

Operational throughput has dropped 8% due to a supplier delay on a critical component.
  `.trim(),
  eventContent: `
The Board's Audit Committee chair has called an emergency briefing in 48 hours. You must have a response posture ready across all four disruptions before that call.
  `.trim(),
  sortOrder: 2,
  decisions: [
    // ─── D2-1: Regulatory Response ────────────────────────────────────────
    {
      key: "r2_regulatory",
      title: "Regulatory Response",
      prompt:
        "A federal regulator has issued a preliminary inquiry into a safety documentation gap. How do you respond before the Audit Committee briefing?",
      decisionType: "single_select",
      isRequired: true,
      sortOrder: 1,
      options: [
        {
          key: "r2_reg_proactive",
          label: "Engage proactively with the regulator before they escalate",
          description:
            "Reach out directly to the regulatory contact to acknowledge the gap, present a remediation plan, and establish a cooperative posture before the inquiry advances.",
          sortOrder: 1,
          effectRules: [
            { effectType: "kpi", targetKey: "safety_compliance_confidence", effectValue: 12 },
            { effectType: "kpi", targetKey: "executive_confidence", effectValue: 6 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 4 },
          ],
        },
        {
          key: "r2_reg_internal",
          label: "Conduct an internal review first, then decide whether to disclose",
          description:
            "Commission a rapid internal review of the documentation gap before any external communication. Reserve disclosure decisions until the facts are clear.",
          sortOrder: 2,
          effectRules: [
            { effectType: "kpi", targetKey: "safety_compliance_confidence", effectValue: 5 },
            { effectType: "kpi", targetKey: "executive_confidence", effectValue: 2 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 2 },
          ],
        },
        {
          key: "r2_reg_legal",
          label: "Defer to legal and pause all related operations",
          description:
            "Place all affected operations on hold and route all communications through legal counsel. Prioritize legal protection over speed of response.",
          sortOrder: 3,
          effectRules: [
            { effectType: "kpi", targetKey: "safety_compliance_confidence", effectValue: -5 },
            { effectType: "kpi", targetKey: "decision_velocity", effectValue: -8 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: -2 },
          ],
        },
      ],
    },

    // ─── D2-2: Competitor Threat Response ─────────────────────────────────
    {
      key: "r2_competitor",
      title: "Competitor Threat Response",
      prompt:
        "A well-funded competitor has announced entry into your core defense market with a lower-cost manufacturing model. How do you respond?",
      decisionType: "single_select",
      isRequired: true,
      sortOrder: 2,
      options: [
        {
          key: "r2_comp_partnership",
          label: "Accelerate a strategic partnership to close capability gap",
          description:
            "Identify and fast-track a manufacturing or technology partnership that closes the cost or capability gap the competitor is exploiting. Move quickly before they gain account traction.",
          sortOrder: 1,
          effectRules: [
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: 8 },
            { effectType: "kpi", targetKey: "financial_performance_outlook", effectValue: 5 },
            { effectType: "score", targetKey: "technology_data_leadership", effectValue: 4 },
          ],
        },
        {
          key: "r2_comp_rnd",
          label: "Double down on internal R&D and differentiation",
          description:
            "Redirect discretionary investment into accelerated R&D to deepen BWXT's technical differentiation. Compete on capability, not cost.",
          sortOrder: 2,
          effectRules: [
            { effectType: "kpi", targetKey: "digital_maturity", effectValue: 10 },
            { effectType: "kpi", targetKey: "financial_performance_outlook", effectValue: -4 },
            { effectType: "score", targetKey: "technology_data_leadership", effectValue: 5 },
          ],
        },
        {
          key: "r2_comp_hold",
          label: "Stay the course — competitors often overpromise",
          description:
            "Maintain current strategy and pricing. Defense manufacturing entry is operationally complex; monitor the competitor's execution before reacting.",
          sortOrder: 3,
          effectRules: [
            { effectType: "kpi", targetKey: "financial_performance_outlook", effectValue: 3 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: -2 },
          ],
        },
      ],
    },

    // ─── D2-3: Talent Gap ──────────────────────────────────────────────────
    {
      key: "r2_talent_gap",
      title: "Talent Gap",
      prompt:
        "Two direct reports are disengaged and a critical leadership gap has emerged. Select two actions to address your talent situation.",
      decisionType: "multi_select",
      minChoices: 2,
      maxChoices: 2,
      isRequired: true,
      sortOrder: 3,
      options: [
        {
          key: "r2_tal_promote",
          label: "Promote a high-potential internal candidate immediately",
          description:
            "Identify the strongest internal candidate and move them into an expanded role now. Signal confidence in your bench and create internal momentum.",
          sortOrder: 1,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 8 },
            { effectType: "kpi", targetKey: "cross_functional_alignment", effectValue: 5 },
            { effectType: "score", targetKey: "talent_leadership", effectValue: 4 },
          ],
        },
        {
          key: "r2_tal_search",
          label: "Launch an accelerated external search",
          description:
            "Engage an executive search firm immediately with a 60-day placement target. Supplement internal depth with external talent.",
          sortOrder: 2,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 5 },
            { effectType: "score", targetKey: "talent_leadership", effectValue: 2 },
          ],
        },
        {
          key: "r2_tal_redistribute",
          label: "Redistribute responsibilities across existing leadership",
          description:
            "Realign portfolios across the current leadership team to cover the gap without adding headcount or external spend.",
          sortOrder: 3,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 3 },
            { effectType: "kpi", targetKey: "operational_throughput", effectValue: -4 },
            { effectType: "score", targetKey: "talent_leadership", effectValue: 1 },
          ],
        },
        {
          key: "r2_tal_interim",
          label: "Bring in an interim executive while searching",
          description:
            "Engage a specialized interim executive firm to place a senior leader within two weeks. Maintain stability while a permanent search proceeds.",
          sortOrder: 4,
          effectRules: [
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: 6 },
            { effectType: "score", targetKey: "decision_velocity_with_discipline", effectValue: 3 },
          ],
        },
      ],
    },

    // ─── D2-4: Operational Stress Response ────────────────────────────────
    {
      key: "r2_operational_stress",
      title: "Operational Stress Response",
      prompt:
        "Operational throughput has dropped 8% from a supplier delay. How do you respond to restore delivery performance?",
      decisionType: "single_select",
      isRequired: true,
      sortOrder: 4,
      options: [
        {
          key: "r2_ops_scope",
          label: "Temporarily reduce scope on lower-priority programs",
          description:
            "Pause or deprioritize lower-urgency work to free capacity for constrained programs. Communicate the triage decision clearly to stakeholders.",
          sortOrder: 1,
          effectRules: [
            { effectType: "kpi", targetKey: "operational_throughput", effectValue: 6 },
            { effectType: "kpi", targetKey: "financial_performance_outlook", effectValue: 3 },
            { effectType: "score", targetKey: "enterprise_judgment", effectValue: 2 },
          ],
        },
        {
          key: "r2_ops_realloc",
          label: "Request emergency budget reallocation",
          description:
            "Request an emergency budget draw to qualify a backup supplier and restore capacity through parallel sourcing. Accept short-term cost to protect delivery.",
          sortOrder: 2,
          effectRules: [
            { effectType: "kpi", targetKey: "operational_throughput", effectValue: 8 },
            { effectType: "kpi", targetKey: "financial_performance_outlook", effectValue: -5 },
            { effectType: "score", targetKey: "financial_strategic_acumen", effectValue: 3 },
          ],
        },
        {
          key: "r2_ops_push",
          label: "Push delivery teams harder and accept short-term burnout risk",
          description:
            "Ask delivery teams to absorb the throughput gap through extended hours and compressed timelines. Recover lost output on the current cost base.",
          sortOrder: 3,
          effectRules: [
            { effectType: "kpi", targetKey: "operational_throughput", effectValue: 10 },
            { effectType: "kpi", targetKey: "talent_readiness", effectValue: -8 },
            { effectType: "score", targetKey: "talent_leadership", effectValue: -3 },
          ],
        },
      ],
    },
  ],
};

export default round2;
