import type { AssistantResponse } from "./engine";
import type { SqlType } from "@/lib/db/import";

/**
 * Data-aware natural-language → SQL engine.
 *
 * Unlike the main assistant (which teaches fixed concepts on the sample
 * schema), this generates SQL for an ARBITRARY uploaded table by mapping the
 * user's words to real column names AND values. It's deterministic and never
 * invents columns — if it's unsure it says so and still runs a safe query so
 * the live output is the ground truth.
 *
 * Supported: counts, sums, averages, min/max, top/bottom-N, distinct,
 * group-by (including by month/year on a date column), and filters —
 * value equality ("completed orders"), numeric ranges ("amount over 50000"),
 * and dates ("in March 2026").
 */

export interface DataColumn {
  name: string;
  type: SqlType;
}
export interface DataTable {
  name: string;
  columns: DataColumn[];
  /** Distinct sample values per TEXT column, for recognising filter phrases. */
  values?: Record<string, string[]>;
}

const STOPWORDS = new Set([
  "the", "a", "an", "of", "in", "on", "for", "to", "and", "or", "me", "my", "our",
  "show", "list", "give", "get", "find", "what", "which", "who", "is", "are", "was",
  "how", "many", "much", "total", "please", "table", "data", "rows", "records", "all",
  "with", "that", "have", "has", "by", "per", "each", "group", "grouped", "across",
  "top", "bottom", "highest", "lowest", "most", "least", "biggest", "smallest",
  "count", "number", "sum", "average", "avg", "mean", "max", "maximum", "min", "minimum",
  "order", "sort", "sorted", "descending", "ascending", "desc", "asc", "then", "value",
  "values", "where", "from", "over", "under", "above", "below", "between", "than",
]);

function words(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9_ ]/g, " ").split(/\s+/).filter(Boolean);
}

function singular(w: string): string {
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("ses")) return w.slice(0, -2);
  if (w.endsWith("s") && w.length > 3) return w.slice(0, -1);
  return w;
}

