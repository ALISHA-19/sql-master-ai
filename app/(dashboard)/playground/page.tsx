"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import {
  AlertTriangle, Clock, Database, Download, History, Play, RefreshCw,
  Rows3, Save, Table2, Trash2, X,
} from "lucide-react";
import { Badge, Button, EmptyState, SectionTitle, Skeleton } from "@/components/ui/primitives";
import { runQuery, resetDb, type QueryResult } from "@/lib/db/engine";
import { SAMPLE_TABLES, STARTER_QUERY } from "@/lib/db/sample-data";
import { useAppStore } from "@/lib/store";
import { downloadText, toCsv } from "@/lib/utils";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <Skeleton className="h-[320px] w-full" />,
});

export default function PlaygroundPage() {
  const { resolvedTheme } = useTheme();
  const [sql, setSql] = useState(STARTER_QUERY);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [panel, setPanel] = useState<"schema" | "history" | "saved">("schema");
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const sqlRef = useRef(sql);
  sqlRef.current = sql;

  const recordQueryRun = useAppStore((s) => s.recordQueryRun);
  const history = useAppStore((s) => s.history);
  const savedQueries = useAppStore((s) => s.savedQueries);
  const saveQuery = useAppStore((s) => s.saveQuery);
  const deleteSavedQuery = useAppStore((s) => s.deleteSavedQuery);
  const clearHistory = useAppStore((s) => s.clearHistory);

  // Pick up SQL handed over from "Run" buttons elsewhere in the app
  useEffect(() => {
    const handed = sessionStorage.getItem("playground-sql");
    if (handed) {
      setSql(handed);
      sessionStorage.removeItem("playground-sql");
    }
  }, []);

  const execute = useCallback(async () => {
    const query = sqlRef.current;
    if (!query.trim()) return;
    setRunning(true);
    const res = await runQuery(query);
    setResult(res);
    setRunning(false);
    recordQueryRun(query, !res.error);
  }, [recordQueryRun]);

  // Ctrl+Enter anywhere on the page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        execute();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [execute]);

  const reset = async () => {
    await resetDb();
    setResult({ columns: ["status"], rows: [["Database reset to the original sample data."]], rowCount: 0, ms: 0 });
  };

  const exportCsv = () => {
    if (!result || result.error) return;
    downloadText("query-results.csv", toCsv(result.columns, result.rows), "text/csv");
  };

  return (
    <div>
      <SectionTitle
        icon={<Database size={22} className="text-brand-500" />}
        title="SQL Playground"
        subtitle="A real SQLite database in your browser. 5 sample tables pre-loaded — nothing leaves your machine. Ctrl+Enter to run."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_270px]">
        <div className="min-w-0 space-y-4">
          {/* Editor */}
          <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-zinc-500/5 px-3 py-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                editor.sql
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowSave(true)} title="Save query">
                  <Save size={13} /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={reset} title="Reset sample database">
                  <RefreshCw size={13} /> Reset DB
                </Button>
                <Button size="sm" variant="gradient" onClick={execute} disabled={running}>
                  <Play size={13} /> {running ? "Running…" : "Run (Ctrl+↵)"}
                </Button>
              </div>
            </div>
            <MonacoEditor
              height="320px"
              language="sql"
              theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
              value={sql}
              onChange={(v) => setSql(v ?? "")}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "var(--font-geist-mono), monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                padding: { top: 12 },
                automaticLayout: true,
                suggest: { showKeywords: true },
                quickSuggestions: true,
                wordBasedSuggestions: "currentDocument",
              }}
            />
          </div>

          {/* Save dialog */}
          {showSave && (
            <div className="card-surface flex items-center gap-2 rounded-xl p-3">
              <input
                autoFocus
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && saveName.trim()) {
                    saveQuery(saveName.trim(), sql);
                    setSaveName("");
                    setShowSave(false);
                    setPanel("saved");
                  }
                  if (e.key === "Escape") setShowSave(false);
                }}
                placeholder="Query name… (Enter to save)"
                className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm outline-none focus:border-brand-500/60"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (saveName.trim()) {
                    saveQuery(saveName.trim(), sql);
                    setSaveName("");
                    setShowSave(false);
                    setPanel("saved");
                  }
                }}
              >
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSave(false)}>
                <X size={13} />
              </Button>
            </div>
          )}

          {/* Results */}
          <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-zinc-500/5 px-3 py-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                Results
              </span>
              {result && !result.error && (
                <div className="flex items-center gap-2">
                  <Badge tone="green"><Rows3 size={11} /> {result.rowCount} rows</Badge>
                  <Badge tone="cyan"><Clock size={11} /> {result.ms.toFixed(1)} ms</Badge>
                  <Button size="sm" variant="ghost" onClick={exportCsv}>
                    <Download size={13} /> CSV
                  </Button>
                </div>
              )}
            </div>

            {running && (
              <div className="space-y-2 p-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
                <Skeleton className="h-6 w-4/6" />
              </div>
            )}

            {!running && !result && (
              <div className="p-8 text-center text-sm text-[var(--muted)]">
                Run a query to see results. Try the starter query — or ask the AI Assistant to write one.
              </div>
            )}

            {!running && result?.error && (
              <div className="flex items-start gap-3 p-4 text-sm">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
                <div>
                  <div className="font-semibold text-red-500">SQL Error</div>
                  <div className="mt-1 font-mono text-xs">{result.error}</div>
                  <div className="mt-2 text-xs text-[var(--muted)]">
                    Stuck? Paste this query into the AI Assistant with the word &ldquo;debug&rdquo;.
                  </div>
                </div>
              </div>
            )}

            {!running && result && !result.error && (
              <div className="max-h-[420px] overflow-auto">
                <table className="result-table">
                  <thead>
                    <tr>{result.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {result.rows.slice(0, 500).map((r, i) => (
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
                {result.rows.length > 500 && (
                  <div className="border-t border-[var(--border)] p-2 text-center text-xs text-[var(--muted)]">
                    Showing first 500 of {result.rows.length} rows — export CSV for all.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-3">
          <div className="flex gap-1 rounded-xl border border-[var(--border)] p-1">
            {([
              ["schema", Table2, "Schema"],
              ["history", History, "History"],
              ["saved", Save, "Saved"],
            ] as const).map(([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => setPanel(key)}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                  panel === key ? "bg-brand-500/12 text-brand-500" : "text-[var(--muted)] hover:text-[var(--fg)]"
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {panel === "schema" && (
            <div className="space-y-2">
              {SAMPLE_TABLES.map((t) => (
                <details key={t.name} className="card-surface group rounded-xl px-3.5 py-2.5" open={t.name === "customers"}>
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-2">
                      <Table2 size={13} className="text-brand-500" /> {t.name}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">{t.rowCount} rows</span>
                  </summary>
                  <div className="mt-2 space-y-1">
                    {t.columns.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setSql((s) => s + c.name)}
                        title="Click to insert into editor"
                        className="flex w-full cursor-pointer items-center justify-between rounded px-1.5 py-0.5 font-mono text-[11px] hover:bg-brand-500/8"
                      >
                        <span>
                          {c.name}
                          {c.key && (
                            <span className={`ml-1.5 rounded px-1 text-[9px] font-bold ${c.key === "PK" ? "bg-amber-500/20 text-amber-600" : "bg-cyan-500/20 text-cyan-600"}`}>
                              {c.key}
                            </span>
                          )}
                        </span>
                        <span className="text-[var(--muted)]">{c.type}</span>
                      </button>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}

          {panel === "history" && (
            <div className="space-y-2">
              {history.length === 0 && <EmptyState emoji="🕐" title="No queries yet" hint="Your last 100 runs appear here." />}
              {history.length > 0 && (
                <button onClick={clearHistory} className="flex cursor-pointer items-center gap-1 text-xs text-[var(--muted)] hover:text-red-500">
                  <Trash2 size={11} /> Clear history
                </button>
              )}
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => setSql(h.sql)}
                  className="card-surface block w-full cursor-pointer rounded-xl p-3 text-left transition-colors hover:border-brand-500/40"
                >
                  <div className="line-clamp-2 font-mono text-[11px]">{h.sql}</div>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[var(--muted)]">
                    <span className={`h-1.5 w-1.5 rounded-full ${h.ok ? "bg-emerald-500" : "bg-red-500"}`} />
                    {new Date(h.at).toLocaleTimeString()}
                  </div>
                </button>
              ))}
            </div>
          )}

          {panel === "saved" && (
            <div className="space-y-2">
              {savedQueries.length === 0 && (
                <EmptyState emoji="💾" title="No saved queries" hint="Hit Save above the editor to keep queries here." />
              )}
              {savedQueries.map((q) => (
                <div key={q.id} className="card-surface rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setSql(q.sql)} className="cursor-pointer text-sm font-semibold hover:text-brand-500">
                      {q.name}
                    </button>
                    <button onClick={() => deleteSavedQuery(q.id)} className="cursor-pointer text-[var(--muted)] hover:text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="mt-1 line-clamp-2 font-mono text-[11px] text-[var(--muted)]">{q.sql}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
