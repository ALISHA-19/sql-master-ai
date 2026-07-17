import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SQL_KEYWORDS =
  /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|JOIN|INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL OUTER JOIN|FULL JOIN|CROSS JOIN|ON|AS|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|ILIKE|IS NULL|IS NOT NULL|NULL|DISTINCT|UNION ALL|UNION|INTERSECT|EXCEPT|INSERT INTO|INSERT|VALUES|UPDATE|SET|DELETE|CREATE TABLE|CREATE INDEX|CREATE VIEW|CREATE|ALTER TABLE|ALTER|DROP|TRUNCATE|PRIMARY KEY|FOREIGN KEY|REFERENCES|CONSTRAINT|UNIQUE|CHECK|DEFAULT|INTO|WITH RECURSIVE|WITH|OVER|PARTITION BY|ROWS BETWEEN|RANGE BETWEEN|UNBOUNDED PRECEDING|CURRENT ROW|PRECEDING|FOLLOWING|CASE|WHEN|THEN|ELSE|END|ASC|DESC|BEGIN|COMMIT|ROLLBACK|TRANSACTION|GRANT|REVOKE|INDEX|VIEW|TRIGGER|PROCEDURE|FUNCTION|RETURNS|RETURN|DECLARE|USING|NATURAL|LATERAL|FETCH FIRST|ONLY|CAST|EXPLAIN|ANALYZE|VACUUM)\b/gi;

const SQL_FUNCTIONS =
  /\b(COUNT|SUM|AVG|MIN|MAX|ROW_NUMBER|RANK|DENSE_RANK|NTILE|LAG|LEAD|FIRST_VALUE|LAST_VALUE|COALESCE|NULLIF|CONCAT|SUBSTRING|SUBSTR|UPPER|LOWER|TRIM|LTRIM|RTRIM|LENGTH|REPLACE|ROUND|CEIL|CEILING|FLOOR|ABS|MOD|POWER|SQRT|NOW|CURRENT_DATE|CURRENT_TIMESTAMP|DATE_TRUNC|EXTRACT|DATEDIFF|DATE_ADD|DATEADD|TO_CHAR|TO_DATE|STRFTIME|JULIANDAY|GROUP_CONCAT|STRING_AGG|ARRAY_AGG|JSON_EXTRACT|JSONB_BUILD_OBJECT|PERCENT_RANK|CUME_DIST|STDDEV|VARIANCE|GREATEST|LEAST|IFNULL|INSTR|POSITION|LEFT|RIGHT|LPAD|RPAD|RANDOM|SIGN|EXP|LN|LOG)(?=\s*\()/gi;

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Lightweight SQL syntax highlighter for static code blocks. Returns HTML. */
export function highlightSql(sql: string): string {
  let html = escapeHtml(sql);
  // Strings first so keywords inside strings are not highlighted
  html = html.replace(/'([^']*)'/g, `<span class="sql-str">'$1'</span>`);
  html = html.replace(/--[^\n]*/g, (m) => `<span class="sql-cm">${m}</span>`);
  html = html.replace(SQL_FUNCTIONS, (m) => `<span class="sql-fn">${m}</span>`);
  html = html.replace(SQL_KEYWORDS, (m) => {
    // don't re-wrap inside existing spans
    return `<span class="sql-kw">${m.toUpperCase()}</span>`;
  });
  html = html.replace(/\b(\d+(\.\d+)?)\b(?![^<]*<\/span>)/g, `<span class="sql-num">$1</span>`);
  return html;
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCsv(columns: string[], rows: unknown[][]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}
