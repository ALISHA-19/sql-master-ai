"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Layers } from "lucide-react";
import { SectionTitle } from "@/components/ui/primitives";
import { SqlBlock } from "@/components/sql-block";
import { cn } from "@/lib/utils";

type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL";

const JOIN_INFO: Record<JoinType, { sql: string; desc: string; left: number; both: number; right: number }> = {
  INNER: { sql: "SELECT *\nFROM a INNER JOIN b ON a.id = b.id;", desc: "Only rows that match on BOTH sides survive — the overlap.", left: 0.15, both: 1, right: 0.15 },
  LEFT: { sql: "SELECT *\nFROM a LEFT JOIN b ON a.id = b.id;", desc: "Every row from A is kept; matching B data attaches where it exists, NULLs where it doesn't.", left: 1, both: 1, right: 0.15 },
  RIGHT: { sql: "SELECT *\nFROM a RIGHT JOIN b ON a.id = b.id;", desc: "Mirror of LEFT: every row from B kept, A attaches where it matches.", left: 0.15, both: 1, right: 1 },
  FULL: { sql: "SELECT *\nFROM a FULL OUTER JOIN b ON a.id = b.id;", desc: "Union of both: all rows from A and B, matched where possible, NULL-padded elsewhere.", left: 1, both: 1, right: 1 },
};

function JoinVenn() {
  const [type, setType] = useState<JoinType>("INNER");
  const info = JOIN_INFO[type];

  return (
    <div className="card-surface rounded-2xl p-6">
      <div className="mb-5 flex flex-wrap gap-1.5">
        {(Object.keys(JOIN_INFO) as JoinType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn(
              "cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              type === t ? "border-brand-500/60 bg-brand-500/12 text-brand-500" : "border-[var(--border)] text-[var(--muted)]"
            )}
          >
            {t} JOIN
          </button>
        ))}
      </div>

      <div className="grid items-center gap-6 md:grid-cols-2">
        <svg viewBox="0 0 300 180" className="mx-auto w-full max-w-sm">
          <defs>
            <clipPath id="clipA"><circle cx="115" cy="90" r="65" /></clipPath>
            <clipPath id="clipB"><circle cx="185" cy="90" r="65" /></clipPath>
          </defs>
          {/* left-only */}
          <motion.circle
            cx="115" cy="90" r="65"
            fill="#6366f1"
            animate={{ fillOpacity: info.left * 0.55 }}
            transition={{ duration: 0.5 }}
            stroke="#6366f1" strokeWidth="2"
          />
          {/* right-only */}
          <motion.circle
            cx="185" cy="90" r="65"
            fill="#a855f7"
            animate={{ fillOpacity: info.right * 0.55 }}
            transition={{ duration: 0.5 }}
            stroke="#a855f7" strokeWidth="2"
          />
          {/* intersection */}
          <g clipPath="url(#clipA)">
            <motion.circle
              cx="185" cy="90" r="65"
              fill="#ec4899"
              animate={{ fillOpacity: info.both * 0.8 }}
              transition={{ duration: 0.5 }}
            />
          </g>
          <text x="80" y="95" textAnchor="middle" className="fill-current text-[13px] font-bold">A</text>
          <text x="220" y="95" textAnchor="middle" className="fill-current text-[13px] font-bold">B</text>
          <text x="150" y="95" textAnchor="middle" className="fill-white text-[11px] font-bold">A∩B</text>
        </svg>
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            <motion.p
              key={type}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm leading-relaxed"
            >
              {info.desc}
            </motion.p>
          </AnimatePresence>
          <SqlBlock sql={info.sql} runnable={false} />
        </div>
      </div>
    </div>
  );
}

