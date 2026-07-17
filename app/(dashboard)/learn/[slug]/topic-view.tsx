"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Briefcase,
  CheckCircle2, Circle, Clock, Gauge, GraduationCap, Lightbulb, ListChecks, Trophy,
} from "lucide-react";
import { Badge, Button, Card, difficultyTone } from "@/components/ui/primitives";
import { MiniTable, SqlBlock } from "@/components/sql-block";
import { TOPICS, TOPIC_BY_SLUG } from "@/lib/data/topics";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function Quiz({ slug }: { slug: string }) {
  const topic = TOPIC_BY_SLUG.get(slug)!;
  const [answers, setAnswers] = useState<Record<number, number>>({});

  return (
    <div className="space-y-4">
      {topic.quiz.map((qz, qi) => {
        const chosen = answers[qi];
        return (
          <div key={qi} className="rounded-xl border border-[var(--border)] p-4">
            <div className="mb-3 text-sm font-semibold">{qi + 1}. {qz.q}</div>
            <div className="space-y-1.5">
              {qz.options.map((opt, oi) => {
                const isChosen = chosen === oi;
                const isCorrect = qz.answer === oi;
                const revealed = chosen !== undefined;
                return (
                  <button
                    key={oi}
                    onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                    disabled={revealed}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors disabled:cursor-default",
                      revealed && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                      revealed && isChosen && !isCorrect && "border-red-500/50 bg-red-500/10",
                      !revealed && "border-[var(--border)] hover:border-brand-500/50"
                    )}
                  >
                    {revealed && isCorrect ? (
                      <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                    ) : (
                      <Circle size={14} className="shrink-0 text-[var(--muted)]" />
                    )}
                    {opt}
                  </button>
                );
              })}
            </div>
            {chosen !== undefined && (
              <p className="mt-3 flex items-start gap-2 text-[13px] text-[var(--muted)]">
                <Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-500" />
                {qz.why}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TopicView({ slug }: { slug: string }) {
  const topic = TOPIC_BY_SLUG.get(slug)!;
  const completedTopics = useAppStore((s) => s.completedTopics);
  const toggleTopicComplete = useAppStore((s) => s.toggleTopicComplete);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);

  const done = completedTopics.includes(slug);
  const bmKey = `topic:${slug}`;
  const marked = bookmarks.includes(bmKey);

  const idx = TOPICS.findIndex((t) => t.slug === slug);
  const prev = TOPICS[idx - 1];
  const next = TOPICS[idx + 1];

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/learn" className="mb-5 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-brand-500">
        <ArrowLeft size={14} /> All topics
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{topic.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone={difficultyTone(topic.level)}>{topic.level}</Badge>
            <Badge tone="zinc">{topic.category}</Badge>
            <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
              <Clock size={11} /> ~{topic.estMinutes} min
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toggleBookmark(bmKey)}>
            {marked ? <BookmarkCheck size={14} className="text-brand-500" /> : <Bookmark size={14} />}
            {marked ? "Saved" : "Save"}
          </Button>
          <Button variant={done ? "outline" : "gradient"} size="sm" onClick={() => toggleTopicComplete(slug)}>
            <CheckCircle2 size={14} className={done ? "text-emerald-500" : ""} />
            {done ? "Completed ✓" : "Mark complete (+20 XP)"}
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Definition + explanations */}
        <Card className="space-y-4 p-6">
          <p className="text-lg font-medium leading-relaxed">{topic.definition}</p>
          <div>
            <h3 className="mb-1.5 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[var(--muted)]">
              <Lightbulb size={13} className="text-amber-500" /> In plain words
            </h3>
            <p className="text-sm leading-relaxed">{topic.simple}</p>
          </div>
          <div>
            <h3 className="mb-1.5 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[var(--muted)]">
              <GraduationCap size={13} className="text-brand-500" /> Technically speaking
            </h3>
            <p className="text-sm leading-relaxed text-[var(--muted)]">{topic.technical}</p>
          </div>
        </Card>

        {/* Syntax */}
        <section>
          <h2 className="mb-3 text-lg font-bold">Syntax</h2>
          <SqlBlock sql={topic.syntax} title="Pattern" runnable={false} />
        </section>

        {/* Examples */}
        <section>
          <h2 className="mb-3 text-lg font-bold">Worked examples</h2>
          <div className="space-y-5">
            {topic.examples.map((ex, i) => (
              <div key={i} className="space-y-2">
                <SqlBlock sql={ex.sql} title={`Example ${i + 1}`} />
                {ex.note && <p className="text-[13px] text-[var(--muted)]">💡 {ex.note}</p>}
                {ex.output && (
                  <MiniTable caption="Output" columns={ex.output.columns} rows={ex.output.rows} />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Business + interview */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Briefcase size={14} className="text-emerald-500" /> Real business use
            </h3>
            <p className="text-[13px] leading-relaxed text-[var(--muted)]">{topic.businessUseCase}</p>
          </Card>
          <Card className="p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Trophy size={14} className="text-amber-500" /> Interview perspective
            </h3>
            <p className="text-[13px] leading-relaxed text-[var(--muted)]">{topic.interviewAngle}</p>
          </Card>
        </div>

        {/* Performance + mistakes */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Gauge size={14} className="text-cyan-500" /> Performance tips
            </h3>
            <ul className="space-y-1.5 text-[13px] text-[var(--muted)]">
              {topic.performanceTips.map((t, i) => (
                <li key={i} className="flex gap-2"><span className="text-emerald-500">▸</span>{t}</li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <AlertTriangle size={14} className="text-red-500" /> Common mistakes
            </h3>
            <ul className="space-y-1.5 text-[13px] text-[var(--muted)]">
              {topic.commonMistakes.map((m, i) => (
                <li key={i} className="flex gap-2"><span className="text-red-400">✕</span>{m}</li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Quiz */}
        <section>
          <h2 className="mb-3 text-lg font-bold">Quick quiz</h2>
          <Quiz slug={slug} />
        </section>

        {/* Practice */}
        <Card className="p-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <ListChecks size={14} className="text-brand-500" /> Practice in the playground
          </h3>
          <ul className="space-y-1.5 text-[13px] text-[var(--muted)]">
            {topic.practice.map((p, i) => (
              <li key={i} className="flex gap-2"><span className="font-bold text-brand-500">{i + 1}.</span>{p}</li>
            ))}
          </ul>
          <Link href="/playground">
            <Button variant="outline" size="sm" className="mt-3">Open playground <ArrowRight size={13} /></Button>
          </Link>
        </Card>

        {/* Related + prev/next */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-bold uppercase tracking-wide text-[var(--muted)]">Further reading:</span>
          {topic.related.map((r) => {
            const t = TOPIC_BY_SLUG.get(r);
            return t ? (
              <Link key={r} href={`/learn/${r}`} className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs transition-colors hover:border-brand-500/50 hover:text-brand-500">
                {t.title}
              </Link>
            ) : null;
          })}
        </div>

        <div className="flex justify-between border-t border-[var(--border)] pt-5">
          {prev ? (
            <Link href={`/learn/${prev.slug}`} className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-brand-500">
              <ArrowLeft size={14} /> {prev.title}
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/learn/${next.slug}`} className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-brand-500">
              {next.title} <ArrowRight size={14} />
            </Link>
          ) : <span />}
        </div>
      </div>
    </div>
  );
}
