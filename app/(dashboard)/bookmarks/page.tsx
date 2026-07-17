"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, BookOpen, Braces, Trash2, Trophy } from "lucide-react";
import { Badge, EmptyState, SectionTitle } from "@/components/ui/primitives";
import { TOPIC_BY_SLUG } from "@/lib/data/topics";
import { SQL_FUNCTIONS } from "@/lib/data/functions";
import { INTERVIEW_QUESTIONS } from "@/lib/data/interview";
import { useAppStore } from "@/lib/store";

export default function BookmarksPage() {
  const [mounted, setMounted] = useState(false);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  useEffect(() => setMounted(true), []);

  const resolved = (mounted ? bookmarks : [])
    .map((key) => {
      const [kind, id] = key.split(":");
      if (kind === "topic") {
        const t = TOPIC_BY_SLUG.get(id);
        return t ? { key, kind, title: t.title, sub: t.definition, href: `/learn/${t.slug}`, icon: BookOpen } : null;
      }
      if (kind === "function") {
        const f = SQL_FUNCTIONS.find((f) => f.name === id);
        return f ? { key, kind, title: f.name, sub: f.syntax.split("\n")[0], href: `/functions?q=${encodeURIComponent(f.name.split("/")[0].trim())}`, icon: Braces } : null;
      }
      if (kind === "question") {
        const q = INTERVIEW_QUESTIONS.find((q) => q.id === id);
        return q ? { key, kind, title: q.question, sub: `${q.difficulty} · ${q.tracks.join(", ")}`, href: `/interview?q=${encodeURIComponent(q.question.slice(0, 40))}`, icon: Trophy } : null;
      }
      return null;
    })
    .filter(Boolean) as { key: string; kind: string; title: string; sub: string; href: string; icon: typeof BookOpen }[];

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle
        icon={<Bookmark size={22} className="text-brand-500" />}
        title="Bookmarks"
        subtitle="Topics, functions, and interview questions you've saved for later."
      />
      {resolved.length === 0 ? (
        <EmptyState
          emoji="🔖"
          title="Nothing bookmarked yet"
          hint="Look for the bookmark icon on topics, functions, and interview questions."
        />
      ) : (
        <div className="space-y-2">
          {resolved.map((b) => (
            <div key={b.key} className="card-surface flex items-center gap-3 rounded-xl px-4 py-3">
              <b.icon size={16} className="shrink-0 text-brand-500" />
              <Link href={b.href} className="min-w-0 flex-1 hover:text-brand-500">
                <div className="truncate text-sm font-semibold">{b.title}</div>
                <div className="truncate text-xs text-[var(--muted)]">{b.sub}</div>
              </Link>
              <Badge tone="zinc">{b.kind}</Badge>
              <button onClick={() => toggleBookmark(b.key)} className="cursor-pointer text-[var(--muted)] hover:text-red-500" title="Remove">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
