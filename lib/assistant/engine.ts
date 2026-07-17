import { TOPICS, TOPIC_BY_SLUG, type Topic } from "@/lib/data/topics";
import { SQL_FUNCTIONS, type SqlFn } from "@/lib/data/functions";

/**
 * Deterministic AI SQL assistant engine.
 *
 * Design principle: never hallucinate. Every response is assembled from a
 * hand-curated knowledge base (topics, functions, patterns) plus rule-based
 * analysis of the user's SQL. When the engine is uncertain it says so and
 * lists the assumptions it made — it never invents columns or behavior.
 */

export type Intent =
  | "explain-topic"
  | "explain-function"
  | "explain-sql"
  | "generate"
  | "debug"
  | "optimize"
  | "unknown";

export interface Finding {
  kind: "error" | "warning" | "tip";
  title: string;
  detail: string;
}

export interface AssistantResponse {
  intent: Intent;
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estMinutes: number;
  answer: string;
  assumptions?: string[];
  steps: string[];
  sql?: string;
  sqlLabel?: string;
  originalSql?: string;
  breakdown?: { clause: string; explanation: string }[];
  executionOrder?: string[];
  findings?: Finding[];
  whyItWorks?: string;
  mistakes: string[];
  alternative?: { sql: string; note: string };
  performance: string[];
  interviewQs: string[];
  relatedTopics: string[]; // topic slugs
  practiceExercise: string;
  runMainQuery?: boolean; // UI should execute `sql` against the sample DB
  topic?: Topic; // when intent is explain-topic, full topic payload
  fn?: SqlFn;
  // Used by the "Ask about your data" flow for an answer-first, layman UI:
  headline?: string; // one plain-English sentence stating the answer
  matched?: boolean; // did we confidently understand the question?
  suggestions?: string[]; // clickable follow-up questions when unmatched
}

const EXECUTION_ORDER = [
  "1. FROM / JOIN — assemble the source rows",
  "2. WHERE — filter individual rows",
  "3. GROUP BY — collapse rows into groups",
  "4. HAVING — filter the groups",
  "5. SELECT — compute the output columns (aliases born here)",
  "6. DISTINCT — remove duplicate result rows",
  "7. ORDER BY — sort (aliases usable now)",
  "8. LIMIT / OFFSET — trim the final rows",
];

const SCHEMA_COLUMNS: Record<string, string[]> = {
  customers: ["customer_id", "name", "email", "city", "country", "signup_date"],
  products: ["product_id", "product_name", "category", "price", "stock"],
  orders: ["order_id", "customer_id", "order_date", "status", "total_amount"],
  order_items: ["item_id", "order_id", "product_id", "quantity", "unit_price"],
  employees: ["employee_id", "name", "department", "salary", "manager_id", "hire_date"],
};

// ---------------------------------------------------------------- helpers

function containsSql(text: string): boolean {
  return /\b(select|insert|update|delete|create|alter|drop|with)\b[\s\S]*\bfrom\b|\b(select)\b\s+[\w*,\s]+/i.test(
    text
  );
}

