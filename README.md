# SQL Master AI — Ultimate SQL Learning & Query Assistant

> The complete SQL reference, learning platform, and AI SQL assistant — so a PM, analyst, founder, marketer, or beginner never needs to Google SQL again.

**Learn · Practice · Generate · Optimize · Debug** — all in one polished, private, browser-native product.

<p align="center">
  <em>ChatGPT + LeetCode + SQLBolt + Mode Analytics + PostgreSQL Docs — reimagined as a single teaching-first product.</em>
</p>

---

## ✨ Why this exists

Most SQL tools give you an answer. This one gives you **understanding**. Every response — whether generated, explained, debugged, or optimized — ships with step-by-step reasoning, a clause-by-clause breakdown, the logical execution order, common mistakes, a better alternative, performance notes, interview questions, and a practice exercise. **Nothing is ever skipped.**

The AI assistant is a **deterministic knowledge engine**, not a black-box LLM — a deliberate product decision. It never hallucinates, it states its assumptions, and every generated query **executes live against a real database running in your browser**, so the output tables are real, not plausible fiction.

---

## 🚀 Features

| Area | What it does |
|------|--------------|
| **AI SQL Assistant** | Explain, generate, debug, optimize — intent-routed. Every answer teaches the *why*, with live query execution. |
| **SQL Playground** | Real SQLite (WASM) in the browser. Monaco editor, autocomplete, syntax highlighting, error detection, execution time, rows returned, CSV export, history & saved queries. |
| **SQL Roadmap** | Interactive Beginner → Expert path with prerequisites, time estimates, difficulty, and persistent completion tracking. |
| **Learn SQL** | 30 deep topic guides: definition, plain + technical explanation, syntax, worked examples with output, business use case, interview angle, performance tips, mistakes, quiz, and practice. |
| **Cheat Sheets** | 27 copy-ready, color-coded patterns — each with the trap it avoids and where you'd use it. |
| **Functions Explorer** | 50+ functions across Aggregate, Window, Text, Math, Date/Time, Conditional, Conversion, JSON, Array — with syntax, args, returns, examples, edge cases, performance & interview notes. |
| **Visualizer** | Animated, interactive JOIN Venn diagrams, GROUP BY collapse, logical execution order, and window frames. |
| **Practice** | 24 runnable problems with difficulty, tags, companies, hints, solutions & expected output. |
| **Interview Prep** | 20 curated questions by difficulty and track (FAANG, Startup, Product Analytics, Data Analyst, BA, PM) with hints, solutions, alternatives & grading criteria. |
| **Database Explorer** | Profiles of PostgreSQL, MySQL, SQL Server, Oracle, SQLite + a 12-row cross-dialect syntax comparison. |
| **ER Diagram Builder** | Drag-and-drop tables, PK/FK relationship lines, PNG export. |
| **Downloads** | Cheat sheet, interview notes, roadmap, flashcards (CSV), mind map — all generated live from the knowledge base. |
| **Gamification** | XP, levels, badges, daily streaks, achievements & completion %. |
| **Global Search** | `Ctrl/⌘ + K` instant search across every topic, function, problem & question. |

---

## 🛠 Tech Stack

- **Next.js 16** (App Router, async params) · **React 19** · **TypeScript**
- **Tailwind CSS v4** — glassmorphism, gradients, dark/light theming
- **Framer Motion** — micro-interactions & animated diagrams
- **Monaco Editor** — the VS Code editor, in the playground
- **sql.js** — SQLite compiled to WebAssembly (the in-browser database)
- **Zustand** (with `persist`) — client state & progress in localStorage
- **Lucide Icons** · **next-themes**

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App Router                     │
│                                                               │
│  app/                                                         │
│   ├─ page.tsx                 Landing (hero, features, FAQ)   │
│   └─ (dashboard)/             Shared sidebar + Ctrl-K search  │
│        ├─ home  assistant  playground  roadmap  learn/[slug]  │
│        ├─ cheatsheets  functions  visualizer  databases       │
│        └─ practice  interview  er-diagram  downloads  …        │
│                                                               │
│  lib/                                                         │
│   ├─ assistant/engine.ts   <- deterministic AI (intent router,│
│   │                          NL->SQL, debug & optimize rules) │
│   ├─ db/  engine.ts        <- sql.js singleton (WASM SQLite)  │
│   │      sample-data.ts    <- 5-table e-commerce dataset      │
│   ├─ data/  topics · functions · cheatsheets · interview ·    │
│   │         practice · roadmap · databases  (knowledge base)  │
│   └─ store.ts              <- Zustand: XP, badges, progress   │
│                                                               │
│  components/  ui primitives · sql-block · global-search · …   │
└─────────────────────────────────────────────────────────────┘
         The knowledge base is the single source of truth —
      the assistant, downloads, and search all read from it.
