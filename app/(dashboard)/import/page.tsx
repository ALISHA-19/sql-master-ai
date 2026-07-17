"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowUp, Bot, CheckCircle2, Clock, Database, Download, FileUp,
  GitMerge, Play, Rows3, Sparkles, Table2, Trash2, Upload,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, SectionTitle, Skeleton } from "@/components/ui/primitives";
import {
  columnKinds, dropTable, fileToSheets, getTableSchema, importTable, joinTables,
  listAllTables, parseDelimited, SAMPLE_CSV, sanitizeIdentifier, sharedColumns,
  type ColumnPlan, type ParsedTable, type TableSummary,
} from "@/lib/db/import";
import { runQuery, type QueryResult } from "@/lib/db/engine";
import { askAboutData, suggestDataQuestions, type DataTable } from "@/lib/assistant/data-engine";
import { type Turn } from "@/components/assistant-response";
import { DataAnswerCard } from "@/components/data-answer-card";
import { useAppStore } from "@/lib/store";
import { downloadText, toCsv } from "@/lib/utils";

export default function ImportPage() {
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState("");
  const [tableName, setTableName] = useState("my_table");
  const [parsed, setParsed] = useState<ParsedTable | null>(null);
  const [kinds, setKinds] = useState<ColumnPlan["kind"][]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [warnMsg, setWarnMsg] = useState<string | null>(null);
  const [hasHeader, setHasHeader] = useState(true);
  const [dragging, setDragging] = useState(false);

  const [tables, setTables] = useState<TableSummary[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);

  const [querySql, setQuerySql] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);

  // Ask-AI-about-your-data state
  const [activeTable, setActiveTable] = useState<DataTable | null>(null);
  const [nlInput, setNlInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);

  // Join-builder state
  const [joinA, setJoinA] = useState("");
  const [joinB, setJoinB] = useState("");
  const [joinKeys, setJoinKeys] = useState<string[]>([]);
  const [joinKey, setJoinKey] = useState("");
  const [joinName, setJoinName] = useState("joined");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryRef = useRef<HTMLTextAreaElement>(null);
  const recordQueryRun = useAppStore((s) => s.recordQueryRun);
  const recordAiQuestion = useAppStore((s) => s.recordAiQuestion);

  const refreshTables = useCallback(async () => {
    setLoadingTables(true);
    setTables(await listAllTables());
    setLoadingTables(false);
  }, []);

  useEffect(() => {
    refreshTables();
  }, [refreshTables]);

  const doParse = useCallback((text: string, header: boolean) => {
    setParseError(null);
    setImportMsg(null);
    setWarnMsg(null);
    if (!text.trim()) {
      setParsed(null);
      return;
    }
    try {
      const p = parseDelimited(text, undefined, header);
      if (p.columns.length === 0 || p.rows.length === 0) {
        setParseError("Couldn't find any rows. Check your file/paste, or toggle 'first row is data'.");
        setParsed(null);
        return;
      }
      setParsed(p);
      setKinds(columnKinds(p));
      if (p.rows.length > 50000) {
        setWarnMsg(`That's ${p.rows.length.toLocaleString()} rows — everything runs in your browser's memory, so very large files may be slow. It'll still work; just give it a moment.`);
      }
    } catch (e) {
      setParseError(e instanceof Error ? e.message : String(e));
      setParsed(null);
    }
  }, []);

  const handleText = (text: string, name?: string) => {
    setRawText(text);
    if (name) {
      setFileName(name);
      const base = name.replace(/\.[^.]+$/, "");
      setTableName(sanitizeIdentifier(base, "my_table"));
    }
    doParse(text, hasHeader);
  };

  const handleFile = async (file: File) => {
    setParseError(null);
    try {
      const sheets = await fileToSheets(file);
      if (sheets.length <= 1) {
        // Single sheet / CSV → normal preview-then-import flow.
        handleText(sheets[0]?.csv ?? "", file.name);
        return;
      }
      // Multi-sheet workbook → import every sheet as its own table.
      const created: string[] = [];
      for (const sh of sheets) {
        const parsedSheet = parseDelimited(sh.csv, undefined, true);
        if (parsedSheet.columns.length === 0 || parsedSheet.rows.length === 0) continue;
        const res = await importTable(sh.name, parsedSheet);
        created.push(res.tableName);
      }
      await refreshTables();
      if (created.length) {
        setParsed(null);
        setActiveTable(await getTableSchema(created[0]));
        setTurns([]);
        setImportMsg(`Imported ${created.length} sheets as tables: ${created.join(", ")}. Pick one under "Your imports" to ask about it, or combine them below.`);
      } else {
        setParseError("None of the sheets had usable rows.");
      }
    } catch (e) {
      setParsed(null);
      setParseError(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const doImport = async () => {
    if (!parsed) return;
    try {
      const result = await importTable(tableName, parsed);
      setImportMsg(
        `Imported ${result.rowsInserted} rows into "${result.tableName}". Ask about it in plain English below, or write SQL.`
      );
      setWarnMsg(
        result.persisted
          ? null
          : "Heads up: this table is too large to save in your browser's storage, so it will disappear on refresh (it works fine for now). Export results you need to keep."
      );
      const q = `SELECT * FROM "${result.tableName}" LIMIT 100;`;
      setQuerySql(q);
      setActiveTable(await getTableSchema(result.tableName)); // includes distinct values for filters
      setTurns([]);
      await refreshTables();
      const res = await runQuery(q);
      setQueryResult(res);
      recordQueryRun(q, !res.error);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : String(e));
    }
  };

  const selectTableForAsking = async (name: string) => {
    setQuerySql(`SELECT * FROM "${name}" LIMIT 100;`);
    setTurns([]);
    setActiveTable(await getTableSchema(name));
  };

  // Recompute candidate join keys whenever the two chosen tables change.
  useEffect(() => {
    if (joinA && joinB && joinA !== joinB) {
      sharedColumns(joinA, joinB).then((keys) => {
        setJoinKeys(keys);
        setJoinKey((k) => (keys.includes(k) ? k : keys[0] ?? ""));
        setJoinName(`${joinA}_${joinB}`.slice(0, 40));
      });
    } else {
      setJoinKeys([]);
    }
  }, [joinA, joinB]);

  const doJoin = async () => {
    if (!joinA || !joinB || !joinKey) return;
    try {
      const res = await joinTables(joinA, joinB, joinKey, joinName);
      await refreshTables();
      setActiveTable(await getTableSchema(res.tableName));
      setTurns([]);
      setQuerySql(`SELECT * FROM "${res.tableName}" LIMIT 100;`);
      setImportMsg(`Joined "${joinA}" + "${joinB}" on ${joinKey} → "${res.tableName}" (${res.rowsInserted} rows). Ask about it below.`);
      setWarnMsg(res.persisted ? null : "The joined table is too large to save — it will clear on refresh.");
    } catch (e) {
      setParseError(e instanceof Error ? e.message : String(e));
    }
  };

  const askData = async (question: string) => {
    if (!question.trim() || !activeTable) return;
    setThinking(true);
    setNlInput("");
    recordAiQuestion();
    await new Promise((r) => setTimeout(r, 400));
    const response = askAboutData(question, activeTable);
    let output: QueryResult | undefined;
    if (response.sql) {
      output = await runQuery(response.sql);
      recordQueryRun(response.sql, !output.error);
    }
    setTurns((t) => [
      ...t,
      { question, response, output, outputLabel: "Live output — executed on YOUR uploaded data" },
    ]);
    setThinking(false);
  };

  const runUserQuery = async () => {
    // Read the live editor value so we always run exactly what's on screen.
    const sql = (queryRef.current?.value ?? querySql).trim();
    if (!sql) return;
    // Guard: people often type an English question here by mistake.
    if (!/^\s*(SELECT|WITH|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|PRAGMA|EXPLAIN|BEGIN|COMMIT|ROLLBACK|VALUES)\b/i.test(sql)) {
      setQueryResult({
        columns: [],
        rows: [],
        rowCount: 0,
        ms: 0,
        error:
          'This box runs SQL, not plain English. To ask in words (e.g. "list all completed orders"), use the "Ask AI about your data" box above ↑ — it writes the SQL for you. Or start this query with SELECT.',
      });
      return;
    }
    setRunning(true);
    const res = await runQuery(sql);
    setQueryResult(res);
    setRunning(false);
    recordQueryRun(sql, !res.error);
  };

  const removeTable = async (name: string) => {
    await dropTable(name);
    await refreshTables();
  };

  const exportCsv = () => {
    if (!queryResult || queryResult.error) return;
    downloadText("query-results.csv", toCsv(queryResult.columns, queryResult.rows), "text/csv");
  };

  const userTables = tables.filter((t) => t.isUserTable);

  return (
    <div>
      <SectionTitle
        icon={<Upload size={22} className="text-brand-500" />}
        title="Import Data & Test"
        subtitle="Upload a CSV, TSV, or Excel (.xlsx) file (or paste data) to create your own table, then ask questions about it in plain English or SQL — 100% in your browser, nothing is uploaded anywhere."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              dragging ? "border-brand-500 bg-brand-500/8" : "border-[var(--border)]"
            }`}
          >
            <FileUp size={30} className="mx-auto mb-3 text-brand-500" />
            <p className="font-semibold">Drag &amp; drop a CSV, TSV, or Excel (.xlsx) file here</p>
            <p className="mt-1 text-sm text-[var(--muted)]">or</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Button variant="gradient" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload size={13} /> Choose file
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleText(SAMPLE_CSV, "demo_employees.csv")}
              >
                Try a demo CSV
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {fileName && <p className="mt-3 text-xs text-[var(--muted)]">Loaded: {fileName}</p>}
          </div>

          {/* Paste area + no-header toggle */}
          <details className="card-surface rounded-2xl p-4">
            <summary className="cursor-pointer text-sm font-semibold">…or paste CSV/TSV text</summary>
            <textarea
              value={rawText}
              onChange={(e) => handleText(e.target.value)}
              rows={6}
              placeholder={"name,age,city\nAsha,29,Pune\nRavi,34,Delhi"}
              className="mt-3 w-full resize-y rounded-lg border border-[var(--border)] bg-transparent p-3 font-mono text-xs outline-none focus:border-brand-500/60"
            />
          </details>

          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[var(--muted)]">
            <input
              type="checkbox"
              checked={!hasHeader}
              onChange={(e) => {
                const noHeader = e.target.checked;
                setHasHeader(!noHeader);
                if (rawText.trim()) doParse(rawText, !noHeader);
              }}
              className="h-3.5 w-3.5 accent-brand-500"
            />
            My file has no header row (use generic column names)
          </label>

          {parseError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/8 p-3 text-sm">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-500" />
              <span>{parseError}</span>
            </div>
          )}

          {warnMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 text-sm">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
              <span>{warnMsg}</span>
            </div>
          )}

          {/* Preview */}
          {parsed && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)]">Table name</label>
                  <input
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    className="mt-1 block h-9 rounded-lg border border-[var(--border)] bg-transparent px-3 font-mono text-sm outline-none focus:border-brand-500/60"
                  />
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {parsed.columns.length} columns · {parsed.rows.length} rows detected
                  {parsed.delimiter === "\t" ? " (tab-separated)" : parsed.delimiter === ";" ? " (semicolon)" : ""}
                </div>
                <Button variant="gradient" size="sm" onClick={doImport}>
                  <CheckCircle2 size={13} /> Create table &amp; import
                </Button>
              </div>

              <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                <div className="border-b border-[var(--border)] bg-zinc-500/5 px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                  Preview — first 8 rows (types auto-detected)
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className="result-table">
                    <thead>
                      <tr>
                        {parsed.columns.map((c, i) => (
                          <th key={c}>
                            {c}
                            <span className="ml-1.5 rounded bg-brand-500/15 px-1 text-[9px] font-bold uppercase text-brand-500">
                              {kinds[i] === "integer" ? "number" : kinds[i] === "decimal" ? "decimal" : kinds[i] === "date" ? "date" : "text"}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 8).map((r, i) => (
                        <tr key={i}>
                          {r.map((v, j) => (
                            <td key={j} className={v.trim() === "" ? "italic text-[var(--muted)]" : ""}>
                              {v.trim() === "" ? "NULL" : v}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {importMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-3 text-sm">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
              <span>{importMsg}</span>
            </div>
          )}

          {/* Ask AI about your data */}
          {activeTable && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-white">
                  <Bot size={14} />
                </span>
                <h2 className="text-lg font-bold">Ask AI about your data</h2>
                <Badge tone="violet">{activeTable.name}</Badge>
              </div>
              <p className="text-[13px] text-[var(--muted)]">
                Type a question in plain English about <span className="font-mono">{activeTable.name}</span> — the AI writes
                the SQL for <em>your</em> columns, runs it, and explains it. Columns:{" "}
                <span className="font-mono text-[12px]">
                  {activeTable.columns.map((c) => `${c.name} (${c.type})`).join(", ")}
                </span>
              </p>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-2">
                {suggestDataQuestions(activeTable).map((s) => (
                  <button
                    key={s}
                    onClick={() => askData(s)}
                    className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs transition-colors hover:border-brand-500/50 hover:bg-brand-500/8 hover:text-brand-500"
                  >
                    <Sparkles size={11} className="mr-1 inline" />{s}
                  </button>
                ))}
              </div>

              {/* Ask input */}
              <div className="glass flex items-end gap-2 rounded-2xl p-2">
                <textarea
                  value={nlInput}
                  onChange={(e) => setNlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askData(nlInput); }
                  }}
                  rows={1}
                  placeholder={`e.g. "top 5 by ${activeTable.columns.find((c) => c.type !== "TEXT")?.name ?? activeTable.columns[0]?.name}" or "count by ${activeTable.columns.find((c) => c.type === "TEXT")?.name ?? activeTable.columns[0]?.name}"`}
                  className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)]"
                />
                <button
                  onClick={() => askData(nlInput)}
                  disabled={!nlInput.trim() || thinking}
                  aria-label="Ask about your data"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-md transition-all hover:shadow-lg disabled:opacity-40"
                >
                  <ArrowUp size={15} />
                </button>
              </div>

              {/* Answers */}
              <div className="space-y-4">
                {turns.map((t, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2 text-sm text-white shadow-md">
                        {t.question}
                      </div>
                    </div>
                    <DataAnswerCard question={t.question} response={t.response} output={t.output} onSuggestion={askData} />
                  </div>
                ))}
                {thinking && (
                  <Card className="space-y-3 p-6">
                    <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <Bot size={15} className="animate-pulse text-brand-500" /> Reading your columns and writing SQL…
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-20 w-full" />
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Join builder — combine two of your tables */}
          {userTables.length >= 2 && (
            <div className="card-surface rounded-2xl p-4">
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
                  <GitMerge size={15} className="text-brand-500" /> Combine two tables (join)
                </summary>
                <p className="mt-2 text-[13px] text-[var(--muted)]">
                  Merge two of your tables that share a column (like an id) into one you can ask about.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-[var(--muted)]">
                    First table
                    <select value={joinA} onChange={(e) => setJoinA(e.target.value)} className="mt-1 block h-9 w-full rounded-lg border border-[var(--border)] bg-transparent px-2 text-sm outline-none focus:border-brand-500/60">
                      <option value="">Choose…</option>
                      {userTables.map((tb) => <option key={tb.name} value={tb.name}>{tb.name}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-[var(--muted)]">
                    Second table
                    <select value={joinB} onChange={(e) => setJoinB(e.target.value)} className="mt-1 block h-9 w-full rounded-lg border border-[var(--border)] bg-transparent px-2 text-sm outline-none focus:border-brand-500/60">
                      <option value="">Choose…</option>
                      {userTables.map((tb) => <option key={tb.name} value={tb.name}>{tb.name}</option>)}
                    </select>
                  </label>
                </div>
                {joinA && joinB && joinA !== joinB && (
                  joinKeys.length > 0 ? (
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <label className="text-xs font-semibold text-[var(--muted)]">
                        Join on column
                        <select value={joinKey} onChange={(e) => setJoinKey(e.target.value)} className="mt-1 block h-9 rounded-lg border border-[var(--border)] bg-transparent px-2 font-mono text-sm outline-none focus:border-brand-500/60">
                          {joinKeys.map((k) => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-[var(--muted)]">
                        New table name
                        <input value={joinName} onChange={(e) => setJoinName(e.target.value)} className="mt-1 block h-9 rounded-lg border border-[var(--border)] bg-transparent px-2 font-mono text-sm outline-none focus:border-brand-500/60" />
                      </label>
                      <Button variant="gradient" size="sm" onClick={doJoin}><GitMerge size={13} /> Join tables</Button>
                    </div>
                  ) : (
                    <p className="mt-3 text-[13px] text-amber-600 dark:text-amber-400">
                      These two tables don&apos;t share a column name to join on. Rename a column so both match (e.g. both call it <span className="font-mono">customer_id</span>).
                    </p>
                  )
                )}
              </details>
            </div>
          )}

          {/* Query runner */}
          {(querySql || userTables.length > 0) && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold">Query your data</h2>
              <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                <div className="flex items-center justify-between border-b border-[var(--border)] bg-zinc-500/5 px-3 py-2">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                    query.sql
                  </span>
                  <Button size="sm" variant="gradient" onClick={runUserQuery} disabled={running}>
                    <Play size={13} /> {running ? "Running…" : "Run"}
                  </Button>
                </div>
                <textarea
                  ref={queryRef}
                  value={querySql}
                  onChange={(e) => setQuerySql(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); runUserQuery(); }
                  }}
                  rows={4}
                  placeholder={`SELECT * FROM "${sanitizeIdentifier(tableName)}" LIMIT 20;`}
                  className="w-full resize-y bg-[var(--card)] p-4 font-mono text-[13px] outline-none"
                />
              </div>

              {running && <Skeleton className="h-24 w-full" />}

              {!running && queryResult?.error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/8 p-3 text-sm">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-500" />
                  <span className="font-mono text-xs">{queryResult.error}</span>
                </div>
              )}

              {!running && queryResult && !queryResult.error && (
                <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                  <div className="flex items-center justify-between border-b border-[var(--border)] bg-zinc-500/5 px-3.5 py-1.5">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                      Results
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge tone="green"><Rows3 size={11} /> {queryResult.rowCount} rows</Badge>
                      <Badge tone="cyan"><Clock size={11} /> {queryResult.ms.toFixed(1)} ms</Badge>
                      <Button size="sm" variant="ghost" onClick={exportCsv}><Download size={13} /> CSV</Button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-auto">
                    <table className="result-table">
                      <thead><tr>{queryResult.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                      <tbody>
                        {queryResult.rows.slice(0, 500).map((r, i) => (
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
              )}
            </div>
          )}
        </div>

        {/* Right panel: tables in the DB */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold">Tables in your database</h3>
          {loadingTables ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              {userTables.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-500">Your imports</div>
                  {userTables.map((t) => (
                    <div key={t.name} className="card-surface rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => selectTableForAsking(t.name)}
                          title="Ask AI about this table"
                          className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold hover:text-brand-500"
                        >
                          <Table2 size={13} className="text-emerald-500" /> {t.name}
                        </button>
                        <button onClick={() => removeTable(t.name)} className="cursor-pointer text-[var(--muted)] hover:text-red-500" title="Drop table">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--muted)]">{t.rowCount} rows · {t.columns.length} cols</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">Sample tables</div>
                {tables.filter((t) => !t.isUserTable).map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setQuerySql(`SELECT * FROM ${t.name} LIMIT 100;`)}
                    className="card-surface flex w-full cursor-pointer items-center justify-between rounded-xl p-3 text-left hover:border-brand-500/40"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <Table2 size={13} className="text-brand-500" /> {t.name}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">{t.rowCount}</span>
                  </button>
                ))}
              </div>

              {userTables.length === 0 && (
                <EmptyState emoji="📄" title="No imports yet" hint="Upload a CSV above to create your first table." />
              )}
            </>
          )}

          <div className="card-surface rounded-xl p-3 text-[12px] text-[var(--muted)]">
            <Database size={13} className="mb-1 text-brand-500" />
            Imported tables also appear in the{" "}
            <Link href="/playground" className="text-brand-500 hover:underline">Playground</Link>. They live in memory
            for this session — re-import after a refresh.
          </div>
        </div>
      </div>
    </div>
  );
}
