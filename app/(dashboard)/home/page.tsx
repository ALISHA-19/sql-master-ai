"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, Bot, BookOpen, CheckCircle2, Flame, ListChecks, Map,
  Sparkles, Terminal, Trophy, Zap,
} from "lucide-react";
import { Badge, Card, Progress } from "@/components/ui/primitives";
import { useAppStore, levelForXp } from "@/lib/store";
import { TOPICS } from "@/lib/data/topics";
import { PRACTICE_PROBLEMS } from "@/lib/data/practice";
import { ALL_ROADMAP_NODES } from "@/lib/data/roadmap";
import { SUGGESTED_PROMPTS } from "@/lib/assistant/engine";

const QUICK = [
  { href: "/assistant", icon: Bot, title: "Ask the AI", desc: "Generate, explain, debug, optimize" },
  { href: "/playground", icon: Terminal, title: "Playground", desc: "Run SQL on real sample data" },
  { href: "/roadmap", icon: Map, title: "Roadmap", desc: "Your Beginner→Expert path" },
  { href: "/interview", icon: Trophy, title: "Interview Prep", desc: "Questions, hints, solutions" },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const s = useAppStore();
  useEffect(() => setMounted(true), []);

  const lvl = levelForXp(mounted ? s.xp : 0);
  const topicsPct = mounted ? Math.round((s.completedTopics.length / TOPICS.length) * 100) : 0;
  const problemsPct = mounted ? Math.round((s.solvedProblems.length / PRACTICE_PROBLEMS.length) * 100) : 0;
  const roadmapPct = mounted ? Math.round((s.completedRoadmap.length / ALL_ROADMAP_NODES.length) * 100) : 0;

  const nextTopic = TOPICS.find((t) => !s.completedTopics.includes(t.slug));

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back 👋</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {mounted && s.streak > 1
                ? `${s.streak}-day streak — keep it alive with one query today.`
                : "One query a day beats a weekend cram. Start anywhere below."}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge tone="amber"><Zap size={11} /> {mounted ? s.xp : 0} XP</Badge>
            <Badge tone="red"><Flame size={11} /> {mounted ? s.streak : 0}-day streak</Badge>
            <Badge tone="violet"><Sparkles size={11} /> {lvl.title}</Badge>
          </div>
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK.map((q, i) => (
          <motion.div
            key={q.href}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Link href={q.href}>
              <Card className="group h-full p-5 hover:border-brand-500/40">
                <q.icon size={20} className="mb-3 text-brand-500 transition-transform group-hover:scale-110" />
                <div className="font-semibold">{q.title}</div>
                <div className="mt-0.5 text-xs text-[var(--muted)]">{q.desc}</div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Progress row */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-semibold"><BookOpen size={15} className="text-brand-500" /> Topics learned</span>
            <span className="text-[var(--muted)]">{mounted ? s.completedTopics.length : 0}/{TOPICS.length}</span>
          </div>
          <Progress value={topicsPct} />
          {nextTopic && (
            <Link href={`/learn/${nextTopic.slug}`} className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-500 hover:underline">
              Next up: {nextTopic.title} <ArrowRight size={12} />
            </Link>
          )}
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-semibold"><ListChecks size={15} className="text-emerald-500" /> Problems solved</span>
            <span className="text-[var(--muted)]">{mounted ? s.solvedProblems.length : 0}/{PRACTICE_PROBLEMS.length}</span>
          </div>
          <Progress value={problemsPct} />
          <Link href="/practice" className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-500 hover:underline">
            Open practice set <ArrowRight size={12} />
          </Link>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-semibold"><Map size={15} className="text-violet-500" /> Roadmap</span>
            <span className="text-[var(--muted)]">{roadmapPct}%</span>
          </div>
          <Progress value={roadmapPct} />
          <Link href="/roadmap" className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-500 hover:underline">
            Continue the path <ArrowRight size={12} />
          </Link>
        </Card>
      </div>

      {/* Try asking + badges */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Bot size={16} className="text-brand-500" /> Try asking the assistant
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.slice(0, 8).map((p) => (
              <Link
                key={p}
                href={`/assistant?q=${encodeURIComponent(p)}`}
                className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs transition-colors hover:border-brand-500/50 hover:bg-brand-500/8 hover:text-brand-500"
              >
                {p.length > 52 ? p.slice(0, 52) + "…" : p}
              </Link>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Trophy size={16} className="text-amber-500" /> Badges
          </div>
          {mounted && s.badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {s.badges.map((b) => (
                <span key={b.id} className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-zinc-500/5 px-3 py-1.5 text-xs font-medium" title={new Date(b.earnedAt).toLocaleDateString()}>
                  <span>{b.emoji}</span> {b.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              No badges yet. Run your first query in the{" "}
              <Link href="/playground" className="text-brand-500 hover:underline">playground</Link>{" "}
              to earn ⚡ First Query (+50 XP).
            </p>
          )}
          <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
            <CheckCircle2 size={13} className="text-emerald-500" />
            Progress is saved locally in your browser.
          </div>
        </Card>
      </div>
    </div>
  );
}
