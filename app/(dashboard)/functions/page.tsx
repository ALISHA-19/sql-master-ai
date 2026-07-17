"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, Braces, Search } from "lucide-react";
import { Badge, Input, SectionTitle } from "@/components/ui/primitives";
import { SqlBlock } from "@/components/sql-block";
import { FN_CATEGORIES, SQL_FUNCTIONS, type FnCategory } from "@/lib/data/functions";
import { useAppStore } from "@/lib/store";
import { useQueryParam } from "@/lib/use-query-param";
import { cn } from "@/lib/utils";

export default function FunctionsPage() {
  const urlQuery = useQueryParam("q");
  const [q, setQ] = useState("");
  useEffect(() => {
    if (urlQuery) setQ(urlQuery);
  }, [urlQuery]);
  const [cat, setCat] = useState<FnCategory | "All">("All");
  const bookmarks = useAppStore((s) => s.bookmarks);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);

  const visible = useMemo(
    () =>
      SQL_FUNCTIONS.filter((f) => {
        if (cat !== "All" && f.category !== cat) return false;
        if (!q.trim()) return true;
        return (f.name + f.syntax + f.edgeCases + f.category).toLowerCase().includes(q.toLowerCase());
      }),
    [q, cat]
  );

  return (
    <div>
      <SectionTitle
        icon={<Braces size={22} className="text-brand-500" />}
        title="SQL Functions Explorer"
        subtitle="Every function documented the same way: syntax, arguments, return value, a runnable example, the edge case that bites, and the interview note."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search functions…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["All", ...FN_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                cat === c
                  ? "border-brand-500/50 bg-brand-500/12 text-brand-500"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-brand-500/40"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((f) => {
          const bmKey = `function:${f.name}`;
          const marked = bookmarks.includes(bmKey);
          return (
            <div key={f.name} className="card-surface rounded-2xl p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-[15px] font-bold text-brand-600 dark:text-brand-300">{f.name}</h3>
                  <Badge tone="violet">{f.category}</Badge>
                </div>
                <button onClick={() => toggleBookmark(bmKey)} className="cursor-pointer text-[var(--muted)] hover:text-brand-500" title="Bookmark">
                  {marked ? <BookmarkCheck size={15} className="text-brand-500" /> : <Bookmark size={15} />}
                </button>
              </div>
              <pre className="mb-3 overflow-x-auto rounded-lg bg-zinc-500/8 px-3 py-2 font-mono text-[12px]">{f.syntax}</pre>
              <dl className="mb-3 space-y-1 text-[13px]">
                <div className="flex gap-2"><dt className="shrink-0 font-semibold">Args:</dt><dd className="text-[var(--muted)]">{f.args}</dd></div>
                <div className="flex gap-2"><dt className="shrink-0 font-semibold">Returns:</dt><dd className="text-[var(--muted)]">{f.returns}</dd></div>
              </dl>
              <SqlBlock sql={f.example} title="Example" />
              {f.exampleResult && (
                <p className="mt-2 font-mono text-[12px] text-emerald-600 dark:text-emerald-400">→ {f.exampleResult}</p>
              )}
              <p className="mt-2.5 text-[13px] text-[var(--muted)]">
                <span className="font-semibold text-amber-600 dark:text-amber-400">⚠ Edge cases:</span> {f.edgeCases}
              </p>
              {f.performance && (
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  <span className="font-semibold text-cyan-600 dark:text-cyan-400">⚡ Performance:</span> {f.performance}
                </p>
              )}
              {f.interviewNote && (
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  <span className="font-semibold text-violet-600 dark:text-violet-400">🎯 Interview:</span> {f.interviewNote}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {visible.length === 0 && (
        <p className="py-16 text-center text-sm text-[var(--muted)]">No functions match — try another term or category.</p>
      )}
    </div>
  );
}
