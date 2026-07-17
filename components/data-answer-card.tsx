"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, BarChart3, CheckCircle2, ChevronDown, Copy, Download, Lightbulb, MessageSquareText, Sparkles, Table } from "lucide-react";
import type { AssistantResponse } from "@/lib/assistant/engine";
import type { QueryResult } from "@/lib/db/engine";
import { SqlBlock } from "@/components/sql-block";
import { ResultChart, chartable } from "@/components/result-chart";
import { Card } from "@/components/ui/primitives";
import { downloadText, toCsv } from "@/lib/utils";

/* ---------- Plain-English reading of the actual result ---------- */

function isNumericVal(v: unknown): boolean {
  return typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)));
}
function fmtNum(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v);
}
function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Interpret the real query output into one human sentence. */
function resultInsight(output: QueryResult | undefined, response: AssistantResponse): string | null {
  if (!output || output.error) return null;
  const { columns: cols, rows, rowCount } = output;
  if (rowCount === 0) return "No rows matched — there's nothing in your data for that question.";

  // Single value (e.g. a count or total) — the big number already shows it.
  if (rows.length === 1 && cols.length === 1) {
    const label = cols[0].replace(/_/g, " ");
    return isNumericVal(rows[0][0]) ? `That's ${fmtNum(rows[0][0])} in total (${label}).` : null;
  }

  // A label + one number per row (group breakdown / totals). Engine sorts these DESC.
  if (cols.length === 2 && isNumericVal(rows[0][1])) {
    const metric = cols[1].replace(/_/g, " ");
    const top = rows[0];
    if (rows.length === 1) return `${cap(String(top[0]))} — ${fmtNum(top[1])} ${metric}.`;
    const bottom = rows[rows.length - 1];
    return `${cap(String(top[0]))} is the highest (${fmtNum(top[1])} ${metric}) and ${cap(String(bottom[0]))} is the lowest (${fmtNum(bottom[1])}), across ${rows.length} groups.`;
  }

  // A single-column list (e.g. distinct values).
  if (cols.length === 1) {
    const vals = rows.slice(0, 5).map((r) => String(r[0]));
    return rowCount <= 5
      ? `${rowCount} value${rowCount === 1 ? "" : "s"}: ${vals.join(", ")}.`
      : `${rowCount} values, including ${vals.join(", ")}…`;
  }

  // Multi-column list / top-N: point at the top row's key + number.
  if (/top|bottom/i.test(response.title ?? "")) {
    const numIdx = cols.findIndex((_, i) => isNumericVal(rows[0][i]));
    const labelIdx = cols.findIndex((_, i) => !isNumericVal(rows[0][i]));
    if (numIdx >= 0 && labelIdx >= 0) {
      return `Top of the list: ${cap(String(rows[0][labelIdx]))} with ${fmtNum(rows[0][numIdx])} ${cols[numIdx].replace(/_/g, " ")}.`;
    }
  }

  return `Showing ${rowCount} row${rowCount === 1 ? "" : "s"} from your data.`;
}

/**
 * Answer-first card for the "Ask about your data" flow. Built for non-technical
 * users: the plain-English answer and the result sit at the top; the SQL and
 * step-by-step explanation are tucked into an optional "Show how" section.
 */
