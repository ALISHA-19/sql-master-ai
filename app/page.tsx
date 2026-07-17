"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight, Bot, BookOpen, Braces, Bug, Database, Gauge, GitBranch,
  Layers, Map, Play, Sparkles, Table2, Terminal, Trophy, Zap,
} from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/theme";
import { highlightSql } from "@/lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

const FEATURES = [
  { icon: Bot, title: "AI SQL Assistant", desc: "Ask anything — explanations, generation, debugging, optimization. Every answer teaches: steps, breakdowns, mistakes, alternatives.", href: "/assistant" },
  { icon: Terminal, title: "SQL Playground", desc: "A real SQLite database running in your browser (WASM). Monaco editor, sample data, CSV export, history — zero setup.", href: "/playground" },
  { icon: Map, title: "Interactive Roadmap", desc: "Beginner → Expert path with prerequisites, time estimates, and completion tracking that persists.", href: "/roadmap" },
  { icon: BookOpen, title: "Learn Everything", desc: "30 deep topic guides: definition, syntax, worked examples, business use cases, interview angles, quizzes.", href: "/learn" },
  { icon: Braces, title: "Function Explorer", desc: "50+ functions across aggregate, window, text, date, JSON — with edge cases and interview notes.", href: "/functions" },
  { icon: Bug, title: "Debugger & Optimizer", desc: "Paste broken or slow SQL. Get named findings, corrected queries, and before/after comparisons.", href: "/assistant" },
  { icon: Layers, title: "Visualizer", desc: "Animated JOIN diagrams, GROUP BY flows, window frames, and the logical execution order.", href: "/visualizer" },
  { icon: Trophy, title: "Interview Prep", desc: "Curated questions by difficulty and track — FAANG, analytics, PM — with hints, solutions, and the traps.", href: "/interview" },
  { icon: GitBranch, title: "ER Diagram Builder", desc: "Drag tables, see relationships, export PNG. Learn design by doing.", href: "/er-diagram" },
];

const STATS = [
  { n: "30", label: "Deep topic guides" },
  { n: "50+", label: "Functions documented" },
  { n: "24", label: "Practice problems" },
  { n: "100%", label: "Runs in your browser" },
];

const TESTIMONIALS = [
  { quote: "I stopped Googling SQL entirely. The assistant explains the why behind every query — that's what actually made it stick.", name: "Ananya R.", role: "Product Manager, fintech" },
  { quote: "The playground running real SQLite in the browser is genius. I practiced the top-N-per-group pattern until it was muscle memory and cleared my analytics screen.", name: "Dev M.", role: "Data Analyst" },
  { quote: "The LEFT JOIN trap explanation alone was worth it. Our whole team's dashboards had that bug.", name: "Sarah K.", role: "BI Engineer" },
];

const FAQS = [
  { q: "Do I need to install a database?", a: "No. The playground runs SQLite compiled to WebAssembly, entirely in your browser. Five sample tables load automatically — your queries never leave your machine." },
  { q: "Is the AI assistant a real language model?", a: "It's a deterministic knowledge engine built on a hand-curated SQL knowledge base plus rule-based query analysis. That's a deliberate product decision: it never hallucinates, it states its assumptions, and generated queries execute live against the sample database so you see real output — not plausible-looking fiction." },
  { q: "Which SQL dialect is taught?", a: "Concepts are standard SQL. The playground is SQLite; wherever dialects differ (dates, LIMIT, upserts), the content shows PostgreSQL, MySQL, SQL Server, and Oracle equivalents — plus a full syntax comparison page." },
  { q: "Is my progress saved?", a: "Yes — XP, streaks, badges, completed topics, solved problems, bookmarks, and query history persist in your browser's local storage." },
  { q: "Who is this for?", a: "PMs, analysts, founders, marketers, and engineers-in-training: anyone who needs to read or write SQL and wants to understand it rather than copy-paste it." },
];

