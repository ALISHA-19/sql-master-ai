"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Braces, ListChecks, Search, Trophy, X } from "lucide-react";
import { TOPICS } from "@/lib/data/topics";
import { SQL_FUNCTIONS } from "@/lib/data/functions";
import { PRACTICE_PROBLEMS } from "@/lib/data/practice";
import { INTERVIEW_QUESTIONS } from "@/lib/data/interview";
import { Kbd } from "@/components/ui/primitives";

interface Hit {
  kind: "topic" | "function" | "practice" | "interview";
  title: string;
  sub: string;
  href: string;
}

const INDEX: Hit[] = [
  ...TOPICS.map((t) => ({
    kind: "topic" as const,
    title: t.title,
    sub: `${t.category} · ${t.level} — ${t.definition}`,
    href: `/learn/${t.slug}`,
  })),
  ...SQL_FUNCTIONS.map((f) => ({
    kind: "function" as const,
    title: f.name,
    sub: `${f.category} function — ${f.syntax.split("\n")[0]}`,
    href: `/functions?q=${encodeURIComponent(f.name.split("/")[0].trim())}`,
  })),
  ...PRACTICE_PROBLEMS.map((p) => ({
    kind: "practice" as const,
    title: p.title,
    sub: `${p.difficulty} practice — ${p.tags.join(", ")}`,
    href: `/practice?q=${encodeURIComponent(p.title)}`,
  })),
  ...INTERVIEW_QUESTIONS.map((q) => ({
    kind: "interview" as const,
    title: q.question,
    sub: `${q.difficulty} interview — ${q.tracks.join(", ")}`,
    href: `/interview?q=${encodeURIComponent(q.question.slice(0, 40))}`,
  })),
];

const ICONS = {
  topic: BookOpen,
  function: Braces,
  practice: ListChecks,
  interview: Trophy,
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const hits = useMemo(() => {
    if (!query.trim()) return INDEX.slice(0, 8);
    const terms = query.toLowerCase().split(/\s+/);
    return INDEX.filter((h) =>
      terms.every((t) => (h.title + " " + h.sub).toLowerCase().includes(t))
    ).slice(0, 10);
  }, [query]);

  const go = useCallback(
    (hit: Hit) => {
      setOpen(false);
      router.push(hit.href);
    },
    [router]
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search everything (Ctrl K)"
        className="flex h-9 w-full max-w-xs cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--muted)] transition-colors hover:border-brand-500/50"
      >
        <Search size={14} />
        <span className="flex-1 text-left">Search everything…</span>
        <Kbd>Ctrl K</Kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Search everything"
        >
          <div
            className="glass w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-4">
              <Search size={16} className="text-[var(--muted)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                  if (e.key === "Enter" && hits[active]) go(hits[active]);
                }}
                placeholder="Search topics, functions, problems, interview questions…"
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
              />
              <button onClick={() => setOpen(false)} className="cursor-pointer text-[var(--muted)] hover:text-[var(--fg)]">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {hits.length === 0 && (
                <div className="p-6 text-center text-sm text-[var(--muted)]">
                  No matches. Try &ldquo;join&rdquo;, &ldquo;window&rdquo;, &ldquo;COALESCE&rdquo;…
                </div>
              )}
              {hits.map((h, i) => {
                const Icon = ICONS[h.kind];
                return (
                  <button
                    key={h.href + h.title}
                    onClick={() => go(h)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      i === active ? "bg-brand-500/12" : ""
                    }`}
                  >
                    <Icon size={15} className="mt-0.5 shrink-0 text-brand-500" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{h.title}</span>
                      <span className="block truncate text-xs text-[var(--muted)]">{h.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
