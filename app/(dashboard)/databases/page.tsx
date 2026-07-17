"use client";

import { Database } from "lucide-react";
import { Badge, Card, SectionTitle } from "@/components/ui/primitives";
import { DB_PROFILES, SYNTAX_COMPARISON } from "@/lib/data/databases";

export default function DatabasesPage() {
  return (
    <div>
      <SectionTitle
        icon={<Database size={22} className="text-brand-500" />}
        title="Database Explorer"
        subtitle="The five databases you'll actually meet, their personalities, and the syntax differences that cause real bugs when you switch."
      />

      <div className="mb-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DB_PROFILES.map((db) => (
          <Card key={db.name} className="p-5">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-bold">{db.name}</h3>
              <Badge tone="zinc">{db.license.split(" ")[0]}</Badge>
            </div>
            <p className="text-[12px] text-[var(--muted)]">{db.vendor}</p>
            <p className="mt-3 text-[13px] leading-relaxed">{db.personality}</p>
            <p className="mt-2 text-[13px] text-[var(--muted)]">
              <span className="font-semibold text-[var(--fg)]">Best for:</span> {db.bestFor}
            </p>
          </Card>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-bold">Syntax comparison</h2>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="result-table w-full">
          <thead>
            <tr>
              <th>Task</th>
              <th>PostgreSQL</th>
              <th>MySQL</th>
              <th>SQL Server</th>
              <th>Oracle</th>
              <th>SQLite</th>
            </tr>
          </thead>
          <tbody>
            {SYNTAX_COMPARISON.map((r) => (
              <tr key={r.task}>
                <td className="font-sans font-semibold">{r.task}</td>
                <td>{r.postgres}</td>
                <td>{r.mysql}</td>
                <td>{r.sqlserver}</td>
                <td>{r.oracle}</td>
                <td>{r.sqlite}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[13px] text-[var(--muted)]">
        💡 Compatibility rule of thumb: write standard SQL (explicit JOINs, COALESCE, CTEs, window functions) and isolate
        dialect-specific pieces (date math, pagination, upserts) so ports touch one file, not fifty.
      </p>
    </div>
  );
}
