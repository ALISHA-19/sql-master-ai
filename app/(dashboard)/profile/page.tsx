"use client";

import { useEffect, useState } from "react";
import { Award, Bot, CheckCircle2, Flame, ListChecks, Terminal, User, Zap } from "lucide-react";
import { Card, Progress, SectionTitle } from "@/components/ui/primitives";
import { useAppStore, levelForXp } from "@/lib/store";
import { TOPICS } from "@/lib/data/topics";
import { PRACTICE_PROBLEMS } from "@/lib/data/practice";
import { ALL_ROADMAP_NODES } from "@/lib/data/roadmap";

const ALL_BADGES = [
  { id: "first-query", label: "First Query", emoji: "⚡", how: "Run 1 query in the playground" },
  { id: "query-10", label: "10 Queries Run", emoji: "🔥", how: "Run 10 queries" },
  { id: "query-50", label: "50 Queries Run", emoji: "🚀", how: "Run 50 queries" },
  { id: "first-topic", label: "First Lesson", emoji: "📖", how: "Complete 1 learn topic" },
  { id: "topic-5", label: "5 Lessons Done", emoji: "🎓", how: "Complete 5 topics" },
  { id: "topic-15", label: "SQL Scholar", emoji: "🧠", how: "Complete 15 topics" },
  { id: "first-problem", label: "Problem Solver", emoji: "✅", how: "Solve 1 practice problem" },
  { id: "problem-10", label: "10 Problems Solved", emoji: "🏆", how: "Solve 10 problems" },
  { id: "streak-3", label: "3-Day Streak", emoji: "📅", how: "Visit 3 days in a row" },
  { id: "streak-7", label: "Week Streak", emoji: "🌟", how: "Visit 7 days in a row" },
  { id: "ai-first", label: "Asked the AI", emoji: "🤖", how: "Ask the assistant a question" },
];

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const s = useAppStore();
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const lvl = levelForXp(s.xp);
  const earned = new Set(s.badges.map((b) => b.id));

  const stats = [
    { icon: Zap, label: "Total XP", value: s.xp, color: "text-amber-500" },
    { icon: Flame, label: "Current streak", value: `${s.streak} day${s.streak === 1 ? "" : "s"}`, color: "text-orange-500" },
    { icon: Terminal, label: "Queries run", value: s.queriesRun, color: "text-brand-500" },
    { icon: Bot, label: "AI questions", value: s.aiQuestionsAsked, color: "text-violet-500" },
    { icon: CheckCircle2, label: "Topics done", value: `${s.completedTopics.length}/${TOPICS.length}`, color: "text-emerald-500" },
    { icon: ListChecks, label: "Problems solved", value: `${s.solvedProblems.length}/${PRACTICE_PROBLEMS.length}`, color: "text-cyan-500" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle icon={<User size={22} className="text-brand-500" />} title="Profile" subtitle="Your journey so far — stored locally, yours alone." />

      {/* Level card */}
      <Card className="mb-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Level {lvl.level}</div>
            <div className="gradient-text text-2xl font-extrabold">{lvl.title}</div>
          </div>
          <div className="text-right text-sm text-[var(--muted)]">
            {lvl.pct < 100 ? `${lvl.nextAt - s.xp} XP to next level` : "Max level reached 🎉"}
          </div>
        </div>
        <Progress value={lvl.pct} className="mt-4" />
      </Card>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((st) => (
          <Card key={st.label} className="p-4">
            <st.icon size={16} className={`mb-2 ${st.color}`} />
            <div className="text-xl font-bold">{st.value}</div>
            <div className="text-[11px] text-[var(--muted)]">{st.label}</div>
          </Card>
        ))}
      </div>

      {/* Badges */}
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <Award size={18} className="text-amber-500" /> Achievements ({earned.size}/{ALL_BADGES.length})
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ALL_BADGES.map((b) => {
          const has = earned.has(b.id);
          return (
            <div
              key={b.id}
              className={`card-surface rounded-xl p-4 text-center transition-all ${has ? "border-amber-500/40" : "opacity-45 grayscale"}`}
              title={b.how}
            >
              <div className="text-2xl">{b.emoji}</div>
              <div className="mt-1.5 text-xs font-semibold">{b.label}</div>
              <div className="mt-0.5 text-[10px] text-[var(--muted)]">{has ? "Earned ✓" : b.how}</div>
            </div>
          );
        })}
      </div>

      {/* Roadmap completion */}
      <Card className="mt-8 p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">Roadmap completion</span>
          <span className="text-[var(--muted)]">
            {s.completedRoadmap.length}/{ALL_ROADMAP_NODES.length} nodes
          </span>
        </div>
        <Progress value={(s.completedRoadmap.length / ALL_ROADMAP_NODES.length) * 100} />
      </Card>
    </div>
  );
}
