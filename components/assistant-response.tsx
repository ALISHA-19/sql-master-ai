"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle, Bot, Bug, CheckCircle2, ChevronRight, Clock, Gauge,
  GitCompareArrows, Info, Lightbulb, ListOrdered, Play, Sparkles, Table2,
  Target, Trophy, Wand2,
} from "lucide-react";
import type { AssistantResponse, Finding } from "@/lib/assistant/engine";
import type { QueryResult } from "@/lib/db/engine";
import { SqlBlock } from "@/components/sql-block";
import { Badge, Card, difficultyTone } from "@/components/ui/primitives";
import { TOPIC_BY_SLUG } from "@/lib/data/topics";

/**
 * The rich, teaching-first response card shared by the AI Assistant and the
 * "Ask AI about your data" flow on the Import page. Every response can show:
 * answer, assumptions, findings, SQL, live output, steps, breakdown, execution
 * order, why-it-works, mistakes, alternative, performance, interview Qs,
 * related topics and a practice exercise.
 */

export interface Turn {
  question: string;
  response: AssistantResponse;
  output?: QueryResult;
  /** Label shown above the live-output table (e.g. sample vs. your data). */
  outputLabel?: string;
}

const FINDING_STYLE: Record<Finding["kind"], { icon: typeof Info; cls: string }> = {
  error: { icon: AlertTriangle, cls: "border-red-500/30 bg-red-500/8 text-red-600 dark:text-red-300" },
  warning: { icon: AlertTriangle, cls: "border-amber-500/30 bg-amber-500/8 text-amber-600 dark:text-amber-300" },
  tip: { icon: Lightbulb, cls: "border-cyan-500/30 bg-cyan-500/8 text-cyan-600 dark:text-cyan-300" },
};

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Info;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[var(--muted)]">
        <Icon size={14} className="text-brand-500" /> {title}
      </div>
      {children}
    </div>
  );
}