```

**Design principle — the assistant never hallucinates:** it assembles responses from a hand-curated knowledge base plus rule-based SQL analysis. When uncertain, it surfaces assumptions and alternatives rather than guessing.

---

## 🧮 Sample Database

A 3NF e-commerce schema loads automatically — rich enough for joins, aggregates, windows, CTEs, and recursion:

- `customers` · `products` · `orders` · `order_items` · `employees` (self-referencing for org-chart / recursive-CTE demos)

Everything runs **locally in your browser** — queries never touch a server.

---

## 🏁 Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build      # production build
npm run start      # serve the production build
```

```bash
npm test           # run the unit test suite (Vitest)
npm run test:watch # watch mode
```

> Requires Node 18+. The SQLite WASM binary ships in `public/sql-wasm.wasm`.

### Tests

32 unit tests (Vitest) cover the two pieces of pure logic most worth guarding:

- **`lib/db/import.test.ts`** — messy-data handling: currency/percent/accounting-number cleaning, flexible date parsing (ISO, US `MM/DD`, `DD/MM`, month names), delimiter detection, header-less files, and column-type inference (incl. leading-zero codes and stray-cell tolerance).
- **`lib/assistant/data-engine.test.ts`** — the natural-language → SQL engine: counts, `COUNT(DISTINCT)`, grouped sums/averages, top-N and top-N-per-group (window functions), value/numeric/`BETWEEN`/negation/date filters, multi-filter `AND` composition, and the never-hallucinate fallback.

---

## ☁️ Deploy (Vercel — ~2 minutes)

This is a fully client-side app (no server, no env vars), so it deploys as-is:

1. Push this folder to a GitHub repo.
2. Go to **vercel.com → New Project → Import** your repo.
3. Framework preset **Next.js** is auto-detected — click **Deploy**. Done.

Or from the CLI:

```bash
npm i -g vercel
vercel        # follow the prompts, accept defaults
```

Everything (including the SQLite database) runs in the visitor's browser, so there is nothing to provision.

---

## 📁 Project Structure

```
sql-master-ai/
├─ app/
│  ├─ (dashboard)/       # authenticated-style shell: sidebar, topbar, Ctrl-K
│  ├─ layout.tsx         # theme provider + fonts
│  ├─ page.tsx           # landing page
│  └─ globals.css        # design tokens, glass, gradients, result tables
├─ components/           # Button/Card/Badge primitives, SqlBlock, search, theme
├─ lib/
│  ├─ assistant/engine.ts
│  ├─ db/                # WASM SQLite engine + sample data
│  ├─ data/              # the entire knowledge base (typed)
│  ├─ store.ts           # Zustand persisted store
│  └─ utils.ts           # SQL highlighter, CSV, download helpers
└─ public/sql-wasm.wasm
```

---

## 🎯 Built for

Product Managers, Analysts, Founders, Marketers, and beginners who want to **understand** SQL, not copy-paste it — and as a **flagship portfolio project** demonstrating product thinking, UX craft, and AI-assisted learning design.

---

## 📝 Notes

- **Privacy-first:** no backend, no tracking. All progress lives in `localStorage`.
- **Accessibility:** keyboard shortcuts, focus states, semantic markup, reduced-motion-friendly.
- **Dialects:** concepts are standard SQL; the playground is SQLite, and content flags PostgreSQL / MySQL / SQL Server / Oracle differences where they matter.

---

<p align="center"><em>Stop Googling SQL. Start understanding it.</em></p>
