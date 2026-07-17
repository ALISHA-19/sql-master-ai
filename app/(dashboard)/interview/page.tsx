"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, ChevronDown, Lightbulb, Search, Trophy } from "lucide-react";
import { Badge, difficultyTone, Input, SectionTitle } from "@/components/ui/primitives";
import { SqlBlock } from "@/components/sql-block";
import { INTERVIEW_QUESTIONS, type QDifficulty, type QTrack } from "@/lib/data/interview";
import { useAppStore } from "@/lib/store";
import { useQueryParam } from "@/lib/use-query-param";
import { cn } from "@/lib/utils";

const TRACKS: QTrack[] = ["FAANG", "Startup", "Product Analytics", "Data Analyst", "Business Analyst", "Product Manager"];

export default function InterviewPage() {
  const urlQuery = useQueryParam("q");
  const [q, setQ] = useState("");
  useEffect(() => {
    if (urlQuery) setQ(urlQuery);
  }, [urlQuery]);
  const [diff, setDiff] = useState<QDifficulty | "All">("All");
  const [track, setTrack] = useState<QTrack | "All">("All");
  const bookmarks = useAppStore((s) => s.bookmarks);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);

  const visible = useMemo(
    () =>
      INTERVIEW_QUESTIONS.filter((iq) => {
        if (diff !== "All" && iq.difficulty !== diff) return false;
        if (track !== "All" && !iq.tracks.includes(track)) return false;
        if (!q.trim()) return true;
        return (iq.question + iq.explanation).toLowerCase().includes(q.toLowerCase());
      }),
    [q, diff, track]
  );

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle
        icon={<Trophy size={22} className="text-amber-500" />}
        title="SQL Interview Preparation"
        subtitle="Curated real interview questions with hints, solutions, alternatives, and — most importantly — the reasoning interviewers actually grade."
      />

      <div className="mb-6 space-y-3">
        <div className="relative max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["All", "Easy", "Medium", "Hard"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDiff(d)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                diff === d ? "border-brand-500/50 bg-brand-500/12 text-brand-500" : "border-[var(--border)] text-[var(--muted)]"
              )}
            >
              {d}
            </button>
          ))}
          <span className="mx-1 border-l border-[var(--border)]" />
          {(["All", ...TRACKS] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTrack(t)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                track === t ? "border-violet-500/50 bg-violet-500/12 text-violet-500" : "border-[var(--border)] text-[var(--muted)]"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {visible.map((iq, i) => {
          const bmKey = `question:${iq.id}`;
          const marked = bookmarks.includes(bmKey);
          return (
            <details key={iq.id} className="card-surface group rounded-2xl px-5 py-4">
              <summary className="flex cursor-pointer list-none items-start gap-3">
                <span className="mt-0.5 font-mono text-xs font-bold text-[var(--muted)]">Q{i + 1}</span>
                <span className="flex-1 text-sm font-semibold leading-snug">{iq.question}</span>
                <Badge tone={difficultyTone(iq.difficulty)}>{iq.difficulty}</Badge>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    toggleBookmark(bmKey);
                  }}
                  className="cursor-pointer text-[var(--muted)] hover:text-brand-500"
                >
                  {marked ? <BookmarkCheck size={15} className="text-brand-500" /> : <Bookmark size={15} />}
                </button>
                <ChevronDown size={15} className="mt-0.5 text-[var(--muted)] transition-transform group-open:rotate-180" />
              </summary>

              <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
                <div className="flex flex-wrap gap-1.5">
                  {iq.tracks.map((t) => <Badge key={t} tone="violet">{t}</Badge>)}
                </div>

                <details className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-2.5">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-semibold text-amber-600 dark:text-amber-400">
                    <Lightbulb size={13} /> Hint
                  </summary>
                  <p className="mt-2 text-[13px] text-[var(--muted)]">{iq.hint}</p>
                </details>

                <SqlBlock sql={iq.solution} title="Solution" />
                {iq.altSolution && <SqlBlock sql={iq.altSolution} title="Alternative solution" />}

                <div>
                  <h4 className="mb-1.5 text-[13px] font-bold uppercase tracking-wide text-[var(--muted)]">
                    What the interviewer is listening for
                  </h4>
                  <p className="text-sm leading-relaxed text-[var(--muted)]">{iq.explanation}</p>
                </div>

                {iq.optimization && (
                  <p className="text-[13px] text-[var(--muted)]">
                    <span className="font-semibold text-cyan-600 dark:text-cyan-400">⚡ Optimization angle:</span>{" "}
                    {iq.optimization}
                  </p>
                )}
              </div>
            </details>
          );
        })}
      </div>
      {visible.length === 0 && (
        <p className="py-16 text-center text-sm text-[var(--muted)]">No questions match your filters.</p>
      )}
    </div>
  );
}