export function OutputTable({ output, label }: { output: QueryResult; label?: string }) {
  if (output.error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/8 p-3 text-sm">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-500" />
        <span className="font-mono text-xs">{output.error}</span>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-emerald-500/8 px-3.5 py-1.5">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-300">
          {label ?? "Live output — executed on the sample database"}
        </span>
        <span className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
          <Clock size={10} /> {output.ms.toFixed(1)} ms · {output.rowCount} rows
        </span>
      </div>
      <div className="max-h-64 overflow-auto">
        <table className="result-table">
          <thead><tr>{output.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {output.rows.slice(0, 50).map((r, i) => (
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
    </div>
  );
}

export function ResponseCard({ turn }: { turn: Turn }) {
  const r = turn.response;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-white">
              {r.intent === "debug" ? <Bug size={15} /> : r.intent === "optimize" ? <Gauge size={15} /> : r.intent === "generate" ? <Wand2 size={15} /> : <Bot size={15} />}
            </span>
            <div>
              <div className="font-bold">{r.title}</div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{r.intent.replace("-", " ")}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge tone={difficultyTone(r.difficulty)}>{r.difficulty}</Badge>
            <Badge tone="zinc"><Clock size={10} /> ~{r.estMinutes} min to learn</Badge>
          </div>
        </div>

        {/* Answer */}
        <div className="space-y-2 text-sm leading-relaxed">
          {r.answer.split("\n\n").map((p, i) => (
            <p key={i} dangerouslySetInnerHTML={{
              __html: p
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/`([^`]+)`/g, "<code class='rounded bg-zinc-500/12 px-1 py-0.5 font-mono text-[12px]'>$1</code>"),
            }} />
          ))}
        </div>

        {/* Assumptions */}
        {r.assumptions && r.assumptions.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-violet-500/25 bg-violet-500/8 p-3 text-sm">
            <Info size={15} className="mt-0.5 shrink-0 text-violet-500" />
            <div>
              <span className="font-semibold">Assumptions made: </span>
              {r.assumptions.join(" ")}
            </div>
          </div>
        )}

        {/* Findings (debug/optimize) */}
        {r.findings && r.findings.length > 0 && (
          <Section icon={Target} title={`Findings (${r.findings.length})`}>
            <div className="space-y-2">
              {r.findings.map((f, i) => {
                const S = FINDING_STYLE[f.kind];
                return (
                  <div key={i} className={`flex items-start gap-2.5 rounded-xl border p-3 ${S.cls}`}>
                    <S.icon size={15} className="mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <div className="font-semibold">{f.title}</div>
                      <div className="mt-0.5 text-[13px] opacity-90">{f.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Before / after */}
        {r.originalSql && r.sql && r.originalSql.trim() !== r.sql.trim() && (
          <Section icon={GitCompareArrows} title="Before vs After">
            <div className="grid gap-3 lg:grid-cols-2">
              <SqlBlock sql={r.originalSql} title="Before" runnable={false} />
              <SqlBlock sql={r.sql} title="After" />
            </div>
          </Section>
        )}

        {/* Main SQL */}
        {r.sql && !(r.originalSql && r.originalSql.trim() !== r.sql.trim()) && (
          <SqlBlock sql={r.sql} title={r.sqlLabel ?? "SQL"} />
        )}

        {/* Live output */}
        {turn.output && <OutputTable output={turn.output} label={turn.outputLabel} />}

        {/* Steps */}
        {r.steps.length > 0 && (
          <Section icon={ListOrdered} title="Step-by-step thinking">
            <ol className="space-y-2">
              {r.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-[11px] font-bold text-brand-500">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Breakdown */}
        {r.breakdown && r.breakdown.length > 0 && (
          <Section icon={Table2} title="Query breakdown">
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              {r.breakdown.map((b, i) => (
                <div key={i} className={`grid gap-1 p-3 md:grid-cols-[minmax(180px,2fr)_3fr] ${i > 0 ? "border-t border-[var(--border)]" : ""}`}>
                  <code className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-300">{b.clause}</code>
                  <span className="text-[13px] text-[var(--muted)]">{b.explanation}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Execution order */}
        {r.executionOrder && (
          <details className="group rounded-xl border border-[var(--border)] px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[var(--muted)]">
              <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
              Logical execution order
            </summary>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {r.executionOrder.map((s) => (
                <span key={s} className="rounded-lg bg-zinc-500/8 px-2.5 py-1.5 font-mono text-[11px]">{s}</span>
              ))}
            </div>
          </details>
        )}

        {/* Why this works */}
        {r.whyItWorks && (
          <Section icon={CheckCircle2} title="Why this works">
            <p className="text-sm leading-relaxed text-[var(--muted)]">{r.whyItWorks}</p>
          </Section>
        )}

        {/* Mistakes */}
        {r.mistakes.length > 0 && (
          <Section icon={AlertTriangle} title="Common mistakes">
            <ul className="space-y-1.5">
              {r.mistakes.map((m, i) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--muted)]">
                  <span className="text-red-400">✕</span> {m}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Alternative */}
        {r.alternative && (
          <Section icon={Sparkles} title="Better alternative / variant">
            <SqlBlock sql={r.alternative.sql} title="Alternative" />
            <p className="mt-2 text-[13px] text-[var(--muted)]">{r.alternative.note}</p>
          </Section>
        )}

        {/* Performance */}
        {r.performance.length > 0 && (
          <Section icon={Gauge} title="Performance notes">
            <ul className="space-y-1.5">
              {r.performance.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--muted)]">
                  <span className="text-emerald-500">▸</span> {p}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Interview */}
        {r.interviewQs.length > 0 && (
          <Section icon={Trophy} title="Interview questions on this">
            <ul className="space-y-1.5">
              {r.interviewQs.map((q, i) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--muted)]">
                  <span className="text-amber-500">?</span> {q}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Footer: related + practice */}
        <div className="space-y-3 border-t border-[var(--border)] pt-4">
          {r.relatedTopics.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[13px] font-bold uppercase tracking-wide text-[var(--muted)]">Related:</span>
              {r.relatedTopics.map((slug) => {
                const t = TOPIC_BY_SLUG.get(slug);
                return t ? (
                  <Link key={slug} href={`/learn/${slug}`} className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs transition-colors hover:border-brand-500/50 hover:text-brand-500">
                    {t.title}
                  </Link>
                ) : null;
              })}
            </div>
          )}
          <div className="flex items-start gap-2 rounded-xl bg-brand-500/8 p-3 text-sm">
            <Play size={14} className="mt-0.5 shrink-0 text-brand-500" />
            <span><strong>Practice:</strong> {r.practiceExercise}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
