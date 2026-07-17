"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Sparkles } from "lucide-react";
import { askAssistant, SUGGESTED_PROMPTS } from "@/lib/assistant/engine";
import { runQuery, type QueryResult } from "@/lib/db/engine";
import { Card, Skeleton } from "@/components/ui/primitives";
import { ResponseCard, type Turn } from "@/components/assistant-response";
import { useAppStore } from "@/lib/store";
import { useQueryParam } from "@/lib/use-query-param";

export default function AssistantPage() {
  const urlQuery = useQueryParam("q");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recordAiQuestion = useAppStore((s) => s.recordAiQuestion);
  const askedFromUrl = useRef(false);

  const ask = useCallback(
    async (q: string) => {
      const question = q.trim();
      if (!question) return;
      setThinking(true);
      setInput("");
      recordAiQuestion();
      // Small delay so the skeleton reads as "thinking" — the engine itself is instant.
      await new Promise((res) => setTimeout(res, 450));
      const response = askAssistant(question);
      let output: QueryResult | undefined;
      if (response.sql && response.runMainQuery) {
        output = await runQuery(response.sql);
      }
      setTurns((t) => [...t, { question, response, output }]);
      setThinking(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    },
    [recordAiQuestion]
  );

  useEffect(() => {
    if (urlQuery && !askedFromUrl.current) {
      askedFromUrl.current = true;
      ask(urlQuery);
    }
  }, [urlQuery, ask]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-lg shadow-brand-500/25">
          <Bot size={24} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">AI SQL Assistant</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--muted)]">
          Explain · Generate · Debug · Optimize. Never just an answer — every response teaches the
          why, the steps, the mistakes, and the alternatives. Generated queries run live on the sample database.
        </p>
      </div>

      {/* Turns */}
      <div className="space-y-8">
        {turns.map((t, i) => (
          <div key={i} className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2.5 text-sm text-white shadow-md">
                {t.question}
              </div>
            </div>
            <ResponseCard turn={t} />
          </div>
        ))}
        {thinking && (
          <Card className="space-y-3 p-6">
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Bot size={15} className="animate-pulse text-brand-500" /> Analyzing your question…
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-24 w-full" />
          </Card>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (empty state) */}
      {turns.length === 0 && !thinking && (
        <div className="mb-8 grid gap-2 sm:grid-cols-2">
          {SUGGESTED_PROMPTS.slice(0, 10).map((p) => (
            <button
              key={p}
              onClick={() => ask(p)}
              className="card-surface cursor-pointer rounded-xl px-4 py-3 text-left text-[13px] transition-all hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-md"
            >
              <Sparkles size={12} className="mb-1.5 text-brand-500" />
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-4 mt-8">
        <div className="glass gradient-border flex items-end gap-2 rounded-2xl p-2 shadow-xl">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={input.includes("\n") ? 4 : 1}
            placeholder="Ask anything about SQL…"
            className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-[var(--muted)]"
          />
          <button
            onClick={() => ask(input)}
            disabled={!input.trim() || thinking}
            aria-label="Send question"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-md transition-all hover:shadow-lg disabled:opacity-40"
          >
            <ArrowUp size={16} />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-[var(--muted)]">
          Deterministic knowledge engine — answers only from verified content, states assumptions, never hallucinates.
        </p>
      </div>
    </div>
  );
}