export function DataAnswerCard({
  question,
  response,
  output,
  onSuggestion,
}: {
  question: string;
  response: AssistantResponse;
  output?: QueryResult;
  onSuggestion?: (q: string) => void;
}) {
  const matched = response.matched !== false;
  const singleValue =
    output && !output.error && output.rowCount === 1 && output.columns.length === 1
      ? String(output.rows[0][0])
      : null;
  const insight = matched ? resultInsight(output, response) : null;
  const canChart = chartable(output);
  const [view, setView] = useState<"table" | "chart">("chart");
  const [copied, setCopied] = useState(false);

  const copyResult = async () => {
    if (!output || output.error) return;
    await navigator.clipboard.writeText(toCsv(output.columns, output.rows));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const exportResult = () => {
    if (!output || output.error) return;
    downloadText("answer.csv", toCsv(output.columns, output.rows), "text/csv");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="overflow-hidden">
        {/* Answer header */}
        <div className={`flex items-start gap-3 p-5 ${matched ? "bg-emerald-500/[0.07]" : "bg-amber-500/[0.07]"}`}>
          {matched ? (
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-500" />
          )}
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">
              {matched ? "Answer" : "Hmm — couldn't answer that"}
            </div>
            <p className="mt-1 text-[15px] font-semibold leading-snug">{response.headline ?? response.title}</p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {/* In plain English — a human reading of the actual result */}
          {insight && (
            <div className="flex items-start gap-2.5 rounded-xl bg-brand-500/8 p-3.5">
              <MessageSquareText size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-brand-500">In plain English</div>
                <p className="mt-0.5 text-sm font-medium leading-snug">{insight}</p>
              </div>
            </div>
          )}

          {/* Big single-value answer */}
          {singleValue !== null && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 py-6 text-center">
              <div className="gradient-text text-4xl font-extrabold">{singleValue}</div>
              {output && <div className="mt-1 text-xs text-[var(--muted)]">{output.columns[0]}</div>}
            </div>
          )}

          {/* Result — chart and/or table, with copy/export */}
          {output && !output.error && singleValue === null && output.rowCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                {canChart ? (
                  <div className="flex rounded-lg border border-[var(--border)] p-0.5">
                    <button
                      onClick={() => setView("chart")}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${view === "chart" ? "bg-brand-500/15 text-brand-500" : "text-[var(--muted)]"}`}
                    >
                      <BarChart3 size={12} /> Chart
                    </button>
                    <button
                      onClick={() => setView("table")}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${view === "table" ? "bg-brand-500/15 text-brand-500" : "text-[var(--muted)]"}`}
                    >
                      <Table size={12} /> Table
                    </button>
                  </div>
                ) : <span />}
                <div className="flex gap-1">
                  <button onClick={copyResult} aria-label="Copy result as CSV" className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-[var(--muted)] transition-colors hover:bg-brand-500/10 hover:text-brand-500">
                    <Copy size={11} /> {copied ? "Copied" : "Copy"}
                  </button>
                  <button onClick={exportResult} aria-label="Export result as CSV" className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-[var(--muted)] transition-colors hover:bg-brand-500/10 hover:text-brand-500">
                    <Download size={11} /> CSV
                  </button>
                </div>
              </div>

              {canChart && view === "chart" ? (
                <ResultChart output={output} />
              ) : (
                <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                  <div className="max-h-72 overflow-auto">
                    <table className="result-table">
                      <thead><tr>{output.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                      <tbody>
                        {output.rows.slice(0, 100).map((r, i) => (
                          <tr key={i}>
                            {r.map((v, j) => (
                              <td key={j} className={v === null ? "italic text-[var(--muted)]" : ""}>
                                {v === null ? "NULL" : String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--muted)]">
                    {output.rowCount} row{output.rowCount === 1 ? "" : "s"} · {output.ms.toFixed(1)} ms · on your uploaded data
                  </div>
                </div>
              )}
            </div>
          )}

          {output?.error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/8 p-3 font-mono text-xs text-red-500">
              {output.error}
            </div>
          )}

          {/* Suggestions when we couldn't understand */}
          {!matched && response.suggestions && response.suggestions.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--muted)]">
                <Lightbulb size={13} className="text-amber-500" /> Try one of these instead:
              </div>
              <div className="flex flex-wrap gap-2">
                {response.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSuggestion?.(s)}
                    className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs transition-colors hover:border-brand-500/50 hover:bg-brand-500/8 hover:text-brand-500"
                  >
                    <Sparkles size={11} className="mr-1 inline" />{s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assumptions (only when it made one) */}
          {matched && response.assumptions && response.assumptions.length > 0 && (
            <p className="flex items-start gap-1.5 text-[12px] text-[var(--muted)]">
              <span className="font-semibold">Note:</span> {response.assumptions.join(" ")}
            </p>
          )}

          {/* Collapsible "Show how" — the SQL + steps for the curious */}
          <details className="group rounded-xl border border-[var(--border)]">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-[13px] font-semibold text-[var(--muted)]">
              <span className="flex items-center gap-2">
                <span className="text-brand-500">{"</>"}</span> Show how I got this (SQL &amp; steps)
              </span>
              <ChevronDown size={15} className="transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-3 border-t border-[var(--border)] p-4">
              {response.sql && <SqlBlock sql={response.sql} title={response.sqlLabel ?? "SQL"} />}
              {response.steps.length > 0 && (
                <ol className="space-y-1.5">
                  {response.steps.map((s, i) => (
                    <li key={i} className="flex gap-2 text-[13px] text-[var(--muted)]">
                      <span className="font-bold text-brand-500">{i + 1}.</span> {s}
                    </li>
                  ))}
                </ol>
              )}
              {response.alternative && (
                <div>
                  <div className="mb-1 text-[12px] font-semibold text-[var(--muted)]">Another way to write it:</div>
                  <SqlBlock sql={response.alternative.sql} title="Alternative" />
                  <p className="mt-1 text-[12px] text-[var(--muted)]">{response.alternative.note}</p>
                </div>
              )}
            </div>
          </details>
        </div>
      </Card>
    </motion.div>
  );
}
