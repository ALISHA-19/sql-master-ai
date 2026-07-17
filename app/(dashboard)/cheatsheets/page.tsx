"use client";

import { useState } from "react";
import { FileText, Search } from "lucide-react";
import { Badge, type BadgeTone, Input, SectionTitle } from "@/components/ui/primitives";
import { SqlBlock } from "@/components/sql-block";
import { CHEATSHEETS } from "@/lib/data/cheatsheets";

export default function CheatsheetsPage() {
  const [q, setQ] = useState("");

  return (
    <div>
      <SectionTitle
        icon={<FileText size={22} className="text-brand-500" />}
        title="SQL Cheat Sheets"
        subtitle="Copy-ready patterns for the queries you actually write, each with the trap it avoids and where you'd use it."
      />
      <div className="relative mb-8 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patterns… (e.g. 'top-n', 'null', 'pagination')" className="pl-9" />
      </div>

      <div className="space-y-10">
        {CHEATSHEETS.map((section) => {
          const entries = section.entries.filter(
            (e) =>
              !q.trim() ||
              (e.title + e.sql + e.note + e.useCase).toLowerCase().includes(q.toLowerCase())
          );
          if (entries.length === 0) return null;
          return (
            <section key={section.id}>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-lg font-bold">{section.title}</h2>
                <Badge tone={section.color as BadgeTone}>{entries.length} patterns</Badge>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {entries.map((e) => (
                  <div key={e.id} className="card-surface rounded-2xl p-4">
                    <h3 className="mb-2 text-sm font-semibold">{e.title}</h3>
                    <SqlBlock sql={e.sql} />
                    <p className="mt-2.5 text-[13px] text-[var(--muted)]">
                      <span className="font-semibold text-[var(--fg)]">Note:</span> {e.note}
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--muted)]">
                      <span className="font-semibold text-[var(--fg)]">Use it for:</span> {e.useCase}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
