/**
 * Faculty Decision Patterns — /faculty/decisions
 *
 * Shows aggregate decision distributions across all completed participants
 * in the faculty member's cohort.
 *
 * For multi_select / single_select decisions:
 *   - Count and percentage of participants who chose each option.
 *   - Most and least chosen options are highlighted.
 *
 * For resource_allocation decisions:
 *   - Average allocation percentage per option across all responses.
 *
 * Grouped by round, then by decision template.
 *
 * Access control: faculty and admin only.
 * Data: server-side only, read-only. Only completed participants are included.
 *
 * WCAG: h1→h2→h3 heading hierarchy; semantic sections with aria-labelledby;
 * data bars use role="progressbar" with aria-labels; highlights use text
 * labels in addition to visual styling (not color alone); tables use caption
 * and th scope.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveFacultyCohort } from "@/lib/faculty/getActiveFacultyCohort";
import { IRON_HORIZON_VERSION } from "@/content/iron-horizon";

// ─── Content index (built once) ───────────────────────────────────────────────

// For each template key: { title, roundNumber, decisionType, options: [{ key, label }] }
interface ContentTemplate {
  key: string;
  title: string;
  roundTitle: string;
  roundNumber: number;
  decisionType: string;
  options: Array<{ key: string; label: string }>;
}

const CONTENT_TEMPLATES: ContentTemplate[] = [];
const OPTION_LABEL_MAP = new Map<string, string>();

for (const round of IRON_HORIZON_VERSION.rounds) {
  for (const template of round.decisions) {
    CONTENT_TEMPLATES.push({
      key: template.key,
      title: template.title,
      roundTitle: round.title,
      roundNumber: round.roundNumber,
      decisionType: template.decisionType,
      options: template.options.map((o) => ({ key: o.key, label: o.label })),
    });
    for (const opt of template.options) {
      OPTION_LABEL_MAP.set(opt.key, opt.label);
    }
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DecisionPatternsPage() {
  const supabase = createClient();

  // ── Auth ────────────────────────────────────────────────────────────────────

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Role check ──────────────────────────────────────────────────────────────

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!userRow || userRow.role === "participant") {
    redirect("/simulation");
  }

  // ── Cohort selection ────────────────────────────────────────────────────────

  const cohort = await getActiveFacultyCohort(supabase, user.id);

  if (!cohort) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-brand-navy mb-3">
          No Cohort Assigned
        </h1>
        <p className="text-gray-500 text-sm">
          Contact your administrator to be assigned to a cohort.
        </p>
      </main>
    );
  }

  // ── Load completed simulation runs ────────────────────────────────────────

  const { data: participantMembershipsData } = await supabase
    .from("cohort_memberships")
    .select("user_id")
    .eq("cohort_id", cohort.id)
    .eq("cohort_role", "participant");

  const participantUserIds = (participantMembershipsData ?? []).map(
    (m: { user_id: string }) => m.user_id
  );

  const { data: runsData } = await supabase
    .from("simulation_runs")
    .select("id, user_id")
    .eq("cohort_id", cohort.id)
    .eq("status", "completed")
    .in(
      "user_id",
      participantUserIds.length > 0 ? participantUserIds : ["none"]
    );

  const completedRuns: Array<{ id: string; user_id: string }> = runsData ?? [];
  const totalCompletions = completedRuns.length;

  if (totalCompletions === 0) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link
            href="/faculty/dashboard"
            className="
              text-xs text-brand-blue font-medium hover:underline
              focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-1 rounded
            "
          >
            ← Back to Overview
          </Link>
          <h1 className="text-2xl font-bold text-brand-navy mt-2 mb-1">
            Decision Patterns
          </h1>
          <p className="text-gray-500 text-sm">{cohort.name}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-400 text-sm">
          No completions yet. Decision patterns will appear once participants
          finish the simulation.
        </div>
      </main>
    );
  }

  // ── Load scenario rounds + decision templates for this scenario ───────────

  const { data: scenarioRoundsData } = await supabase
    .from("scenario_rounds")
    .select("id, round_number")
    .eq("scenario_version_id", cohort.scenario_version_id)
    .order("round_number");

  const scenarioRoundIds = (scenarioRoundsData ?? []).map(
    (r: { id: string }) => r.id
  );

  const { data: templateRowsData } = await supabase
    .from("decision_templates")
    .select("id, key, scenario_round_id")
    .in(
      "scenario_round_id",
      scenarioRoundIds.length > 0 ? scenarioRoundIds : ["none"]
    );

  // Build id → key map
  const templateIdToKey = new Map(
    (templateRowsData ?? []).map((t: { id: string; key: string }) => [
      t.id,
      t.key,
    ])
  );

  // ── Load all decision responses for completed runs ─────────────────────────

  const completedRunIds = completedRuns.map((r) => r.id);

  const { data: responsesData } = await supabase
    .from("decision_responses")
    .select(
      "simulation_run_id, decision_template_id, selected_option_ids_json, allocation_json"
    )
    .in("simulation_run_id", completedRunIds);

  const allResponses: Array<{
    simulation_run_id: string;
    decision_template_id: string;
    selected_option_ids_json: string[];
    allocation_json: Record<string, number> | null;
  }> = responsesData ?? [];

  // ── Aggregate option distributions ────────────────────────────────────────

  // selection counts: "templateKey:optionKey" → count
  const selectionCounts = new Map<string, number>();
  // allocation sums: "templateKey:optionKey" → { sum, count }
  const allocationData = new Map<
    string,
    { sum: number; responseCount: number }
  >();

  for (const response of allResponses) {
    const templateKey = templateIdToKey.get(response.decision_template_id);
    if (!templateKey) continue;

    // Selections (for multi/single select)
    for (const optionKey of response.selected_option_ids_json) {
      const mapKey = `${templateKey}:${optionKey}`;
      selectionCounts.set(mapKey, (selectionCounts.get(mapKey) ?? 0) + 1);
    }

    // Allocations (for resource_allocation)
    if (response.allocation_json) {
      for (const [optionKey, pct] of Object.entries(response.allocation_json)) {
        const mapKey = `${templateKey}:${optionKey}`;
        const existing = allocationData.get(mapKey) ?? {
          sum: 0,
          responseCount: 0,
        };
        allocationData.set(mapKey, {
          sum: existing.sum + (Number(pct) || 0),
          responseCount: existing.responseCount + 1,
        });
      }
    }
  }

  // ── Build pattern data per template ───────────────────────────────────────

  type OptionPattern = {
    key: string;
    label: string;
    count: number;
    pct: number;
    avgAllocation: number | null; // only for resource_allocation
  };

  type TemplatePattern = {
    key: string;
    title: string;
    roundNumber: number;
    roundTitle: string;
    decisionType: string;
    options: OptionPattern[];
    maxCount: number;
    minCount: number;
  };

  const templatePatterns: TemplatePattern[] = CONTENT_TEMPLATES.map(
    (template) => {
      const options: OptionPattern[] = template.options.map((opt) => {
        const mapKey = `${template.key}:${opt.key}`;
        const count = selectionCounts.get(mapKey) ?? 0;
        const pct =
          totalCompletions > 0
            ? Math.round((count / totalCompletions) * 100)
            : 0;

        const allocEntry = allocationData.get(mapKey);
        const avgAllocation =
          allocEntry && allocEntry.responseCount > 0
            ? Math.round(allocEntry.sum / allocEntry.responseCount)
            : null;

        return { key: opt.key, label: opt.label, count, pct, avgAllocation };
      });

      // Exclude options with zero count when finding max/min for selection-based types
      const selectionOptions = options.filter(
        (o) => template.decisionType !== "resource_allocation"
      );
      const counts = selectionOptions.map((o) => o.count);
      const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
      const minCount = counts.length > 0 ? Math.min(...counts) : 0;

      return {
        key: template.key,
        title: template.title,
        roundNumber: template.roundNumber,
        roundTitle: template.roundTitle,
        decisionType: template.decisionType,
        options,
        maxCount,
        minCount,
      };
    }
  );

  // Group by round
  const patternsByRound = new Map<number, TemplatePattern[]>();
  for (const tp of templatePatterns) {
    const list = patternsByRound.get(tp.roundNumber) ?? [];
    list.push(tp);
    patternsByRound.set(tp.roundNumber, list);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">

      {/* ── Page heading ────────────────────────────────────────────────── */}
      <div className="mb-8">
        <Link
          href="/faculty/dashboard"
          className="
            text-xs text-brand-blue font-medium hover:underline
            focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-1 rounded
          "
        >
          ← Back to Overview
        </Link>
        <h1 className="text-2xl font-bold text-brand-navy mt-2 mb-1">
          Decision Patterns
        </h1>
        <p className="text-gray-500 text-sm">
          {cohort.name} &mdash; Based on{" "}
          {totalCompletions} completed participant
          {totalCompletions !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Rounds ─────────────────────────────────────────────────────── */}
      <div className="space-y-10">
        {[1, 2, 3].map((roundNum) => {
          const templates = patternsByRound.get(roundNum);
          if (!templates?.length) return null;
          const roundTitle = templates[0].roundTitle;

          return (
            <section
              key={roundNum}
              aria-labelledby={`round-${roundNum}-heading`}
            >
              <h2
                id={`round-${roundNum}-heading`}
                className="text-brand-navy text-xl font-bold mb-1 pb-2 border-b border-gray-200"
              >
                Round {roundNum} — {roundTitle}
              </h2>

              <div className="space-y-6 mt-4">
                {templates.map((tp) => (
                  <section
                    key={tp.key}
                    aria-labelledby={`template-${tp.key}-heading`}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                  >
                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
                      <h3
                        id={`template-${tp.key}-heading`}
                        className="text-brand-navy font-semibold text-sm"
                      >
                        {tp.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">
                        {tp.decisionType === "resource_allocation"
                          ? "Resource allocation — showing average allocation per option"
                          : tp.decisionType === "multi_select"
                          ? "Multi-select — participants chose multiple options"
                          : "Single select"}
                      </p>
                    </div>

                    {tp.decisionType === "resource_allocation" ? (
                      /* ── Resource allocation: average % bars ──────────── */
                      <div className="divide-y divide-gray-100">
                        {tp.options
                          .slice()
                          .sort(
                            (a, b) =>
                              (b.avgAllocation ?? 0) - (a.avgAllocation ?? 0)
                          )
                          .map((opt) => {
                            const avg = opt.avgAllocation ?? 0;
                            return (
                              <div
                                key={opt.key}
                                className="px-5 py-3"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-gray-700">
                                    {opt.label}
                                  </span>
                                  <span className="text-sm font-bold text-brand-navy tabular-nums ml-3">
                                    avg {avg}%
                                  </span>
                                </div>
                                <div
                                  role="progressbar"
                                  aria-valuenow={avg}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-label={`${opt.label}: average allocation ${avg}%`}
                                  className="h-2 bg-gray-100 rounded-full overflow-hidden"
                                >
                                  <div
                                    className="h-full bg-brand-blue rounded-full"
                                    style={{ width: `${avg}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      /* ── Selection-based: count + % bars ──────────────── */
                      <div className="divide-y divide-gray-100">
                        {tp.options.map((opt) => {
                          const isMost =
                            opt.count === tp.maxCount && tp.maxCount > 0;
                          const isLeast =
                            opt.count === tp.minCount &&
                            tp.minCount < tp.maxCount;
                          const barPct =
                            tp.maxCount > 0
                              ? Math.round(
                                  (opt.count / tp.maxCount) * 100
                                )
                              : 0;

                          return (
                            <div key={opt.key} className="px-5 py-3">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className="text-sm text-gray-700 leading-snug">
                                    {opt.label}
                                  </span>
                                  {/* Text labels — not color alone */}
                                  {isMost && (
                                    <span
                                      className="flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded bg-brand-navy text-white"
                                      aria-label="Most chosen option"
                                    >
                                      Top pick
                                    </span>
                                  )}
                                  {isLeast && !isMost && (
                                    <span
                                      className="flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500"
                                      aria-label="Least chosen option"
                                    >
                                      Least chosen
                                    </span>
                                  )}
                                </div>
                                <span className="flex-shrink-0 text-sm font-bold text-brand-navy tabular-nums">
                                  {opt.count}{" "}
                                  <span className="text-xs font-normal text-gray-400">
                                    ({opt.pct}%)
                                  </span>
                                </span>
                              </div>
                              <div
                                role="progressbar"
                                aria-valuenow={opt.count}
                                aria-valuemin={0}
                                aria-valuemax={totalCompletions}
                                aria-label={`${opt.label}: chosen by ${opt.count} of ${totalCompletions} participants (${opt.pct}%)`}
                                className="h-2 bg-gray-100 rounded-full overflow-hidden"
                              >
                                <div
                                  className={`h-full rounded-full ${
                                    isMost
                                      ? "bg-brand-navy"
                                      : "bg-brand-blue/60"
                                  }`}
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
