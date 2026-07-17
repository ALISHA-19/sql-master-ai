"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Circle, Lightbulb, ListChecks, Search, Video } from "lucide-react";
import { Badge, difficultyTone, Input, SectionTitle } from "@/components/ui/primitives";
import { SqlBlock } from "@/components/sql-block";
import { PRACTICE_PROBLEMS, type PracticeDifficulty } from "@/lib/data/practice";
import { useAppStore } from "@/lib/store";
import { useQueryParam } from "@/lib/use-query-param";
import { cn } from "@/lib/utils";

export default function PracticePage() {
  const urlQuery = useQueryParam("q");
  const [q, setQ] = useState("");
  useEffect(() => {
    if (urlQuery) setQ(urlQuery);
  }, [urlQuery]);
  const [diff, setDiff] = useState<PracticeDifficulty | "All">("All");
  const solved = useAppStore((s) => s.solvedProblems);
  const toggleSolved = useAppStore((s) => s.toggleProblemSolved);

  const visible = useMemo(
    () =>
      PRACTICE_PROBLEMS.filter((p) => {
        if (diff !== "All" && p.difficulty !== diff) return false;
        if (!q.trim()) return true;
        return (p.title + p.prompt + p.tags.join(" ") + p.companies.join(" "))
          .toLowerCase()
          .includes(q.toLowerCase());
      }),
    [q, diff]
  );

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle
        icon={<ListChecks size={22} className="text-brand-500" />}
        title="Practice Questions"
        subtitle={`${PRACTICE_PROBLEMS.length} problems, all runnable against the built-in dataset. Solve in the playground, check the solution only after you've tried.`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, tag, company…" className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {(["All", "Easy", "Medium", "Hard"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDiff(d)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                diff === d
                  ? "border-brand-500/50 bg-brand-500/12 text-brand-500"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-brand-500/40"
              )}
            >
              {d}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-[var(--muted)]">
          {solved.length}/{PRACTICE_PROBLEMS.length} solved
        </span>
      </div>

      <div className="space-y-3">
        {visible.map((p) => {
          const done = solved.includes(p.id);
          return (
            <details key={p.id} className={cn("card-surface group rounded-2xl px-5 py-4", done && "border-emerald-500/30")}>
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    toggleSolved(p.id);
                  }}
                  className="shrink-0 cursor-pointer"
                  title={done ? "Mark unsolved" : "Mark solved (+30 XP)"}
                >
                  {done ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} className="text-[var(--muted)] hover:text-brand-500" />}
                </button>
                <span className={cn("flex-1 text-sm font-semibold", done && "text-[var(--muted)]")}>{p.title}</span>
                <Badge tone={difficultyTone(p.difficulty)}>{p.difficulty}</Badge>
                <ChevronDown size={15} className="text-[var(--muted)] transition-transform group-open:rotate-180" />
              </summary>

              <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
                <p className="text-sm leading-relaxed">{p.prompt}</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.tags.map((t) => <Badge key={t} tone="zinc">{t}</Badge>)}
                  {p.companies.map((c) => <Badge key={c} tone="cyan">{c}</Badge>)}
                </div>

                <details className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-2.5">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-semibold text-amber-600 dark:text-amber-400">
                    <Lightbulb size={13} /> Show hint
                  </summary>
                  <p className="mt-2 text-[13px] text-[var(--muted)]">{p.hint}</p>
                </details>

                <details className="rounded-xl border border-[var(--border)] px-4 py-2.5">
                  <summary className="cursor-pointer list-none text-[13px] font-semibold text-brand-500">
                    Show solution
                  </summary>
                  <div className="mt-3 space-y-2">
                    <SqlBlock sql={p.solution} title="Solution" />
                    <p className="text-[13px] text-[var(--muted)]">
                      <span className="font-semibold text-[var(--fg)]">Expected output:</span> {p.expectedNote}
                    </p>
                  </div>
                </details>

                <div className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-4 py-2.5 text-[12px] text-[var(--muted)]">
                  <Video size={13} /> Video walkthrough — coming soon
                </div>
              </div>
            </details>
          );
        })}
      </div>
      {visible.length === 0 && (
        <p className="py-16 text-center text-sm text-[var(--muted)]">No problems match your filters.</p>
      )}
    </div>
  );
}
