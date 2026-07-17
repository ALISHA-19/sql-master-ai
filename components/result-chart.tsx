"use client";

import { useMemo } from "react";
import type { QueryResult } from "@/lib/db/engine";

/**
 * A dependency-free horizontal bar chart for query results that are shaped like
 * "one label column + one numeric column" (group aggregates, top-N, etc.).
 * Renders inline SVG, theme-aware via CSS variables. Returns null when the
 * result isn't chartable, so callers can render it unconditionally.
 */

function isNum(v: unknown): boolean {
  return typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)));
}
function fmt(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v);
}

export function chartable(output: QueryResult | undefined): boolean {
  if (!output || output.error) return false;
  const { columns, rows, rowCount } = output;
  if (rowCount < 2 || rowCount > 30) return false;
  const labelIdx = columns.findIndex((_, i) => !isNum(rows[0][i]));
  const valueIdx = columns.findIndex((_, i) => isNum(rows[0][i]));
  return labelIdx >= 0 && valueIdx >= 0 && labelIdx !== valueIdx;
}

export function ResultChart({ output }: { output: QueryResult }) {
  const data = useMemo(() => {
    const { columns, rows } = output;
    const labelIdx = columns.findIndex((_, i) => !isNum(rows[0][i]));
    const valueIdx = columns.findIndex((_, i) => isNum(rows[0][i]));
    if (labelIdx < 0 || valueIdx < 0) return null;
    const items = rows
      .map((r) => ({ label: r[labelIdx] === null ? "—" : String(r[labelIdx]), value: Number(r[valueIdx]) }))
      .filter((d) => Number.isFinite(d.value));
    const max = Math.max(...items.map((d) => d.value), 0);
    const min = Math.min(...items.map((d) => d.value), 0);
    return { items, max, min, valueName: columns[valueIdx], labelName: columns[labelIdx] };
  }, [output]);

  if (!data || data.items.length === 0) return null;
  const { items, max, min, valueName, labelName } = data;
  const span = max - Math.min(min, 0) || 1;

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-brand-500/5 px-3.5 py-1.5">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-300">
          Chart · {valueName} by {labelName}
        </span>
      </div>
      <div className="space-y-2 p-3.5">
        {items.map((d, i) => {
          const pct = ((d.value - Math.min(min, 0)) / span) * 100;
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-28 shrink-0 truncate text-right text-[var(--muted)]" title={d.label}>
                {d.label}
              </div>
              <div className="relative h-5 flex-1 overflow-hidden rounded bg-zinc-500/10">
                <div
                  className="absolute inset-y-0 left-0 rounded bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${Math.max(pct, 1.5)}%` }}
                />
              </div>
              <div className="w-20 shrink-0 font-mono font-semibold tabular-nums">{fmt(d.value)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