function GroupByFlow() {
  const rows = [
    { id: 1, cat: "Electronics", price: 89.99, color: "#6366f1" },
    { id: 2, cat: "Furniture", price: 499.0, color: "#a855f7" },
    { id: 3, cat: "Electronics", price: 29.99, color: "#6366f1" },
    { id: 4, cat: "Stationery", price: 12.5, color: "#ec4899" },
    { id: 5, cat: "Furniture", price: 289.0, color: "#a855f7" },
    { id: 6, cat: "Electronics", price: 349.0, color: "#6366f1" },
  ];
  const groups = [
    { cat: "Electronics", n: 3, sum: 468.98, color: "#6366f1" },
    { cat: "Furniture", n: 2, sum: 788.0, color: "#a855f7" },
    { cat: "Stationery", n: 1, sum: 12.5, color: "#ec4899" },
  ];
  const [grouped, setGrouped] = useState(false);

  return (
    <div className="card-surface rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">
          Watch rows collapse into one row per group.
        </p>
        <button
          onClick={() => setGrouped((g) => !g)}
          className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition-transform active:scale-95"
        >
          {grouped ? "↺ Ungrouped rows" : "▶ Apply GROUP BY category"}
        </button>
      </div>
      <SqlBlock sql={"SELECT category, COUNT(*), SUM(price)\nFROM products\nGROUP BY category;"} runnable={false} />
      <div className="mt-4 min-h-[220px]">
        <AnimatePresence mode="wait">
          {!grouped ? (
            <motion.div key="rows" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
              {rows.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ x: -14, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-1.5 font-mono text-xs"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                  <span className="w-28">{r.cat}</span>
                  <span className="text-[var(--muted)]">{r.price.toFixed(2)}</span>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div key="groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {groups.map((g, i) => (
                <motion.div
                  key={g.cat}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.12, type: "spring", stiffness: 260 }}
                  className="flex items-center gap-3 rounded-lg border-2 px-3 py-2.5 font-mono text-xs"
                  style={{ borderColor: g.color, background: `${g.color}14` }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
                  <span className="w-28 font-bold">{g.cat}</span>
                  <span>COUNT = {g.n}</span>
                  <span className="text-[var(--muted)]">SUM = {g.sum.toFixed(2)}</span>
                </motion.div>
              ))}
              <p className="pt-1 text-[11px] text-[var(--muted)]">
                6 rows → 3 rows: one per distinct category. Aggregates computed within each colored pile.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ExecutionOrder() {
  const STEPS = [
    { kw: "FROM / JOIN", note: "Assemble source rows", written: 2 },
    { kw: "WHERE", note: "Filter rows", written: 3 },
    { kw: "GROUP BY", note: "Form groups", written: 4 },
    { kw: "HAVING", note: "Filter groups", written: 5 },
    { kw: "SELECT", note: "Compute output columns", written: 1 },
    { kw: "ORDER BY", note: "Sort result", written: 6 },
    { kw: "LIMIT", note: "Trim rows", written: 7 },
  ];
  return (
    <div className="card-surface rounded-2xl p-6">
      <p className="mb-4 text-sm text-[var(--muted)]">
        SQL is <strong className="text-[var(--fg)]">written</strong> in one order but{" "}
        <strong className="text-[var(--fg)]">executed</strong> in another. This single fact explains
        why aliases work in ORDER BY but not WHERE.
      </p>
      <div className="space-y-2">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.kw}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.09 }}
            className="flex items-center gap-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-xs font-bold text-white">
              {i + 1}
            </span>
            <div className="flex flex-1 items-center justify-between rounded-lg border border-[var(--border)] px-3.5 py-2">
              <span className="font-mono text-[13px] font-bold text-brand-600 dark:text-brand-300">{s.kw}</span>
              <span className="text-xs text-[var(--muted)]">{s.note}</span>
              <span className="rounded bg-zinc-500/10 px-2 py-0.5 text-[10px] text-[var(--muted)]">
                written #{s.written}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function WindowFrame() {
  const data = [12, 19, 8, 25, 17, 30, 22];
  const [current, setCurrent] = useState(3);
  const frameStart = Math.max(0, current - 2);
  const runningAvg = (
    data.slice(frameStart, current + 1).reduce((a, b) => a + b, 0) /
    (current - frameStart + 1)
  ).toFixed(1);

  return (
    <div className="card-surface rounded-2xl p-6">
      <p className="mb-4 text-sm text-[var(--muted)]">
        A moving-average frame: <code className="rounded bg-zinc-500/10 px-1.5 py-0.5 font-mono text-xs">ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code>.
        Click any bar to move the current row.
      </p>
      <div className="flex h-44 items-end justify-center gap-3">
        {data.map((v, i) => {
          const inFrame = i >= frameStart && i <= current;
          const isCurrent = i === current;
          return (
            <button key={i} onClick={() => setCurrent(i)} className="group flex cursor-pointer flex-col items-center gap-1.5">
              <motion.div
                animate={{
                  height: v * 4.4,
                  opacity: inFrame ? 1 : 0.3,
                  scale: isCurrent ? 1.06 : 1,
                }}
                className={cn(
                  "w-10 rounded-t-lg",
                  isCurrent
                    ? "bg-gradient-to-t from-fuchsia-600 to-pink-500"
                    : inFrame
                      ? "bg-gradient-to-t from-brand-600 to-violet-500"
                      : "bg-zinc-500/40"
                )}
              />
              <span className="font-mono text-[10px] text-[var(--muted)]">day {i + 1}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-center gap-6 text-xs">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-pink-500" /> current row</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-violet-500" /> frame (window)</span>
        <span className="font-mono font-bold text-brand-500">AVG over frame = {runningAvg}</span>
      </div>
    </div>
  );
}

const TABS = [
  { id: "joins", label: "JOINs" },
  { id: "groupby", label: "GROUP BY" },
  { id: "execution", label: "Execution Order" },
  { id: "window", label: "Window Frames" },
] as const;

export default function VisualizerPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("joins");

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle
        icon={<Layers size={22} className="text-brand-500" />}
        title="SQL Visualizer"
        subtitle="Concepts that click faster when you can see them move. Interactive, not screenshots."
      />
      <div className="mb-6 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
              tab === t.id ? "border-brand-500/60 bg-brand-500/12 text-brand-500" : "border-[var(--border)] text-[var(--muted)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "joins" && <JoinVenn />}
      {tab === "groupby" && <GroupByFlow />}
      {tab === "execution" && <ExecutionOrder />}
      {tab === "window" && <WindowFrame />}
    </div>
  );
}