const HERO_SQL = `SELECT c.name, SUM(o.total_amount) AS revenue
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id
ORDER BY revenue DESC
LIMIT 5;`;

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="glass sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-white">
              <Database size={16} />
            </span>
            SQL Master <span className="gradient-text">AI</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[var(--muted)] md:flex">
            <a href="#features" className="transition-colors hover:text-[var(--fg)]">Features</a>
            <a href="#how" className="transition-colors hover:text-[var(--fg)]">How it works</a>
            <a href="#faq" className="transition-colors hover:text-[var(--fg)]">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/home">
              <Button variant="gradient" size="sm">
                Open App <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="grid-bg relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[140px]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 lg:grid-cols-2">
          <div>
            <motion.div {...fadeUp}>
              <Badge tone="violet" className="mb-5">
                <Sparkles size={11} /> Learn · Practice · Generate · Optimize · Debug
              </Badge>
            </motion.div>
            <motion.h1
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.05 }}
              className="text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl"
            >
              Learn SQL
              <br />
              <span className="gradient-text">Faster Than Ever</span>
            </motion.h1>
            <motion.p
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.1 }}
              className="mt-5 max-w-lg text-lg text-[var(--muted)]"
            >
              The last SQL resource you&apos;ll ever need: an AI assistant that teaches instead of
              just answering, a real database in your browser, and a complete path from
              first SELECT to execution plans.
            </motion.p>
            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.15 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link href="/roadmap">
                <Button variant="gradient" size="lg">
                  Start Learning <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/assistant">
                <Button variant="outline" size="lg">
                  <Bot size={16} /> Try AI SQL Assistant
                </Button>
              </Link>
            </motion.div>
            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.2 }}
              className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4"
            >
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="gradient-text text-2xl font-extrabold">{s.n}</div>
                  <div className="text-xs text-[var(--muted)]">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Animated code illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="animate-float">
              <div className="gradient-border card-surface rounded-2xl p-1 shadow-2xl shadow-brand-500/10">
                <div className="flex items-center gap-1.5 px-4 py-3">
                  <span className="h-3 w-3 rounded-full bg-red-400/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                  <span className="ml-3 font-mono text-xs text-[var(--muted)]">playground.sql</span>
                </div>
                <pre className="overflow-x-auto px-5 pb-4 font-mono text-[13px] leading-relaxed">
                  <code dangerouslySetInnerHTML={{ __html: highlightSql(HERO_SQL) }} />
                </pre>
                <div className="mx-4 mb-4 overflow-hidden rounded-lg border border-[var(--border)]">
                  <table className="result-table w-full">
                    <thead><tr><th>name</th><th>revenue</th></tr></thead>
                    <tbody>
                      <tr><td>Diya Patel</td><td>1137.00</td></tr>
                      <tr><td>Aarav Shah</td><td>895.98</td></tr>
                      <tr><td>Bella Chen</td><td>837.00</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 5, delay: 1 }}
              className="glass absolute -right-3 -top-6 hidden rounded-xl px-4 py-3 text-sm shadow-lg md:block"
            >
              <span className="flex items-center gap-2"><Zap size={14} className="text-amber-500" /> 0.4 ms · 3 rows</span>
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 6, delay: 0.5 }}
              className="glass absolute -bottom-6 -left-3 hidden rounded-xl px-4 py-3 text-sm shadow-lg md:block"
            >
              <span className="flex items-center gap-2"><Bot size={14} className="text-brand-500" /> &ldquo;Why GROUP BY customer_id, not name?&rdquo;</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-24">
        <motion.div {...fadeUp} className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Everything SQL, <span className="gradient-text">one product</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--muted)]">
            Reference, tutor, editor, and coach — designed so you never open another tab to Google SQL again.
          </p>
        </motion.div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: (i % 3) * 0.07 }}>
              <Link href={f.href}>
                <Card className="group h-full p-6 hover:border-brand-500/40">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/15 to-violet-500/15 text-brand-500 transition-transform group-hover:scale-110">
                    <f.icon size={20} />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{f.desc}</p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-[var(--border)] bg-zinc-500/[0.03] py-24">
        <div className="mx-auto max-w-6xl px-5">
          <motion.h2 {...fadeUp} className="mb-12 text-center text-3xl font-bold tracking-tight">
            Never just an answer — <span className="gradient-text">always a lesson</span>
          </motion.h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: Play, step: "Ask anything", desc: "“Top 5 customers by revenue”, “Why is this slow?”, “Explain window functions” — English or SQL, the assistant routes it." },
              { icon: Table2, step: "See it run — for real", desc: "Generated queries execute live against the in-browser database. Real output tables, execution times, no mocked screenshots." },
              { icon: Gauge, step: "Understand the why", desc: "Every response includes step-by-step reasoning, clause breakdowns, execution order, common mistakes, alternatives, and a practice exercise." },
            ].map((s, i) => (
              <motion.div key={s.step} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-lg shadow-brand-500/25">
                  <s.icon size={22} />
                </div>
                <div className="mb-1 text-xs font-bold uppercase tracking-widest text-brand-500">Step {i + 1}</div>
                <h3 className="font-semibold">{s.step}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-[var(--muted)]">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <motion.h2 {...fadeUp} className="mb-12 text-center text-3xl font-bold tracking-tight">
          Loved by people who <span className="gradient-text">used to fear SQL</span>
        </motion.h2>
        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={t.name} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }}>
              <Card className="h-full p-6">
                <div className="mb-3 text-brand-500">★★★★★</div>
                <p className="text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-4 text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-[var(--muted)]">{t.role}</div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 pb-24">
        <motion.h2 {...fadeUp} className="mb-10 text-center text-3xl font-bold tracking-tight">
          Frequently asked
        </motion.h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <motion.details
              key={f.q}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.04 }}
              className="group card-surface rounded-xl px-5 py-4"
            >
              <summary className="cursor-pointer list-none font-medium marker:hidden">
                <span className="flex items-center justify-between">
                  {f.q}
                  <ArrowRight size={14} className="text-[var(--muted)] transition-transform group-open:rotate-90" />
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{f.a}</p>
            </motion.details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <motion.div {...fadeUp} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 p-12 text-center text-white">
          <h2 className="text-3xl font-bold md:text-4xl">Stop Googling SQL. Start understanding it.</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/85">
            Free, private, runs entirely in your browser. Your first query is 10 seconds away.
          </p>
          <Link href="/home">
            <Button size="lg" className="mt-7 bg-white text-brand-700 hover:bg-white/90">
              Open SQL Master AI <ArrowRight size={16} />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-[var(--muted)] md:flex-row">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-brand-500" />
            SQL Master AI — a portfolio project demonstrating AI-assisted learning UX.
          </div>
          <div className="flex gap-5">
            <Link href="/learn" className="hover:text-[var(--fg)]">Learn</Link>
            <Link href="/playground" className="hover:text-[var(--fg)]">Playground</Link>
            <Link href="/cheatsheets" className="hover:text-[var(--fg)]">Cheat Sheets</Link>
            <Link href="/interview" className="hover:text-[var(--fg)]">Interview Prep</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
