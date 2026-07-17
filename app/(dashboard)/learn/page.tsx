"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, Clock, Search } from "lucide-react";
import { Badge, difficultyTone, Input, SectionTitle } from "@/components/ui/primitives";
import { topicsByCategory } from "@/lib/data/topics";
import { useAppStore } from "@/lib/store";

export default function LearnPage() {
  const [q, setQ] = useState("");
  const completed = useAppStore((s) => s.completedTopics);
  const groups = topicsByCategory();

  const filter = (title: string, def: string) =>
    !q.trim() || (title + " " + def).toLowerCase().includes(q.toLowerCase());

  return (
    <div>
      <SectionTitle
        icon={<BookOpen size={22} className="text-brand-500" />}
        title="Learn SQL"
        subtitle="Every concept, explained the same rigorous way: definition, simple + technical explanation, syntax, worked examples, business use case, interview angle, mistakes, and a quiz."
      />
      <div className="relative mb-8 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter topics…" className="pl-9" />
      </div>

      <div className="space-y-10">
        {groups.map((g) => {
          const visible = g.topics.filter((t) => filter(t.title, t.definition));
          if (visible.length === 0) return null;
          return (
            <div key={g.category}>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[var(--muted)]">
                {g.category}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((t, i) => (
                  <motion.div
                    key={t.slug}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Link href={`/learn/${t.slug}`}>
                      <div className="card-surface group h-full rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-md">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="font-semibold group-hover:text-brand-500">{t.title}</h3>
                          {completed.includes(t.slug) && (
                            <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                          )}
                        </div>
                        <p className="line-clamp-2 text-[13px] text-[var(--muted)]">{t.definition}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <Badge tone={difficultyTone(t.level)}>{t.level}</Badge>
                          <span className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
                            <Clock size={10} /> {t.estMinutes} min
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
