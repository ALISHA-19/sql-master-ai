"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronDown, Circle, Clock, Lock, Map as MapIcon } from "lucide-react";
import { Badge, difficultyTone, Progress, SectionTitle } from "@/components/ui/primitives";
import { ROADMAP, ALL_ROADMAP_NODES } from "@/lib/data/roadmap";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function RoadmapPage() {
  const completed = useAppStore((s) => s.completedRoadmap);
  const toggle = useAppStore((s) => s.toggleRoadmapNode);

  const totalPct = Math.round((completed.length / ALL_ROADMAP_NODES.length) * 100);
  const nodeById = new Map(ALL_ROADMAP_NODES.map((n) => [n.id, n]));

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle
        icon={<MapIcon size={22} className="text-brand-500" />}
        title="SQL Roadmap"
        subtitle="Beginner to Expert in four stages. Check topics off as you complete them — prerequisites show what to learn first."
      />

      <div className="card-surface mb-10 rounded-2xl p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">Overall progress</span>
          <span className="text-[var(--muted)]">
            {completed.length}/{ALL_ROADMAP_NODES.length} topics · {totalPct}%
          </span>
        </div>
        <Progress value={totalPct} />
      </div>

      <div className="relative space-y-12">
        {/* vertical spine */}
        <div className="absolute bottom-6 left-[15px] top-2 hidden w-px bg-gradient-to-b from-brand-500/60 via-violet-500/40 to-fuchsia-500/20 sm:block" />

        {ROADMAP.map((stage, si) => {
          const stageDone = stage.nodes.filter((n) => completed.includes(n.id)).length;
          const stageTime = stage.nodes.reduce((a, n) => a + n.estMinutes, 0);
          return (
            <motion.section
              key={stage.level}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45 }}
              className="relative sm:pl-12"
            >
              <div className="absolute left-0 top-0 hidden h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-xs font-bold text-white shadow-lg shadow-brand-500/30 sm:flex">
                {si + 1}
              </div>
              <div className="mb-1 flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold">{stage.level}</h2>
                <Badge tone={difficultyTone(stage.level)}>{stage.tagline}</Badge>
                <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                  <Clock size={11} /> ~{Math.round(stageTime / 60 * 10) / 10} h total
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {stageDone}/{stage.nodes.length} done
                </span>
              </div>
              <p className="mb-4 text-sm text-[var(--muted)]">🎯 {stage.outcome}</p>

              <div className="space-y-2">
                {stage.nodes.map((node) => {
                  const done = completed.includes(node.id);
                  const prereqsMet = node.prerequisites.every((p) => completed.includes(p));
                  const blockedBy = node.prerequisites
                    .filter((p) => !completed.includes(p))
                    .map((p) => nodeById.get(p)?.title)
                    .filter(Boolean);
                  return (
                    <details
                      key={node.id}
                      className={cn(
                        "card-surface group rounded-xl px-4 py-3 transition-colors",
                        done && "border-emerald-500/30 bg-emerald-500/[0.04]"
                      )}
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            toggle(node.id);
                          }}
                          className="shrink-0 cursor-pointer"
                          title={done ? "Mark incomplete" : "Mark complete"}
                        >
                          {done ? (
                            <CheckCircle2 size={19} className="text-emerald-500" />
                          ) : (
                            <Circle size={19} className="text-[var(--muted)] transition-colors hover:text-brand-500" />
                          )}
                        </button>
                        <span className={cn("flex-1 text-sm font-medium", done && "text-[var(--muted)] line-through")}>
                          {node.title}
                        </span>
                        {!prereqsMet && !done && (
                          <span title={`Prerequisites: ${blockedBy.join(", ")}`}>
                            <Lock size={13} className="text-amber-500" />
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
                          <Clock size={10} /> {node.estMinutes}m
                        </span>
                        <ChevronDown size={14} className="text-[var(--muted)] transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3 pl-8">
                        <p className="text-[13px] text-[var(--muted)]">{node.summary}</p>
                        {blockedBy.length > 0 && (
                          <p className="text-[12px] text-amber-600 dark:text-amber-400">
                            Learn first: {blockedBy.join(" → ")}
                          </p>
                        )}
                        {node.topicSlug && (
                          <Link
                            href={`/learn/${node.topicSlug}`}
                            className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-500 hover:underline"
                          >
                            Open the full lesson <ArrowRight size={12} />
                          </Link>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