function extractSql(text: string): string | null {
  const fenced = text.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const m = text.match(/\b(WITH|SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b[\s\S]*/i);
  return m ? m[0].trim() : null;
}

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Keyword → topic slug routing for conceptual questions. */
const TOPIC_KEYWORDS: [RegExp, string][] = [
  [/union all|union\b/, "union"],
  [/window function|over\s*\(|partition by|row_number|dense_rank|\brank\b|lag\b|lead\b|running total|cumulative/, "window-functions"],
  [/recursive/, "recursive-cte"],
  [/\bcte\b|common table|with clause/, "ctes"],
  [/materialized/, "materialized-views"],
  [/\bview\b/, "views"],
  [/\bindex(es)?\b|b-?tree/, "indexes"],
  [/execution plan|explain\b|query plan/, "execution-plans"],
  [/optimi[sz]|slow quer|performance tun/, "optimization"],
  [/isolation|deadlock|lock/, "isolation-levels"],
  [/transaction|acid|commit|rollback/, "transactions"],
  [/normali[sz]ation|1nf|2nf|3nf|normal form/, "normalization"],
  [/star schema|snowflake|fact table|dimension/, "star-snowflake"],
  [/oltp|olap|warehouse|columnar/, "oltp-olap"],
  [/er diagram|entity relationship|database design|data model/, "er-design"],
  [/stored procedure|trigger|function.*database/, "stored-procedures"],
  [/\bjson\b/, "json"],
  [/constraint|primary key|foreign key|unique key|check constraint/, "constraints"],
  [/\bjoins?\b|inner join|left join|right join|outer join|cross join|self join/, "joins"],
  [/subquer|nested quer|correlated/, "subqueries"],
  [/exists\b|not exists/, "exists"],
  [/group by|grouping/, "group-by"],
  [/having/, "having"],
  [/aggregate|count\b|sum\b|avg\b/, "aggregate-functions"],
  [/\bcase\b|conditional/, "case"],
  [/distinct|duplicate/, "distinct"],
  [/order by|sort/, "order-by"],
  [/limit|offset|pagination|paging/, "limit-offset"],
  [/\blike\b|pattern|wildcard/, "like"],
  [/between|in list|\bin\b clause/, "between-in"],
  [/alias/, "aliases"],
  [/\bwhere\b|filter/, "where"],
  [/select|projection/, "select"],
];

function findTopic(text: string): Topic | null {
  const n = norm(text);
  for (const [re, slug] of TOPIC_KEYWORDS) {
    if (re.test(n)) return TOPIC_BY_SLUG.get(slug) ?? null;
  }
  return null;
}

function findFunction(text: string): SqlFn | null {
  const n = norm(text);
  for (const fn of SQL_FUNCTIONS) {
    const names = fn.name.toLowerCase().split(/\s*\/\s*/);
    if (names.some((name) => n.includes(name.trim().toLowerCase()))) return fn;
  }
  return null;
}

// ---------------------------------------------------------------- generation

interface GenPattern {
  match: RegExp;
  build: (m: RegExpMatchArray, text: string) => {
    title: string;
    sql: string;
    steps: string[];
    breakdown: { clause: string; explanation: string }[];
    alternative?: { sql: string; note: string };
    assumptions?: string[];
  };
}

const GEN_PATTERNS: GenPattern[] = [
  {
    match: /top\s+(\d+)?\s*customers?\s+(?:by|with)\s+(?:revenue|spend|sales|amount|value)/i,
    build: (m) => {
      const n = m[1] ?? "5";
      return {
        title: `Top ${n} customers by revenue`,
        sql: `SELECT c.name,\n       ROUND(SUM(o.total_amount), 2) AS revenue\nFROM customers c\nJOIN orders o ON o.customer_id = c.customer_id\nWHERE o.status != 'cancelled'\nGROUP BY c.customer_id\nORDER BY revenue DESC\nLIMIT ${n};`,
        assumptions: ["'Revenue' = sum of non-cancelled order totals. Remove the WHERE clause to include cancelled orders."],
        steps: [
          "Join orders to customers so each order row carries the customer's name.",
          "Exclude cancelled orders — they aren't revenue.",
          "GROUP BY customer so SUM adds up each customer's orders.",
          `Sort by the summed revenue descending and keep the top ${n}.`,
        ],
        breakdown: [
          { clause: "JOIN ... ON o.customer_id = c.customer_id", explanation: "Matches each order to its customer via the foreign key." },
          { clause: "WHERE o.status != 'cancelled'", explanation: "Row filter applied before grouping — cheaper and correct." },
          { clause: "GROUP BY c.customer_id", explanation: "One output row per customer; grouping by the key (not name) is safe against duplicate names." },
          { clause: "ORDER BY revenue DESC LIMIT " + (m[1] ?? "5"), explanation: "Top-N: sort on the aggregate alias, then cut." },
        ],
        alternative: {
          sql: `-- Window-function variant (useful if you also want ranks)\nSELECT * FROM (\n  SELECT c.name, SUM(o.total_amount) AS revenue,\n         RANK() OVER (ORDER BY SUM(o.total_amount) DESC) AS rnk\n  FROM customers c JOIN orders o ON o.customer_id = c.customer_id\n  WHERE o.status != 'cancelled'\n  GROUP BY c.customer_id\n) WHERE rnk <= ${n};`,
          note: "RANK keeps ties (two customers with equal revenue both appear); LIMIT arbitrarily drops one.",
        },
      };
    },
  },
  {
    match: /revenue|sales.*(?:by|per)\s+(country|month|city|category|status)|(?:by|per)\s+(country|month|city|category|status).*(?:revenue|sales)/i,
    build: (m, text) => {
      const dim = (m[1] || m[2] || "country").toLowerCase();
      const dims: Record<string, { sql: string; steps: string[] }> = {
        country: {
          sql: `SELECT c.country,\n       ROUND(SUM(o.total_amount), 2) AS revenue\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id\nWHERE o.status != 'cancelled'\nGROUP BY c.country\nORDER BY revenue DESC;`,
          steps: ["Join orders to customers to reach the country column.", "Filter out cancelled orders.", "Group by country and sum order totals.", "Sort largest market first."],
        },
        city: {
          sql: `SELECT c.city,\n       ROUND(SUM(o.total_amount), 2) AS revenue\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id\nWHERE o.status != 'cancelled'\nGROUP BY c.city\nORDER BY revenue DESC;`,
          steps: ["Join to customers for the city.", "Exclude cancellations.", "Group and sum per city."],
        },
        month: {
          sql: `SELECT strftime('%Y-%m', o.order_date) AS month,\n       ROUND(SUM(o.total_amount), 2) AS revenue\nFROM orders o\nWHERE o.status != 'cancelled'\nGROUP BY month\nORDER BY month;`,
          steps: ["Truncate each order date to its month (strftime here; DATE_TRUNC in Postgres).", "Filter cancellations.", "Group by the month bucket, sum, and sort chronologically."],
        },
        category: {
          sql: `SELECT p.category,\n       ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue\nFROM order_items oi\nJOIN products p ON p.product_id = oi.product_id\nGROUP BY p.category\nORDER BY revenue DESC;`,
          steps: ["Category lives on products, money lives on order_items — join them.", "Revenue per line = quantity × unit_price.", "Group by category and sum."],
        },
        status: {
          sql: `SELECT status,\n       COUNT(*) AS orders,\n       ROUND(SUM(total_amount), 2) AS revenue\nFROM orders\nGROUP BY status\nORDER BY revenue DESC;`,
          steps: ["No join needed — status is on orders.", "Group by status; count and sum together."],
        },
      };
      const d = dims[dim];
      return {
        title: `Revenue by ${dim}`,
        sql: d.sql,
        steps: d.steps,
        assumptions: dim === "category" ? ["Line-item revenue (qty × unit price) is used since category is per product; order-level totals can't be split by category."] : ["Cancelled orders excluded from revenue."],
        breakdown: [
          { clause: "GROUP BY " + dim, explanation: `One row per ${dim}; every other SELECT column is aggregated.` },
          { clause: "SUM(...)", explanation: "Adds the money column within each group. SUM ignores NULLs." },
        ],
      };
    },
  },
  {
    match: /customers?\s+(?:who|that|with)?\s*(?:have\s+)?never\s+(?:placed|made|ordered|purchased|bought)|customers? without orders?/i,
    build: () => ({
      title: "Customers who never ordered",
      sql: `SELECT c.name, c.email, c.signup_date\nFROM customers c\nWHERE NOT EXISTS (\n  SELECT 1 FROM orders o\n  WHERE o.customer_id = c.customer_id\n);`,
      steps: [
        "For each customer, peek into orders for any row with their id.",
        "NOT EXISTS keeps customers where that peek finds nothing.",
        "This is an anti-join — the standard 'absence' pattern.",
      ],
      breakdown: [
        { clause: "NOT EXISTS (SELECT 1 ...)", explanation: "Boolean check; SELECT 1 is convention — the columns don't matter, only row existence." },
        { clause: "WHERE o.customer_id = c.customer_id", explanation: "The correlation tying the inner lookup to the outer customer." },
      ],
      alternative: {
        sql: `SELECT c.name, c.email\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id\nWHERE o.order_id IS NULL;`,
        note: "LEFT JOIN + IS NULL is equivalent. Avoid NOT IN here — it returns zero rows if any customer_id in orders is NULL.",
      },
    }),
  },
  {
    match: /top\s+(\d+)?\s*(?:best[- ]?selling|selling|sold)?\s*products?|best[- ]?sell/i,
    build: (m) => {
      const n = m[1] ?? "5";
      return {
        title: `Top ${n} best-selling products`,
        sql: `SELECT p.product_name,\n       SUM(oi.quantity) AS units_sold,\n       ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue\nFROM order_items oi\nJOIN products p ON p.product_id = oi.product_id\nGROUP BY oi.product_id\nORDER BY units_sold DESC\nLIMIT ${n};`,
        assumptions: ["'Best-selling' = most units. Change ORDER BY to revenue DESC to rank by money instead."],
        steps: [
          "Sales quantities live in order_items; names live in products — join them.",
          "Group per product and sum both units and line revenue.",
          `Sort by units and keep the top ${n}.`,
        ],
        breakdown: [
          { clause: "SUM(oi.quantity * oi.unit_price)", explanation: "Line-level revenue: multiply before summing." },
          { clause: "GROUP BY oi.product_id", explanation: "Group by the key; product_name comes along since it's functionally dependent." },
        ],
      };
    },
  },
  {
    match: /average order value|aov\b/i,
    build: () => ({
      title: "Average order value (AOV)",
      sql: `SELECT ROUND(AVG(total_amount), 2) AS aov,\n       COUNT(*) AS orders\nFROM orders\nWHERE status != 'cancelled';`,
      steps: ["Filter to real (non-cancelled) orders.", "AVG over the order totals — one row out."],
      assumptions: ["AOV computed per order, not per item. Cancelled orders excluded."],
      breakdown: [
        { clause: "AVG(total_amount)", explanation: "Sum ÷ count of non-NULL totals. If totals could be NULL, decide whether that should count as 0 (then use AVG(COALESCE(total_amount,0)))." },
      ],
      alternative: {
        sql: `-- AOV per month (trend version)\nSELECT strftime('%Y-%m', order_date) AS month,\n       ROUND(AVG(total_amount), 2) AS aov\nFROM orders\nWHERE status != 'cancelled'\nGROUP BY month ORDER BY month;`,
        note: "The trend version is usually what stakeholders actually want next.",
      },
    }),
  },
  {
    match: /highest|top|max(?:imum)?\s*(?:paid|salary|earner)|salar/i,
    build: () => ({
      title: "Top earner per department",
      sql: `WITH ranked AS (\n  SELECT name, department, salary,\n    ROW_NUMBER() OVER (\n      PARTITION BY department ORDER BY salary DESC\n    ) AS rn\n  FROM employees\n)\nSELECT name, department, salary\nFROM ranked WHERE rn = 1;`,
      steps: [
        "Rank employees inside each department by salary (window function).",
        "PARTITION BY restarts the numbering per department.",
        "Keep rank 1 — the top earner of each department.",
      ],
      breakdown: [
        { clause: "ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)", explanation: "Numbers rows within each department, highest salary first." },
        { clause: "outer WHERE rn = 1", explanation: "Window results can't be filtered in the same query level — the CTE makes them filterable." },
      ],
      alternative: {
        sql: `SELECT e.* FROM employees e\nJOIN (SELECT department, MAX(salary) AS mx\n      FROM employees GROUP BY department) m\n  ON m.department = e.department AND m.mx = e.salary;`,
        note: "The join form returns ALL tied top earners; ROW_NUMBER picks exactly one. Choose based on the business question.",
      },
    }),
  },
  {
    match: /running total|cumulative/i,
    build: () => ({
      title: "Running revenue total",
      sql: `SELECT order_date, total_amount,\n  ROUND(SUM(total_amount) OVER (\n    ORDER BY order_date, order_id\n  ), 2) AS running_total\nFROM orders\nORDER BY order_date, order_id;`,
      steps: [
        "SUM as a window function — no GROUP BY, every row survives.",
        "ORDER BY inside OVER makes the sum cumulative: everything up to the current row.",
        "order_id added as a tiebreaker so same-day orders accumulate deterministically.",
      ],
      breakdown: [
        { clause: "SUM(...) OVER (ORDER BY ...)", explanation: "Default frame with ORDER BY = UNBOUNDED PRECEDING → CURRENT ROW, i.e. a running total." },
      ],
    }),
  },
  {
    match: /month[- ]over[- ]month|mom\b|growth/i,
    build: () => ({
      title: "Month-over-month revenue growth",
      sql: `WITH monthly AS (\n  SELECT strftime('%Y-%m', order_date) AS month,\n         SUM(total_amount) AS revenue\n  FROM orders\n  WHERE status != 'cancelled'\n  GROUP BY month\n)\nSELECT month, ROUND(revenue, 2) AS revenue,\n  ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))\n        / LAG(revenue) OVER (ORDER BY month), 1) AS mom_pct\nFROM monthly;`,
      steps: [
        "First collapse to one row per month (CTE).",
        "LAG(revenue) reaches back one row — the previous month.",
        "Growth % = (this − prev) / prev × 100; 100.0 forces decimal math.",
      ],
      breakdown: [
        { clause: "LAG(revenue) OVER (ORDER BY month)", explanation: "Previous row's value in month order; NULL for the first month." },
      ],
      alternative: {
        sql: `-- Gap-safe: join a generated month series first if months can be missing\nWITH RECURSIVE months(m) AS (\n  SELECT '2026-05' UNION ALL\n  SELECT strftime('%Y-%m', date(m || '-01', '+1 month'))\n  FROM months WHERE m < '2026-07'\n)\nSELECT m FROM months;`,
        note: "If a month has zero orders, LAG silently compares non-adjacent months. A calendar spine fixes that.",
      },
    }),
  },
];

// ---------------------------------------------------------------- debug

function debugSql(sql: string): { findings: Finding[]; fixed: string } {
  const findings: Finding[] = [];
  let fixed = sql;

  // = NULL
  if (/(!=|=)\s*NULL\b/i.test(fixed)) {
    findings.push({
      kind: "error",
      title: "Comparison with NULL using = or !=",
      detail: "NULL is 'unknown', so `col = NULL` is never TRUE — it silently returns no rows. Use IS NULL / IS NOT NULL.",
    });
    fixed = fixed.replace(/!=\s*NULL\b/gi, "IS NOT NULL").replace(/=\s*NULL\b/gi, "IS NULL");
  }

  // aggregate in WHERE
  const whereAgg = fixed.match(/WHERE[\s\S]*?\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i);
  const hasHaving = /\bHAVING\b/i.test(fixed);
  if (whereAgg && !hasHaving && /GROUP BY/i.test(fixed)) {
    findings.push({
      kind: "error",
      title: `Aggregate ${whereAgg[1].toUpperCase()}() inside WHERE`,
      detail: "WHERE runs before aggregation, so aggregates don't exist yet there. Move the condition to HAVING (after GROUP BY).",
    });
  }

  // double quotes as string literals
  if (/=\s*"[^"]*"/.test(fixed)) {
    findings.push({
      kind: "warning",
      title: "Double quotes used for a string literal",
      detail: "Standard SQL uses single quotes for strings ('India'); double quotes mean identifiers (column names). Some engines tolerate it, many don't.",
    });
    fixed = fixed.replace(/=\s*"([^"]*)"/g, "= '$1'");
  }

  // trailing comma before FROM
  if (/,\s*FROM\b/i.test(fixed)) {
    findings.push({
      kind: "error",
      title: "Trailing comma before FROM",
      detail: "The last column in the SELECT list must not be followed by a comma.",
    });
    fixed = fixed.replace(/,(\s*FROM\b)/gi, "$1");
  }

  // common keyword typos
  const typos: [RegExp, string][] = [
    [/\bSELCT\b/gi, "SELECT"], [/\bSLECT\b/gi, "SELECT"], [/\bFORM\b(?=\s+\w+\s*(;|$|\n|WHERE|JOIN|GROUP|ORDER))/gi, "FROM"],
    [/\bWHRE\b/gi, "WHERE"], [/\bGROUPBY\b/gi, "GROUP BY"], [/\bORDERBY\b/gi, "ORDER BY"],
    [/\bJION\b/gi, "JOIN"], [/\bUPADTE\b/gi, "UPDATE"], [/\bDELTE\b/gi, "DELETE"],
  ];
  for (const [re, correct] of typos) {
    if (re.test(fixed)) {
      findings.push({ kind: "error", title: `Misspelled keyword → ${correct}`, detail: `Found a typo of ${correct}; corrected it.` });
      fixed = fixed.replace(re, correct);
    }
  }

  // unknown table names vs sample schema (only flag if it's close to a known one)
  const tables = [...fixed.matchAll(/\b(?:FROM|JOIN)\s+([a-zA-Z_][\w]*)/gi)].map((m) => m[1].toLowerCase());
  for (const t of tables) {
    if (!SCHEMA_COLUMNS[t]) {
      const close = Object.keys(SCHEMA_COLUMNS).find(
        (k) => k.startsWith(t.slice(0, 4)) || t.startsWith(k.slice(0, 4))
      );
      if (close) {
        findings.push({
          kind: "warning",
          title: `Table '${t}' not in the sample schema`,
          detail: `Did you mean '${close}'? (Sample tables: ${Object.keys(SCHEMA_COLUMNS).join(", ")}.) If you're querying your own schema, ignore this.`,
        });
      }
    }
  }

  // GROUP BY missing selected column
  const gb = fixed.match(/GROUP BY\s+([\w.,\s]+?)(?:HAVING|ORDER|LIMIT|;|$)/i);
  const sel = fixed.match(/SELECT\s+([\s\S]*?)\s+FROM/i);
  if (gb && sel) {
    const grouped = gb[1].split(",").map((s) => s.trim().split(".").pop()!.toLowerCase());
    const selected = sel[1]
      .split(",")
      .map((s) => s.trim())
      .filter((s) => !/\(|\*/.test(s))
      .map((s) => s.split(/\s+AS\s+/i)[0].trim().split(".").pop()!.toLowerCase());
    const missing = selected.filter((c) => c && !grouped.includes(c));
    if (missing.length > 0) {
      findings.push({
        kind: "warning",
        title: `Non-aggregated column(s) not in GROUP BY: ${missing.join(", ")}`,
        detail: "Standard SQL requires every non-aggregated SELECT column to appear in GROUP BY. SQLite/MySQL may tolerate it but the value returned is arbitrary.",
      });
    }
  }

  // LIKE with = wildcards
  if (/=\s*'%[^']*'|=\s*'[^']*%'/.test(fixed)) {
    findings.push({
      kind: "error",
      title: "Wildcard pattern used with =",
      detail: "= compares literally — '%' is just a percent sign. Use LIKE for pattern matching.",
    });
    fixed = fixed.replace(/=(\s*'%?[^']*%'?)/g, " LIKE$1");
  }

  return { findings, fixed };
}

// ---------------------------------------------------------------- optimize

function optimizeSql(sql: string): { findings: Finding[]; rewritten?: string } {
  const findings: Finding[] = [];
  let rewritten: string | undefined;

  if (/SELECT\s+\*/i.test(sql)) {
    findings.push({
      kind: "warning",
      title: "SELECT * reads every column",
      detail: "Name only the columns you need: less I/O, network transfer, and it enables covering-index plans where the index alone answers the query.",
    });
  }
  if (/LIKE\s+'%[^']/i.test(sql)) {
    findings.push({
      kind: "warning",
      title: "Leading-wildcard LIKE ('%…')",
      detail: "A pattern starting with % can't use a B-tree index — the engine must scan. Prefix patterns ('abc%') can. For real 'contains' search use full-text or trigram indexes.",
    });
  }
  const fnOnCol = sql.match(/WHERE[\s\S]*?\b(YEAR|MONTH|DATE|UPPER|LOWER|CAST|STRFTIME|SUBSTR|TRIM|COALESCE)\s*\(\s*\w+[\w.]*/i);
  if (fnOnCol) {
    findings.push({
      kind: "warning",
      title: `Function ${fnOnCol[1].toUpperCase()}() wrapped around a column in WHERE`,
      detail: "Non-sargable: the index on that column becomes unusable. Rewrite as a range/bare comparison (e.g. YEAR(d)=2026 → d >= '2026-01-01' AND d < '2027-01-01'), or create an expression index.",
    });
  }
  if (/\bNOT\s+IN\s*\(\s*SELECT/i.test(sql)) {
    findings.push({
      kind: "warning",
      title: "NOT IN with a subquery",
      detail: "Correctness AND performance issue: any NULL in the subquery makes NOT IN return zero rows, and engines often plan it poorly. Use NOT EXISTS.",
    });
  }
  if (/\bUNION\b(?!\s+ALL)/i.test(sql)) {
    findings.push({
      kind: "tip",
      title: "UNION performs an implicit DISTINCT",
      detail: "If duplicates are impossible (or acceptable), UNION ALL skips an expensive sort/hash dedup of the whole result.",
    });
    rewritten = sql.replace(/\bUNION\b(?!\s+ALL)/gi, "UNION ALL");
  }
  if (/OFFSET\s+(\d{4,})/i.test(sql)) {
    findings.push({
      kind: "warning",
      title: "Deep OFFSET pagination",
      detail: "OFFSET n reads and discards n rows every request. Switch to keyset pagination: WHERE id > :last_seen ORDER BY id LIMIT k.",
    });
  }
  if (/SELECT\s+DISTINCT/i.test(sql) && /\bJOIN\b/i.test(sql)) {
    findings.push({
      kind: "tip",
      title: "DISTINCT + JOIN — possible fan-out band-aid",
      detail: "If DISTINCT exists to undo duplicates created by a one-to-many join, fix the join instead (pre-aggregate the many side in a CTE, or use EXISTS for existence checks).",
    });
  }
  if (/ORDER BY/i.test(sql) && !/LIMIT/i.test(sql)) {
    findings.push({
      kind: "tip",
      title: "ORDER BY without LIMIT",
      detail: "Sorting the full result costs memory/CPU (may spill to disk). If the consumer only shows a page, add LIMIT; the engine can then use a cheap top-N sort.",
    });
  }
  // correlated subquery in SELECT
  if (/SELECT[\s\S]*?\(\s*SELECT[\s\S]*?WHERE[\s\S]*?\.\w+\s*=\s*\w+\.[\s\S]*?\)[\s\S]*?FROM/i.test(sql)) {
    findings.push({
      kind: "warning",
      title: "Correlated subquery in SELECT list",
      detail: "Conceptually re-executes per row. A JOIN (for lookups) or a window function (for per-group stats) computes the same in one pass.",
    });
  }
  const joinCols = [...sql.matchAll(/ON\s+\w+\.(\w+)\s*=\s*\w+\.(\w+)/gi)];
  if (joinCols.length > 0) {
    const cols = [...new Set(joinCols.flatMap((m) => [m[1], m[2]]))].filter((c) => c.endsWith("_id"));
    if (cols.length > 0) {
      findings.push({
        kind: "tip",
        title: "Index the join keys",
        detail: `Ensure indexes exist on: ${cols.join(", ")}. Foreign-key columns are not auto-indexed in most engines (MySQL/InnoDB excepted).`,
      });
    }
  }
  if (findings.length === 0) {
    findings.push({
      kind: "tip",
      title: "No obvious anti-patterns detected",
      detail: "Next step is evidence: run EXPLAIN (ANALYZE) and compare estimated vs actual rows. Slowness without anti-patterns usually means missing indexes, stale statistics, or sheer data volume — consider a materialized view for repeated heavy aggregation.",
    });
  }
  return { findings, rewritten };
}

// ---------------------------------------------------------------- explain sql

function explainSql(sql: string): { steps: string[]; breakdown: { clause: string; explanation: string }[] } {
  const breakdown: { clause: string; explanation: string }[] = [];
  const steps: string[] = [];
  const has = (re: RegExp) => re.test(sql);

  if (has(/\bWITH\b/i)) {
    breakdown.push({ clause: "WITH (CTE)", explanation: "Names intermediate result sets so the query reads as a top-to-bottom pipeline." });
    steps.push("Evaluate each CTE — think of them as named temporary results feeding the final SELECT.");
  }
  const from = sql.match(/FROM\s+([\w]+)/i);
  if (from) {
    breakdown.push({ clause: `FROM ${from[1]}`, explanation: `Start with the ${from[1]} table as the row source.` });
    steps.push(`Start from the ${from[1]} table.`);
  }
  for (const j of sql.matchAll(/(LEFT|RIGHT|FULL|INNER|CROSS)?\s*JOIN\s+(\w+)[\s\S]*?ON\s+([^\n]+)/gi)) {
    const type = (j[1] ?? "INNER").toUpperCase();
    breakdown.push({
      clause: `${type} JOIN ${j[2]} ON ${j[3].trim()}`,
      explanation:
        type === "LEFT"
          ? `Attach matching ${j[2]} rows; keep left rows without a match (their ${j[2]} columns become NULL).`
          : `Keep only row pairs where the ON condition matches.`,
    });
    steps.push(`${type} join ${j[2]} — combine rows where ${j[3].trim()}.`);
  }
  const where = sql.match(/WHERE\s+([\s\S]*?)(GROUP BY|ORDER BY|HAVING|LIMIT|;|$)/i);
  if (where) {
    breakdown.push({ clause: `WHERE ${where[1].trim().slice(0, 90)}`, explanation: "Row-level filter, applied before any grouping." });
    steps.push("Filter rows with the WHERE condition (runs before grouping).");
  }
  const gb = sql.match(/GROUP BY\s+([\w.,\s()']+?)(HAVING|ORDER BY|LIMIT|;|$)/i);
  if (gb) {
    breakdown.push({ clause: `GROUP BY ${gb[1].trim()}`, explanation: "Collapse rows sharing these values into one row per group; aggregates compute within each group." });
    steps.push(`Group rows by ${gb[1].trim()} and compute the aggregates per group.`);
  }
  const having = sql.match(/HAVING\s+([\s\S]*?)(ORDER BY|LIMIT|;|$)/i);
  if (having) {
    breakdown.push({ clause: `HAVING ${having[1].trim().slice(0, 90)}`, explanation: "Filter whole groups by aggregate conditions (after GROUP BY)." });
    steps.push("Discard groups failing the HAVING condition.");
  }
  if (has(/OVER\s*\(/i)) {
    breakdown.push({ clause: "window function OVER (...)", explanation: "Computes across related rows WITHOUT collapsing them — every input row survives with an extra computed column." });
    steps.push("Compute window function values across each partition (rows are kept, not collapsed).");
  }
  const ob = sql.match(/ORDER BY\s+([\w.,\s()']+?)(LIMIT|;|$)/i);
  if (ob) {
    breakdown.push({ clause: `ORDER BY ${ob[1].trim()}`, explanation: "Sort the final result. Runs after SELECT, so aliases are usable here." });
    steps.push(`Sort the result by ${ob[1].trim()}.`);
  }
  const lim = sql.match(/LIMIT\s+(\d+)/i);
  if (lim) {
    breakdown.push({ clause: `LIMIT ${lim[1]}`, explanation: "Keep only the first N rows of the sorted result." });
    steps.push(`Return only the first ${lim[1]} row(s).`);
  }
  if (steps.length === 0) steps.push("Parse the statement and execute it against the current database state.");
  return { steps, breakdown };
}

// ---------------------------------------------------------------- topic → response

function topicResponse(topic: Topic): AssistantResponse {
  return {
    intent: "explain-topic",
    title: topic.title,
    difficulty: topic.level === "Beginner" ? "Beginner" : topic.level === "Intermediate" ? "Intermediate" : "Advanced",
    estMinutes: topic.estMinutes,
    answer: `${topic.definition}\n\n${topic.simple}\n\n${topic.technical}`,
    steps: topic.examples[0]
      ? ["Read the syntax pattern below.", "Walk through the worked example against the sample data.", "Run it in the playground and modify one thing at a time."]
      : [],
    sql: topic.examples[0]?.sql,
    sqlLabel: "Worked example",
    executionOrder: EXECUTION_ORDER,
    whyItWorks: topic.businessUseCase,
    mistakes: topic.commonMistakes,
    alternative: topic.examples[1] ? { sql: topic.examples[1].sql, note: topic.examples[1].note ?? "A second worked example." } : undefined,
    performance: topic.performanceTips,
    interviewQs: [topic.interviewAngle, ...topic.quiz.map((q) => q.q)],
    relatedTopics: topic.related,
    practiceExercise: topic.practice[0] ?? "Open the playground and write one query using this concept.",
    runMainQuery: true,
    topic,
  };
}

function functionResponse(fn: SqlFn): AssistantResponse {
  return {
    intent: "explain-function",
    title: `${fn.name} — ${fn.category} function`,
    difficulty: "Intermediate",
    estMinutes: 5,
    answer: `**Syntax:** \`${fn.syntax}\`\n\n**Arguments:** ${fn.args}\n**Returns:** ${fn.returns}\n\n**Edge cases:** ${fn.edgeCases}`,
    steps: ["Check the syntax and argument types.", "Run the example below in the playground.", "Test the edge case listed — that's where bugs hide."],
    sql: fn.example,
    sqlLabel: "Example",
    mistakes: [fn.edgeCases],
    performance: fn.performance ? [fn.performance] : ["No notable performance concerns — the surrounding scan dominates."],
    interviewQs: fn.interviewNote ? [fn.interviewNote] : [],
    relatedTopics: fn.category === "Window" ? ["window-functions"] : fn.category === "Aggregate" ? ["aggregate-functions", "group-by"] : ["select"],
    practiceExercise: `Use ${fn.name.split("/")[0].trim()} in a query against the sample schema.`,
    runMainQuery: true,
    fn,
  };
}

// ---------------------------------------------------------------- main entry

export function askAssistant(input: string): AssistantResponse {
  const text = input.trim();
  const sqlInText = containsSql(text) ? extractSql(text) : null;
  const n = norm(text);

  // ---- DEBUG intent
  if (sqlInText && /(debug|fix|broken|error|wrong|not working|doesn'?t work|why.*fail)/i.test(text)) {
    const { findings, fixed } = debugSql(sqlInText);
    const changed = fixed.trim() !== sqlInText.trim();
    return {
      intent: "debug",
      title: "SQL Debugging Report",
      difficulty: "Intermediate",
      estMinutes: 5,
      answer:
        findings.length > 0
          ? `Found ${findings.length} issue(s). Each one is explained below, with a corrected query${changed ? " you can run" : ""}. The most important habit: read errors top-down — the first problem often causes the rest.`
          : "No classic mistake patterns matched. The corrected-query panel runs your SQL against the sample database — the engine's own error message (if any) is shown there, which is the ground truth.",
      steps: [
        "Pattern-check the SQL against the most common failure modes (NULL comparisons, WHERE vs HAVING, quoting, typos, GROUP BY rules).",
        "Apply mechanical fixes where they're unambiguous.",
        "Execute the result against the sample database to verify it actually runs.",
      ],
      originalSql: sqlInText,
      sql: fixed,
      sqlLabel: changed ? "Corrected query" : "Your query (no auto-fix applied)",
      findings,
      executionOrder: EXECUTION_ORDER,
      mistakes: findings.map((f) => f.title),
      performance: [],
      interviewQs: ["Debugging habit interviewers look for: verify each clause independently — run the FROM/JOIN part alone, then add WHERE, then aggregation."],
      relatedTopics: ["where", "group-by", "joins"],
      practiceExercise: "Paste any failing query from your own work — or break a working playground query on purpose and diagnose it.",
      runMainQuery: true,
    };
  }

  // ---- OPTIMIZE intent
  if (sqlInText && /(optimi|slow|faster|performance|speed|tune|expensive)/i.test(text)) {
    const { findings, rewritten } = optimizeSql(sqlInText);
    return {
      intent: "optimize",
      title: "Query Optimization Review",
      difficulty: "Advanced",
      estMinutes: 10,
      answer: `Reviewed against ${findings.length > 1 ? "the standard anti-pattern checklist" : "common anti-patterns"}. Remember the golden rule: measure before and after — run EXPLAIN, apply ONE change, re-measure. The findings below are ordered by typical impact.`,
      steps: [
        "Scan for anti-patterns (non-sargable predicates, SELECT *, NOT IN, deep OFFSET, fan-out joins).",
        "Check join keys for index candidates.",
        "Propose rewrites — apply one at a time and re-measure with EXPLAIN.",
      ],
      originalSql: sqlInText,
      sql: rewritten ?? sqlInText,
      sqlLabel: rewritten ? "Suggested rewrite" : "Your query",
      findings,
      executionOrder: EXECUTION_ORDER,
      whyItWorks:
        "Optimization is subtraction: fewer rows read (indexes, early filters), fewer passes (windows over correlated subqueries), fewer sorts (UNION ALL, LIMIT with ORDER BY).",
      mistakes: [
        "Optimizing without reading the execution plan first.",
        "Applying several changes at once — you won't know which one worked.",
        "Testing on tiny dev data; optimizers choose different plans at scale.",
      ],
      performance: findings.map((f) => f.title),
      interviewQs: [
        "Walk me through diagnosing a suddenly-slow dashboard query.",
        "What makes a predicate sargable?",
        "When would you add a composite index and how do you order its columns?",
      ],
      relatedTopics: ["optimization", "indexes", "execution-plans"],
      practiceExercise: "Run EXPLAIN QUERY PLAN on your query in the playground, add the suggested index, and compare the plan output.",
      runMainQuery: false,
    };
  }

  // ---- EXPLAIN pasted SQL
  if (sqlInText && /(explain|what does|understand|walk|break ?down|describe)/i.test(text)) {
    const { steps, breakdown } = explainSql(sqlInText);
    return {
      intent: "explain-sql",
      title: "Query Explanation",
      difficulty: "Intermediate",
      estMinutes: 5,
      answer:
        "Here's your query decomposed clause by clause, in LOGICAL execution order (which differs from the written order — SQL is written SELECT-first but executed FROM-first). The output below is the live result against the sample database.",
      steps,
      sql: sqlInText,
      sqlLabel: "Your query",
      breakdown,
      executionOrder: EXECUTION_ORDER,
      whyItWorks: "Reading queries in execution order (FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT) is the single skill that makes complex SQL legible.",
      mistakes: [
        "Reading top-to-bottom as written and getting confused about what an alias can see.",
        "Assuming the engine executes clauses in written order.",
      ],
      performance: ["To see how the engine ACTUALLY runs it, prefix with EXPLAIN QUERY PLAN in the playground."],
      interviewQs: ["Recite the logical execution order of a SELECT statement.", "Why can ORDER BY use column aliases but WHERE cannot?"],
      relatedTopics: ["select", "group-by", "joins"],
      practiceExercise: "Delete one clause at a time from this query in the playground and predict the result before running.",
      runMainQuery: true,
    };
  }

  // ---- GENERATE from natural language
  for (const pattern of GEN_PATTERNS) {
    const m = text.match(pattern.match);
    if (m && !sqlInText) {
      const g = pattern.build(m, text);
      return {
        intent: "generate",
        title: g.title,
        difficulty: "Intermediate",
        estMinutes: 8,
        answer:
          "Here's the query, generated against the built-in sample schema (customers, orders, order_items, products, employees) and executed live below — the output table is real, not mocked.",
        assumptions: g.assumptions,
        steps: g.steps,
        sql: g.sql,
        sqlLabel: "Generated query",
        breakdown: g.breakdown,
        executionOrder: EXECUTION_ORDER,
        whyItWorks:
          "Each clause maps to one part of the English request — the steps above trace that mapping so you can adapt the query to your own schema.",
        mistakes: [
          "Forgetting to exclude cancelled/test data from business metrics.",
          "Grouping by a display column (name) instead of the key (id) — duplicates merge silently.",
        ],
        alternative: g.alternative,
        performance: [
          "Index the join/filter columns used here before running on large data.",
          "For dashboards refreshing often, consider materializing this as a summary table.",
        ],
        interviewQs: ["How would you modify this query if the data volume were 100× larger?"],
        relatedTopics: ["group-by", "joins", "window-functions"],
        practiceExercise: "Change one requirement (different metric, different dimension) and adapt the query yourself in the playground.",
        runMainQuery: true,
      };
    }
  }

  // ---- SQL present but no explicit verb → explain it
  if (sqlInText) {
    const { steps, breakdown } = explainSql(sqlInText);
    return {
      intent: "explain-sql",
      title: "Query Explanation",
      difficulty: "Intermediate",
      estMinutes: 5,
      answer: "You pasted SQL without saying what you want, so here's a full explanation (say 'optimize' or 'debug' for those modes). Output below is the live result on the sample database.",
      steps,
      sql: sqlInText,
      sqlLabel: "Your query",
      breakdown,
      executionOrder: EXECUTION_ORDER,
      mistakes: ["Assuming clauses run in written order."],
      performance: ["Prefix with EXPLAIN QUERY PLAN in the playground to see the actual plan."],
      interviewQs: ["Recite the logical execution order of a SELECT."],
      relatedTopics: ["select", "joins", "group-by"],
      practiceExercise: "Modify one clause and predict the output before running.",
      runMainQuery: true,
    };
  }

  // ---- FUNCTION lookup (check before topics for specific function names)
  const fnHit = /\b(count|sum|avg|min|max|coalesce|nullif|row_number|rank|dense_rank|ntile|lag|lead|first_value|last_value|concat|upper|lower|trim|substr|substring|length|replace|round|ceil|floor|abs|mod|power|sqrt|random|date_trunc|extract|datediff|date_add|strftime|to_char|cast|group_concat|string_agg|array_agg|unnest|json_extract|greatest|least|ifnull|instr|lpad|rpad|julianday|percent_rank)\b/i.exec(n);
  if (fnHit && /(what|how|explain|use|difference|when|does|work)/i.test(n)) {
    const fn = findFunction(fnHit[1]);
    if (fn) return functionResponse(fn);
  }

  // ---- TOPIC explanation
  const topic = findTopic(text);
  if (topic) return topicResponse(topic);

  // ---- fallback
  return {
    intent: "unknown",
    title: "Let me point you in the right direction",
    difficulty: "Beginner",
    estMinutes: 1,
    answer:
      "I couldn't map that to a SQL concept, function, or query task with confidence — and I'd rather say so than guess. I can reliably help with the request types below. If your question fits one, try rephrasing it that way.",
    assumptions: ["This assistant is a curated knowledge engine — it only answers from verified content, never by guessing."],
    steps: [
      "Explain a concept: “Explain window functions”, “Difference between UNION and UNION ALL”",
      "Generate SQL: “Top 5 customers by revenue”, “Revenue by month”, “Customers who never ordered”",
      "Debug: paste broken SQL with the word “debug” or “fix”",
      "Optimize: paste SQL with the word “optimize” or “slow”",
      "Function reference: “How does COALESCE work?”",
    ],
    mistakes: [],
    performance: [],
    interviewQs: [],
    relatedTopics: ["select", "joins", "window-functions"],
    practiceExercise: "Try: “Explain JOINs” — then run its example in the playground.",
  };
}

export const SUGGESTED_PROMPTS = [
  "Top 5 customers by revenue",
  "Explain the difference between UNION and UNION ALL",
  "Explain window functions",
  "Revenue by month",
  "Customers who never ordered",
  "How does COALESCE work?",
  "Debug: SELECT name, FROM customers WHERE country = NULL",
  "Optimize: SELECT * FROM orders WHERE strftime('%Y', order_date) = '2026'",
  "Explain: SELECT c.country, SUM(o.total_amount) FROM orders o JOIN customers c ON c.customer_id = o.customer_id GROUP BY c.country",
  "Month over month growth",
  "What is a recursive CTE?",
  "Explain ACID transactions",
];
