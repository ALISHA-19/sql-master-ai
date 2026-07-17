"use client";

import { useState } from "react";
import { Check, Copy, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn, highlightSql } from "@/lib/utils";

/** Syntax-highlighted SQL code block with copy + "open in playground" actions. */
export function SqlBlock({
  sql,
  title,
  runnable = true,
  className,
}: {
  sql: string;
  title?: string;
  runnable?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const copy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const openInPlayground = () => {
    sessionStorage.setItem("playground-sql", sql);
    router.push("/playground");
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-[var(--border)]", className)}>
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-zinc-500/5 px-3.5 py-1.5">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
          {title ?? "SQL"}
        </span>
        <div className="flex items-center gap-1">
          {runnable && (
            <button
              onClick={openInPlayground}
              title="Open in Playground"
              className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--muted)] transition-colors hover:bg-brand-500/10 hover:text-brand-500"
            >
              <Play size={12} /> Run
            </button>
          )}
          <button
            onClick={copy}
            title="Copy SQL"
            className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--muted)] transition-colors hover:bg-brand-500/10 hover:text-brand-500"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto bg-[var(--card)] p-4 text-[13px] leading-relaxed">
        <code
          className="font-mono"
          dangerouslySetInnerHTML={{ __html: highlightSql(sql) }}
        />
      </pre>
    </div>
  );
}

/** Renders a small inline data table (sample inputs / expected outputs). */
export function MiniTable({
  caption,
  columns,
  rows,
  className,
}: {
  caption?: string;
  columns: string[];
  rows: (string | number | null)[][];
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-[var(--border)]", className)}>
      {caption && (
        <div className="border-b border-[var(--border)] bg-zinc-500/5 px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
          {caption}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="result-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j} className={v === null ? "italic text-[var(--muted)]" : ""}>
                    {v === null ? "NULL" : String(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
