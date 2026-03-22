/**
 * Operation Iron Horizon — Performance Profiles
 *
 * Eight predefined leadership archetypes with deterministic assignment rules.
 * Rules are evaluated in priority order. First match wins.
 */

import type { PerformanceProfile } from "@/engine/types";

export const PERFORMANCE_PROFILES: PerformanceProfile[] = [
  {
    key: "enterprise_catalyst",
    label: "Enterprise Catalyst",
    description:
      "Drives enterprise-wide momentum by balancing urgency with strategic discipline. Excels at system-level thinking and cross-functional mobilization.",
    strengthsText:
      "Strong enterprise judgment. Effective at aligning competing priorities. Builds momentum without sacrificing discipline. Trusted by the Board and the team.",
    blindSpotsText:
      "May underweight deep operational or functional expertise. Can move faster than the organization is ready for. Risk of over-relying on high-level alignment without driving specific execution.",
    rules: [
      {
        priorityOrder: 10,
        ruleLogicJson: {
          scoreThresholds: {
            enterprise_judgment: 12,
            communication_alignment: 8,
            decision_velocity_with_discipline: 8,
          },
          kpiThresholds: {
            cross_functional_alignment: 65,
            executive_confidence: 65,
          },
        },
      },
    ],
  },

  {
    key: "disciplined_accelerator",
    label: "Disciplined Accelerator",
    description:
      "Moves fast but with clear frameworks. Combines pace with process, creating momentum without chaos.",
    strengthsText:
      "High decision velocity with structured thinking. Effective at breaking log-jams and driving delivery. Builds confidence through consistent follow-through.",
    blindSpotsText:
      "Can underweight stakeholder alignment and communication. May sacrifice long-term talent investment for short-term output. At risk of burning out the team.",
    rules: [
      {
        priorityOrder: 20,
        ruleLogicJson: {
          scoreThresholds: {
            decision_velocity_with_discipline: 12,
            financial_strategic_acumen: 8,
          },
          dominantDimensions: ["decision_velocity_with_discipline"],
        },
      },
    ],
  },

  {
    key: "functional_optimizer",
    label: "Functional Optimizer",
    description:
      "Deep in the operations and financial mechanics of the business. Excels at efficiency and execution, but can struggle to lead enterprise transformation.",
    strengthsText:
      "Strong financial and operational acumen. Reliable executor. Manages complexity well within the core business. Trusted by functional teams.",
    blindSpotsText:
      "May underinvest in digital, talent, or external relationships. Can optimize locally at the expense of enterprise value. Risk of functional tunnel vision.",
    rules: [
      {
        priorityOrder: 30,
        ruleLogicJson: {
          scoreThresholds: {
            financial_strategic_acumen: 12,
            enterprise_judgment: 6,
          },
          dominantDimensions: ["financial_strategic_acumen"],
          kpiThresholds: {
            operational_throughput: 65,
          },
        },
      },
    ],
  },

  {
    key: "cautious_operator",
    label: "Cautious Operator",
    description:
      "Prioritizes stability and risk mitigation. Makes few mistakes but can leave value unrealized by moving too conservatively.",
    strengthsText:
      "Strong on compliance, risk management, and operational stability. Rarely makes catastrophic errors. Maintains trust through consistency.",
    blindSpotsText:
      "Under-indexes on velocity and transformation. May struggle in dynamic environments requiring rapid adaptation. Board may lack confidence in competitive positioning.",
    rules: [
      {
        priorityOrder: 40,
        ruleLogicJson: {
          scoreThresholds: {
            enterprise_judgment: 5,
          },
          kpiThresholds: {
            safety_compliance_confidence: 75,
          },
          dominantDimensions: ["continuous_improvement_orientation"],
          requiredTraits: ["compliance_first_leader"],
        },
      },
    ],
  },

  {
    key: "innovation_without_guardrails",
    label: "Innovation Without Guardrails",
    description:
      "Drives transformation energy but without the governance structures or workforce readiness to sustain it. High digital ambition, insufficient system thinking.",
    strengthsText:
      "Visionary on technology and transformation. Energizes the organization around the future. Attracts digital talent and partnerships.",
    blindSpotsText:
      "Underweights compliance, safety, and workforce implications. Creates risk exposure through speed without governance. May lose the organization in transformation.",
    rules: [
      {
        priorityOrder: 50,
        ruleLogicJson: {
          requiredTraits: ["innovation_without_guardrails", "digital_first_leader"],
          kpiThresholds: {
            safety_compliance_confidence: 0,
          },
          scoreThresholds: {
            technology_data_leadership: 10,
          },
        },
      },
    ],
  },

  {
    key: "talent_blind_spot",
    label: "Talent Blind Spot",
    description:
      "Strong strategically and operationally, but consistently underweights people development and organizational capability. Execution suffers as talent gaps compound.",
    strengthsText:
      "Effective at strategic and operational decision-making. Can execute in the short term. Strong with structure, process, and financial metrics.",
    blindSpotsText:
      "Chronically underinvests in talent, succession, and workforce readiness. Organization becomes brittle. Retention risk compounds over time.",
    rules: [
      {
        priorityOrder: 60,
        ruleLogicJson: {
          kpiThresholds: {
            talent_readiness: 0,
          },
          scoreThresholds: {
            enterprise_judgment: 6,
            talent_leadership: 0,
          },
        },
      },
    ],
  },

  {
    key: "strategic_communicator",
    label: "Strategic Communicator",
    description:
      "Creates clarity and alignment through exceptional communication. Moves the organization through narrative, trust, and shared direction.",
    strengthsText:
      "Strong communicator. Builds stakeholder trust rapidly. Effective at driving alignment across functions and levels. Creates followership.",
    blindSpotsText:
      "May over-invest in alignment at the expense of action. Can use communication as a substitute for hard decisions. Results can lag narrative.",
    rules: [
      {
        priorityOrder: 70,
        ruleLogicJson: {
          scoreThresholds: {
            communication_alignment: 12,
          },
          dominantDimensions: ["communication_alignment"],
          requiredTraits: ["transparent_communicator"],
        },
      },
    ],
  },

  {
    key: "data_enabled_builder",
    label: "Data-Enabled Builder",
    description:
      "Builds the infrastructure and capability for long-term data and digital advantage. Patient, systematic, and oriented toward sustainable transformation.",
    strengthsText:
      "Exceptional at building durable digital and data foundations. Strong on long-term capability building. Effective at sequencing transformation investments.",
    blindSpotsText:
      "Can be slow to show visible near-term impact. May under-prioritize revenue and commercial urgency. Risk of investing in infrastructure before the organization is ready to use it.",
    rules: [
      {
        priorityOrder: 80,
        ruleLogicJson: {
          scoreThresholds: {
            technology_data_leadership: 12,
          },
          requiredTraits: ["data_enabled_builder"],
          kpiThresholds: {
            digital_maturity: 60,
          },
        },
      },
    ],
  },
];
