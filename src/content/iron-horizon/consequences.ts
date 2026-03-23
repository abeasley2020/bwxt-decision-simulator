/**
 * Operation Iron Horizon — Round Consequence Content
 *
 * Pre-authored narratives and stakeholder reactions revealed after each
 * round is submitted. Content is keyed by round number.
 * Do not hardcode this data in UI components.
 */

export interface StakeholderReaction {
  name: string;
  role: string;
  reaction: string;
}

export interface RoundConsequence {
  roundNumber: number;
  headline: string;
  narrative: string;
  stakeholderReactions: StakeholderReaction[];
}

export const IRON_HORIZON_CONSEQUENCES: Record<number, RoundConsequence> = {
  2: {
    roundNumber: 2,
    headline: "48 Hours Later: The Audit Committee Has Your Posture",
    narrative: `The 48-hour window has closed. Your response posture across all four disruptions has been communicated to the Audit Committee chair.

Your regulatory decision set the tone for how BWXT will navigate the federal inquiry. Whether you moved toward the regulator or behind legal counsel, the committee is watching how you manage transparency under pressure.

On the competitive front, your response has reached the sales team and key accounts. Customer-facing leaders are calibrating their conversations accordingly. The competitor's launch is real — your counter-move will define BWXT's positioning for the next 18 months.

The talent actions you initiated are in motion. Your direct reports have received signals — formal or informal — about the direction of leadership. Morale in those teams will reflect your choices in the coming weeks.

The operational decision is already visible on the floor. Delivery leads know what the expectation is. Whether you bought runway, spent capital, or pushed teams harder, the throughput signal will show up in the next weekly operations report.

The Audit Committee chair thanked you for the briefing. The next 30 days will determine whether your posture holds.`,
    stakeholderReactions: [
      {
        name: "Audit Committee Chair",
        role: "Board Governance",
        reaction:
          "Your posture was clear and you came prepared. The regulatory approach will be watched closely — this committee takes compliance inquiries seriously. I want an update in 30 days.",
      },
      {
        name: "Chief Financial Officer",
        role: "Finance",
        reaction:
          "The operational decision has budget implications I am tracking. Your competitor response also affects our near-term revenue forecast. I will update the Q3 model accordingly.",
      },
      {
        name: "Head of Safety & Compliance",
        role: "Operations",
        reaction:
          "The regulatory response sets our position. Whatever direction you chose, my team will execute — but we need clarity and consistency from here. No reversals after this.",
      },
      {
        name: "VP Human Resources",
        role: "People",
        reaction:
          "Your talent decisions have landed in the organization. Engagement in those two teams is fragile right now. The actions you took will either stabilize or accelerate the disengagement — we will know within two weeks.",
      },
    ],
  },
  1: {
    roundNumber: 1,
    headline: "72 Hours Later: The Board Has Your Direction Memo",
    narrative: `Your first 72 hours as Acting President are complete.

The direction memo has been distributed to all senior leaders. Your choices on strategic priorities, capital allocation, talent retention, and communication have set the operating rhythm for the next 90 days.

The Board Operating Committee reviewed your memo this morning. Initial reactions are measured — they want to see execution, not strategy documents. The CFO has begun rerouting budget toward your stated priorities. Department heads are reshaping their Q2 plans accordingly.

Your Head of Operations has received your response to her retention condition. The leadership team's reaction is already visible. Whether you've stabilized the executive bench or held the governance line, your decision has sent a clear signal about how you lead.

The next 30 days will test whether your priorities hold under real pressure.`,
    stakeholderReactions: [
      {
        name: "Board Operating Committee",
        role: "Governance",
        reaction:
          "Memo received and reviewed. Your priorities are noted. We expect a 30-day execution update — not a strategy refresh. Show us the results.",
      },
      {
        name: "Chief Financial Officer",
        role: "Finance",
        reaction:
          "Capital reallocation is underway. Your budget signal was clear. I've begun the reallocation process and Q2 revisions will reflect your stated priorities. We'll know in 60 days whether the bet pays off.",
      },
      {
        name: "Head of Safety & Compliance",
        role: "Operations",
        reaction:
          "We've noted where audit readiness ranked in your priorities. Our team is adjusting its timeline expectations. The audit window is in 60 days — that clock doesn't move.",
      },
      {
        name: "VP Human Resources",
        role: "People",
        reaction:
          "Your message to the 3,200 employees has landed. Reaction varies by function. People are watching for alignment between what you said and what actually happens in the next few weeks.",
      },
    ],
  },
};