function isNumeric(c: DataColumn) {
  return c.type === "INTEGER" || c.type === "REAL";
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function sqlStr(s: string) {
  return `'${s.replace(/'/g, "''")}'`;
}
function cap(s: string) {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Score how well a column matches a set of words. */
function scoreColumn(col: DataColumn, qWords: string[]): number {
  const parts = col.name.toLowerCase().split("_").filter(Boolean);
  const full = col.name.toLowerCase();
  let score = 0;
  for (const raw of qWords) {
    const w = singular(raw);
    if (full === raw || full === w) score += 6;
    else if (parts.includes(raw) || parts.includes(w)) score += 4;
    else if (raw.length > 3 && parts.some((p) => p.startsWith(raw) || raw.startsWith(p))) score += 2;
  }
  return score;
}

function resolveColumn(qWords: string[], columns: DataColumn[], numericOnly = false): DataColumn | null {
  let best: DataColumn | null = null;
  let bestScore = 0;
  for (const c of columns) {
    if (numericOnly && !isNumeric(c)) continue;
    const s = scoreColumn(c, qWords);
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return bestScore > 0 ? best : null;
}

function findDateColumn(table: DataTable): DataColumn | null {
  // Numbers are never dates. Prefer a TEXT column whose values actually look
  // like ISO dates (most reliable) …
  for (const c of table.columns) {
    if (c.type !== "TEXT") continue;
    const sample = table.values?.[c.name]?.[0];
    if (sample && /^\d{4}-\d{2}(-\d{2})?/.test(sample)) return c;
  }
  // … otherwise a TEXT column whose name is an explicit date word (token-bounded,
  // so "monthly_sales" does NOT match "month").
  for (const c of table.columns) {
    if (c.type !== "TEXT") continue;
    if (/(^|_)(date|day|month|year|time|dt)($|_)|_at$|_on$/i.test(c.name)) return c;
  }
  return null;
}

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
  jan: "01", feb: "02", mar: "03", apr: "04", jun: "06", jul: "07", aug: "08",
  sep: "09", sept: "09", oct: "10", nov: "11", dec: "12",
};

interface Filters {
  where: string[];
  describe: string[];
  assumptions: string[];
}

/** Detect value / numeric / date filters in the question. */
function parseFilters(question: string, table: DataTable, dateCol: DataColumn | null): Filters {
  const lower = question.toLowerCase();
  const qWords = words(question).filter((w) => !STOPWORDS.has(w));
  const numericCols = table.columns.filter(isNumeric);
  const where: string[] = [];
  const describe: string[] = [];
  const assumptions: string[] = [];

  // --- numeric comparisons ("over 50000", "less than 100", "at least 10")
  // Prefer a "measure" column (amount, revenue…) over an id column, so
  // "orders over 5000" filters on the amount, not order_id.
  const pickNum = () => {
    const measures = numericCols.filter((c) => !/(^|_)id$/i.test(c.name));
    const pool = measures.length ? measures : numericCols;
    return resolveColumn(qWords, pool, true) ?? pool[0] ?? null;
  };
  const numFmt = (s: string) => s.replace(/[,₹$\s]/g, "");
  const between = lower.match(/\bbetween\s*[₹$]?\s*([\d,]+(?:\.\d+)?)\s*(?:and|to|-|–)\s*[₹$]?\s*([\d,]+(?:\.\d+)?)/);
  const over = !between && lower.match(/\b(?:over|above|greater than|more than|at least|>=?)\s*[₹$]?\s*([\d,]+(?:\.\d+)?)/);
  const under = !between && lower.match(/\b(?:under|below|less than|fewer than|at most|<=?)\s*[₹$]?\s*([\d,]+(?:\.\d+)?)/);
  if (between) {
    const c = pickNum();
    if (c) {
      const a = numFmt(between[1]), b = numFmt(between[2]);
      where.push(`"${c.name}" BETWEEN ${a} AND ${b}`);
      describe.push(`${c.name} between ${a} and ${b}`);
    }
  }
  if (over) {
    const c = pickNum();
    if (c) {
      const inc = /at least|>=/.test(lower);
      where.push(`"${c.name}" >${inc ? "=" : ""} ${numFmt(over[1])}`);
      describe.push(`${c.name} ${inc ? "≥" : ">"} ${numFmt(over[1])}`);
    }
  }
  if (under) {
    const c = pickNum();
    if (c) {
      const inc = /at most|<=/.test(lower);
      where.push(`"${c.name}" <${inc ? "=" : ""} ${numFmt(under[1])}`);
      describe.push(`${c.name} ${inc ? "≤" : "<"} ${numFmt(under[1])}`);
    }
  }

  // --- value equality/negation from known distinct values
  //     ("completed orders", "in the north", "exclude cancelled")
  if (table.values) {
    for (const col of table.columns) {
      const vals = table.values[col.name];
      if (!vals) continue;
      for (const v of vals) {
        if (v.length < 2) continue;
        if (new RegExp(`\\b${escapeRegex(v.toLowerCase())}\\b`).test(lower)) {
          const negated = new RegExp(
            `\\b(?:not|except|excluding|other than|without|no)\\b[\\w ]{0,15}\\b${escapeRegex(v.toLowerCase())}\\b`
          ).test(lower);
          where.push(`"${col.name}" ${negated ? "!=" : "="} ${sqlStr(v)}`);
          describe.push(`${col.name} ${negated ? "≠" : "="} ${v}`);
          break; // one value per column
        }
      }
    }
  }

  // --- date filters ("in March", "in 2026", "March 2026")
  if (dateCol) {
    const yearM = lower.match(/\b(20\d{2})\b/);
    let monthNum: string | null = null;
    let monthName = "";
    for (const m in MONTHS) {
      if (new RegExp(`\\b${m}\\b`).test(lower)) { monthNum = MONTHS[m]; monthName = cap(m); break; }
    }
    if (monthNum && yearM) {
      where.push(`"${dateCol.name}" LIKE '${yearM[1]}-${monthNum}%'`);
      describe.push(`${monthName} ${yearM[1]}`);
    } else if (monthNum) {
      where.push(`strftime('%m', "${dateCol.name}") = '${monthNum}'`);
      describe.push(monthName);
    } else if (yearM && /\bin\b|\bduring\b|\byear\b/.test(lower)) {
      where.push(`"${dateCol.name}" LIKE '${yearM[1]}%'`);
      describe.push(yearM[1]);
    }
  }

  return { where, describe, assumptions };
}

interface GroupBy {
  expr: string; // SQL expression to group by
  alias: string; // output column name
  label: string; // human label
}

/** Detect a grouping ("by region", "by month", "monthly"). */
function parseGroup(question: string, table: DataTable, dateCol: DataColumn | null): GroupBy | null {
  const lower = question.toLowerCase();
  if (dateCol && /\b(?:by|per|each)\s+month|monthly\b/.test(lower)) {
    return { expr: `strftime('%Y-%m', "${dateCol.name}")`, alias: "month", label: "month" };
  }
  if (dateCol && /\b(?:by|per|each)\s+year|yearly|annual/.test(lower)) {
    return { expr: `strftime('%Y', "${dateCol.name}")`, alias: "year", label: "year" };
  }
  const m = lower.match(/\b(?:by|per|each|across|grouped by|for each)\s+([a-z0-9_ ]+)/);
  if (m) {
    const col = resolveColumn(words(m[1]).slice(0, 3), table.columns);
    if (col) return { expr: `"${col.name}"`, alias: col.name, label: col.name };
  }
  return null;
}

const q = (id: string) => `"${id}"`;

function baseResponse(table: DataTable, over: Partial<AssistantResponse>): AssistantResponse {
  return {
    intent: "generate",
    title: "Query on your data",
    difficulty: "Beginner",
    estMinutes: 4,
    answer: "",
    matched: true,
    steps: [],
    mistakes: [],
    performance: [
      "This runs on your in-browser table — instant at this size. For millions of rows, index the columns you filter or group by.",
    ],
    interviewQs: [],
    relatedTopics: [],
    practiceExercise: `Tweak the generated SQL in the box and re-run it against ${q(table.name)}.`,
    runMainQuery: true,
    ...over,
  };
}

/** Turn a plain-English question into SQL against a specific uploaded table. */
export function askAboutData(question: string, table: DataTable): AssistantResponse {
  const t = q(table.name);
  const qWords = words(question).filter((w) => !STOPWORDS.has(w));
  const numericCols = table.columns.filter(isNumeric);
  const lower = question.toLowerCase();
  const dateCol = findDateColumn(table);

  const filters = parseFilters(question, table, dateCol);
  const whereSql = filters.where.length ? `\nWHERE ${filters.where.join(" AND ")}` : "";
  const filterText = filters.describe.length ? ` where ${filters.describe.join(" and ")}` : "";
  const filterAssume = filters.assumptions;

  const group = parseGroup(question, table, dateCol);
  const topMatch = lower.match(/\btop\s+(\d+)\b/) || lower.match(/\b(\d+)\s+(?:highest|most|largest|biggest|top)\b/);
  const limitN = topMatch ? parseInt(topMatch[1], 10) : 5;

  // ---- 1. COUNT / how many
  if (/\b(how many|number of|count|total (rows|records)|no\.? of)\b/.test(lower)) {
    // "how many UNIQUE/DISTINCT customers" → COUNT(DISTINCT col)
    if (/\b(unique|distinct|different)\b/.test(lower)) {
      const target = resolveColumn(qWords, table.columns) ?? table.columns[0];
      return baseResponse(table, {
        title: `Unique ${target.name}`,
        headline: `Number of unique ${target.name} values${filterText}:`,
        answer: `Counting the **distinct** values of **${target.name}**${filterText ? ` (only${filterText})` : ""}.`,
        assumptions: filterAssume,
        sql: `SELECT COUNT(DISTINCT ${q(target.name)}) AS unique_${target.name}\nFROM ${t}${whereSql};`,
        sqlLabel: "Generated SQL",
        steps: [`COUNT(DISTINCT ${target.name}) counts each value once, ignoring duplicates.`],
        relatedTopics: ["distinct", "aggregate-functions"],
      });
    }
    if (group) {
      return baseResponse(table, {
        title: `Count per ${group.label}`,
        headline: `Here's the number of rows for each ${group.label}${filterText}:`,
        answer: `Counting rows${filterText ? ` (only${filterText})` : ""} grouped by **${group.label}**.`,
        assumptions: filterAssume,
        sql: `SELECT ${group.expr} AS ${group.alias}, COUNT(*) AS count\nFROM ${t}${whereSql}\nGROUP BY ${group.expr}\nORDER BY count DESC;`,
        sqlLabel: "Generated SQL",
        steps: [whereSql ? `Keep only rows${filterText}.` : "Look at every row.", `Group them by ${group.label}.`, "Count the rows in each group, biggest first."],
        relatedTopics: ["group-by", "aggregate-functions"],
      });
    }
    return baseResponse(table, {
      title: "Row count",
      headline: filterText ? `Number of rows${filterText}:` : "Total number of rows in your data:",
      answer: `Counting rows${filterText ? ` (only${filterText})` : ""}.`,
      assumptions: filterAssume,
      sql: `SELECT COUNT(*) AS total_rows\nFROM ${t}${whereSql};`,
      sqlLabel: "Generated SQL",
      steps: [whereSql ? `Keep only rows${filterText}, then count them.` : "COUNT(*) counts every row."],
      relatedTopics: ["aggregate-functions"],
    });
  }

  // ---- 2. SUM / total of <numeric>
  // Note: only "sum"/"total" trigger this — words like "sales"/"revenue" are
  // often column or value names (e.g. a "Sales" department), so they only act
  // as fuzzy column hints, never as the SUM trigger.
  if (/\b(sum|total)\b/.test(lower) && numericCols.length > 0) {
    const target = resolveColumn(qWords, table.columns, true) ?? numericCols[0];
    const assumed = [...filterAssume, ...(resolveColumn(qWords, table.columns, true) ? [] : [`No numeric column was named, so I summed "${target.name}".`])];
    if (group) {
      const wantsPct = /\b(percent|percentage|share|proportion|%)\b/.test(lower);
      const wantsAvg = /\b(average|avg|mean)\b/.test(lower);
      const wantsCount = /\b(count|how many|number of)\b/.test(lower);
      const extra: string[] = [];
      if (wantsCount) extra.push(`COUNT(*) AS count`);
      if (wantsAvg) extra.push(`ROUND(AVG(${q(target.name)}), 2) AS avg_${target.name}`);
      if (wantsPct) extra.push(`ROUND(100.0 * SUM(${q(target.name)}) / (SELECT SUM(${q(target.name)}) FROM ${t}${whereSql}), 1) AS pct_of_total`);
      const extraCols = extra.length ? `,\n       ${extra.join(",\n       ")}` : "";
      const multi = extra.length > 0;
      return baseResponse(table, {
        title: `Total ${target.name} by ${group.label}`,
        headline: `${multi ? "Metrics" : `Total ${target.name}`} for each ${group.label}${filterText}:`,
        answer: `Summarising **${target.name}** for each **${group.label}**${filterText ? ` (only${filterText})` : ""}${multi ? " — total" + (wantsCount ? ", count" : "") + (wantsAvg ? ", average" : "") + (wantsPct ? ", and share of total" : "") : ""}.`,
        assumptions: assumed,
        sql: `SELECT ${group.expr} AS ${group.alias}, SUM(${q(target.name)}) AS total_${target.name}${extraCols}\nFROM ${t}${whereSql}\nGROUP BY ${group.expr}\nORDER BY total_${target.name} DESC;`,
        sqlLabel: "Generated SQL",
        steps: [whereSql ? `Keep only rows${filterText}.` : "Take all rows.", `Group by ${group.label}.`, `Compute ${multi ? "the requested metrics" : `the total of ${target.name}`} per group, highest first.`],
        relatedTopics: ["group-by", "aggregate-functions"],
      });
    }
    return baseResponse(table, {
      title: `Total ${target.name}`,
      headline: `The total of ${target.name}${filterText}:`,
      answer: `Summing **${target.name}**${filterText ? ` (only${filterText})` : ""}.`,
      assumptions: assumed,
      sql: `SELECT SUM(${q(target.name)}) AS total_${target.name}\nFROM ${t}${whereSql};`,
      sqlLabel: "Generated SQL",
      steps: [`SUM adds up ${target.name}${whereSql ? ` for rows${filterText}` : ""}.`],
      relatedTopics: ["aggregate-functions"],
    });
  }

  // ---- 3. AVERAGE
  if (/\b(average|avg|mean)\b/.test(lower) && numericCols.length > 0) {
    const target = resolveColumn(qWords, table.columns, true) ?? numericCols[0];
    const assumed = [...filterAssume, ...(resolveColumn(qWords, table.columns, true) ? [] : [`No numeric column was named, so I averaged "${target.name}".`])];
    if (group) {
      return baseResponse(table, {
        title: `Average ${target.name} by ${group.label}`,
        headline: `Average ${target.name} for each ${group.label}${filterText}:`,
        answer: `Average of **${target.name}** for each **${group.label}**${filterText ? ` (only${filterText})` : ""}.`,
        assumptions: assumed,
        sql: `SELECT ${group.expr} AS ${group.alias}, ROUND(AVG(${q(target.name)}), 2) AS avg_${target.name}\nFROM ${t}${whereSql}\nGROUP BY ${group.expr}\nORDER BY avg_${target.name} DESC;`,
        sqlLabel: "Generated SQL",
        steps: [`Group by ${group.label}.`, `Average ${target.name} in each group.`],
        relatedTopics: ["group-by", "aggregate-functions"],
        mistakes: ["AVG ignores blank/NULL values — they don't count as 0."],
      });
    }
    return baseResponse(table, {
      title: `Average ${target.name}`,
      headline: `The average ${target.name}${filterText}:`,
      answer: `Average of **${target.name}**${filterText ? ` (only${filterText})` : ""}.`,
      assumptions: assumed,
      sql: `SELECT ROUND(AVG(${q(target.name)}), 2) AS avg_${target.name}\nFROM ${t}${whereSql};`,
      sqlLabel: "Generated SQL",
      steps: [`AVG = total of ${target.name} ÷ number of rows.`],
      relatedTopics: ["aggregate-functions"],
    });
  }

  // ---- 4. MAX / MIN / top-N / bottom-N
  const wantsHigh = /\b(highest|max|maximum|most|largest|biggest|top)\b/.test(lower);
  const wantsLow = /\b(lowest|min|minimum|least|smallest|bottom)\b/.test(lower);

  // 4a. Top-N PER GROUP ("top 3 products per region") → window function.
  // Requires an explicit per-group phrase so "top 5 by amount" (where "by" is
  // the sort key, not a grouping) stays a plain ranking.
  const perGroupPhrase = /\b(per|each|within each|in each|for each)\b/.test(lower);
  if ((wantsHigh || wantsLow) && group && perGroupPhrase && numericCols.length > 0) {
    const target = resolveColumn(qWords, table.columns, true) ?? numericCols[0];
    const dir = wantsLow ? "ASC" : "DESC";
    const perGroupN = topMatch ? limitN : 1;
    return baseResponse(table, {
      title: `${wantsLow ? "Bottom" : "Top"} ${perGroupN} by ${target.name} per ${group.label}`,
      headline: `The ${wantsLow ? "bottom" : "top"} ${perGroupN} by ${target.name} within each ${group.label}${filterText}:`,
      answer: `For each **${group.label}**, the ${wantsLow ? "lowest" : "highest"} ${perGroupN} row(s) by **${target.name}**${filterText ? ` (only${filterText})` : ""}. This uses a window function — the classic "top-N per group" pattern.`,
      assumptions: filterAssume,
      sql: `WITH ranked AS (\n  SELECT *,\n    ROW_NUMBER() OVER (PARTITION BY ${group.expr} ORDER BY ${q(target.name)} ${dir}) AS rn\n  FROM ${t}${whereSql}\n)\nSELECT * FROM ranked WHERE rn <= ${perGroupN};`,
      sqlLabel: "Generated SQL",
      steps: [`Number the rows within each ${group.label}, ordered by ${target.name} ${dir === "DESC" ? "high→low" : "low→high"}.`, `Keep the first ${perGroupN} of each group.`],
      breakdown: [{ clause: `ROW_NUMBER() OVER (PARTITION BY ${group.expr} ORDER BY ...)`, explanation: `Restarts the numbering for every ${group.label}.` }],
      relatedTopics: ["window-functions", "ctes"],
    });
  }

  if ((wantsHigh || wantsLow) && numericCols.length > 0) {
    const target = resolveColumn(qWords, table.columns, true) ?? numericCols[0];
    const dir = wantsLow ? "ASC" : "DESC";
    const assumed = [...filterAssume, ...(resolveColumn(qWords, table.columns, true) ? [] : [`Ranked by "${target.name}" since no numeric column was named.`])];
    return baseResponse(table, {
      title: `${wantsLow ? "Bottom" : "Top"} ${limitN} by ${target.name}`,
      headline: `The ${wantsLow ? "bottom" : "top"} ${limitN} rows by ${target.name}${filterText}:`,
      answer: `Showing the ${wantsLow ? "lowest" : "highest"} ${limitN} rows by **${target.name}**${filterText ? ` (only${filterText})` : ""}.`,
      assumptions: assumed,
      sql: `SELECT *\nFROM ${t}${whereSql}\nORDER BY ${q(target.name)} ${dir}\nLIMIT ${limitN};`,
      sqlLabel: "Generated SQL",
      steps: [whereSql ? `Keep only rows${filterText}.` : "Take all rows.", `Sort by ${target.name} ${dir === "DESC" ? "high→low" : "low→high"}.`, `Keep the first ${limitN}.`],
      relatedTopics: ["order-by", "limit-offset"],
    });
  }

  // ---- 5. DISTINCT
  if (/\b(distinct|unique|different|list of|what.*are the)\b/.test(lower) && !group) {
    const target = resolveColumn(qWords, table.columns) ?? table.columns[0];
    return baseResponse(table, {
      title: `Distinct ${target.name}`,
      headline: `The unique values of ${target.name}${filterText}:`,
      answer: `Listing the unique values of **${target.name}**.`,
      assumptions: filterAssume,
      sql: `SELECT DISTINCT ${q(target.name)}\nFROM ${t}${whereSql}\nORDER BY ${q(target.name)};`,
      sqlLabel: "Generated SQL",
      steps: ["DISTINCT removes duplicates so each value shows once."],
      relatedTopics: ["distinct"],
    });
  }

  // ---- 6. group-only breakdown
  if (group) {
    const metricCol = numericCols[0];
    const sql = metricCol
      ? `SELECT ${group.expr} AS ${group.alias}, COUNT(*) AS count, SUM(${q(metricCol.name)}) AS total_${metricCol.name}\nFROM ${t}${whereSql}\nGROUP BY ${group.expr}\nORDER BY count DESC;`
      : `SELECT ${group.expr} AS ${group.alias}, COUNT(*) AS count\nFROM ${t}${whereSql}\nGROUP BY ${group.expr}\nORDER BY count DESC;`;
    return baseResponse(table, {
      title: `Breakdown by ${group.label}`,
      headline: `Breakdown by ${group.label}${filterText}:`,
      answer: `Grouping by **${group.label}**${metricCol ? ` and summarising **${metricCol.name}**` : ""}${filterText ? ` (only${filterText})` : ""}.`,
      assumptions: filterAssume,
      sql,
      sqlLabel: "Generated SQL",
      steps: [`Group by ${group.label}.`, metricCol ? `Count rows and total ${metricCol.name} per group.` : "Count rows per group."],
      relatedTopics: ["group-by", "aggregate-functions"],
    });
  }

  // ---- 7. Filters only → a filtered list of rows (e.g. "completed orders in the North")
  if (filters.where.length > 0) {
    return baseResponse(table, {
      title: "Filtered rows",
      headline: `Here are the rows${filterText}:`,
      answer: `Showing rows${filterText}. (Add words like "count", "total", or "by <column>" to summarise instead.)`,
      assumptions: filterAssume,
      sql: `SELECT *\nFROM ${t}${whereSql}\nLIMIT 100;`,
      sqlLabel: "Generated SQL",
      steps: [`Keep only the rows${filterText}.`, "Show them (first 100)."],
      relatedTopics: ["where", "select"],
    });
  }

  // ---- 8. Fallback: couldn't confidently map the question to the columns.
  const mentioned = resolveColumn(qWords, table.columns);
  const orderClause = mentioned ? `\nORDER BY ${q(mentioned.name)}${isNumeric(mentioned) ? " DESC" : ""}` : "";
  const colList = table.columns.map((c) => c.name).join(", ");
  return baseResponse(table, {
    title: "I need a bit more to answer that",
    matched: false,
    headline: `Your data doesn't seem to have what that question asked about. Your columns are: ${colList}.`,
    answer:
      `I don't want to guess, so here's a quick peek at your table instead. Your question may have mentioned something that isn't a column here — this table only has: **${colList}**. Tap a suggestion below or rephrase using one of those column names.`,
    suggestions: suggestDataQuestions(table),
    sql: `SELECT *\nFROM ${t}${orderClause}\nLIMIT 50;`,
    sqlLabel: "Preview SQL",
    steps: ["Show the first rows so you can see what's actually in your data."],
    relatedTopics: [],
    performance: [],
    practiceExercise: `Try: "count by ${table.columns.find((c) => c.type === "TEXT")?.name ?? table.columns[0].name}" or "top 5 by ${numericCols[0]?.name ?? table.columns[0].name}".`,
  });
}

/** Suggested starter questions generated from the table's own columns. */
export function suggestDataQuestions(table: DataTable): string[] {
  const textCol = table.columns.find((c) => c.type === "TEXT");
  const numCol = table.columns.find((c) => c.type === "INTEGER" || c.type === "REAL");
  const out: string[] = ["How many rows are there?"];
  if (textCol) out.push(`Count by ${textCol.name}`);
  if (numCol && textCol) out.push(`Total ${numCol.name} by ${textCol.name}`);
  if (numCol && textCol) out.push(`Average ${numCol.name} by ${textCol.name}`);
  if (numCol) out.push(`Top 5 by ${numCol.name}`);
  if (textCol) out.push(`Show distinct ${textCol.name}`);
  return out.slice(0, 6);
}
