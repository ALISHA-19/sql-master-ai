"use client";

import { getDb } from "./engine";
import { removeImport, saveImport } from "./persist-imports";

/**
 * Client-side CSV/TSV import for the Playground database.
 * Parses a delimited file, infers column types, and creates a real SQLite
 * table you can query — all in the browser, nothing uploaded anywhere.
 */

export interface ParsedTable {
  columns: string[];
  rows: string[][];
  delimiter: string;
}

export type SqlType = "INTEGER" | "REAL" | "TEXT";

/** Turn an arbitrary header/name into a safe SQL identifier. */
export function sanitizeIdentifier(raw: string, fallback = "column"): string {
  // Keep Unicode letters/digits so non-English headers (café, 日付, país) survive;
  // collapse everything else to underscores. Identifiers are always quoted in SQL.
  let s = raw
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_]+/gu, "_")
    .replace(/^_+|_+$/gu, "");
  if (!s) s = fallback;
  if (/^[0-9]/u.test(s)) s = "c_" + s; // identifiers can't start with a digit
  return s;
}

/** Guess a delimiter by comparing tab vs comma counts on the first line. */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;
  if (tabs > commas && tabs >= semis) return "\t";
  if (semis > commas && semis > tabs) return ";";
  return ",";
}

/** Heuristic: does this text look like a binary/Office file, not real CSV? */
export function looksBinary(text: string): boolean {
  if (text.startsWith("PK")) return true; // ZIP container (xlsx/docx/pptx)
  if (text.startsWith("%PDF")) return true;
  if (text.startsWith("\xD0\xCF\x11")) return true; // legacy OLE (.xls/.doc)
  const sample = text.slice(0, 1200);
  let control = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c === 0 || (c > 13 && c < 32)) control++;
  }
  return control > 6;
}

/**
 * Read any supported file into CSV text.
 * - .xlsx/.xls/.xlsm → parsed with SheetJS (first sheet) → CSV
 * - .csv/.tsv/.txt   → read as text (rejected if it's actually binary)
 */
export async function fileToCsvText(file: File): Promise<{ csv: string; note?: string }> {
  const name = file.name.toLowerCase();
  const isExcel = /\.(xlsx|xls|xlsm|xlsb)$/.test(name);
  if (isExcel) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error("That workbook has no sheets.");
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
    const note =
      wb.SheetNames.length > 1
        ? `Imported the first sheet ("${sheetName}") of ${wb.SheetNames.length}. Split the other sheets into separate files to import them too.`
        : undefined;
    return { csv, note };
  }
  const text = await file.text();
  if (looksBinary(text)) {
    throw new Error(
      "This looks like a binary or Office file, not a plain CSV. If it's an Excel workbook, make sure the filename ends in .xlsx and re-upload — I can read those directly now. Otherwise, export your data as CSV first."
    );
  }
  return { csv: text };
}

/**
 * Read EVERY sheet of a workbook (or the single CSV/TSV) into CSV text.
 * Lets the importer create one table per sheet.
 */
export async function fileToSheets(file: File): Promise<{ name: string; csv: string }[]> {
  const name = file.name.toLowerCase();
  if (/\.(xlsx|xls|xlsm|xlsb)$/.test(name)) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    return wb.SheetNames.map((sn) => ({ name: sn, csv: XLSX.utils.sheet_to_csv(wb.Sheets[sn]) })).filter(
      (s) => s.csv.trim() !== ""
    );
  }
  const { csv } = await fileToCsvText(file);
  return [{ name: file.name.replace(/\.[^.]+$/, ""), csv }];
}

/**
 * RFC-4180-ish delimited parser: handles quoted fields, escaped quotes (""),
 * delimiters and newlines inside quotes, and CRLF line endings.
 * If `hasHeader` is false, synthetic column names (col_1…) are generated and
 * every line is treated as data.
 */
export function parseDelimited(text: string, delimiter?: string, hasHeader = true): ParsedTable {
  const delim = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const endField = () => { cur.push(field); field = ""; };
  const endRow = () => { rows.push(cur); cur = []; };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === delim) { endField(); i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { endField(); endRow(); i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || cur.length > 0) { endField(); endRow(); }

  // Drop fully-empty rows (e.g. trailing newline)
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ""));
  if (nonEmpty.length === 0) return { columns: [], rows: [], delimiter: delim };

  const width = Math.max(...nonEmpty.map((r) => r.length));

  // Headers: either the first row, or synthetic names when hasHeader is false.
  const seen = new Map<string, number>();
  const headerRow = hasHeader ? nonEmpty[0] : nonEmpty[0].map((_, i) => `col_${i + 1}`);
  const columns = Array.from({ length: width }, (_, idx) => {
    let name = sanitizeIdentifier(headerRow[idx] ?? "", `col_${idx + 1}`);
    if (seen.has(name)) {
      const n = seen.get(name)! + 1;
      seen.set(name, n);
      name = `${name}_${n}`;
    } else {
      seen.set(name, 1);
    }
    return name;
  });

  const dataRows = hasHeader ? nonEmpty.slice(1) : nonEmpty;
  const body = dataRows.map((r) => {
    const row = r.slice(0, width);
    while (row.length < width) row.push("");
    return row;
  });

  return { columns, rows: body, delimiter: delim };
}

/* ---------- Value cleaning & type analysis (handles messy real-world data) ---------- */

const MONTH_NUM: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Clean a formatted number: strips currency symbols, thousands separators,
 * percent signs, and accounting-style parentheses for negatives.
 * Returns a numeric string or null if it isn't really a number.
 */
export function cleanNumeric(raw: string): string | null {
  let s = raw.trim();
  if (s === "") return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); } // (500) → -500
  s = s.replace(/[₹$€£¥,\s]/g, "").replace(/%$/, "");
  if (!/^-?\d*\.?\d+$/.test(s)) return null;
  let n = parseFloat(s);
  if (neg) n = -n;
  return String(n);
}

/** Does a value look like a date in a format we can normalise? */
function looksLikeDate(raw: string): boolean {
  return /^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}[ -][A-Za-z]{3,9}[ ,-]+\d{4}|[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4})$/.test(
    raw.trim()
  );
}

/** Normalise a date to ISO YYYY-MM-DD (so sorting & strftime work). `dmy` picks day/month order for ambiguous slash dates. */
export function normalizeDate(raw: string, dmy: boolean): string | null {
  const s = raw.trim();
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) return `${m[1]}-${pad2(+m[2])}-${pad2(+m[3])}`;
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) {
    const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
    let d: number, mo: number;
    if (dmy) { d = +m[1]; mo = +m[2]; } else { mo = +m[1]; d = +m[2]; }
    if (mo > 12 || d > 31 || mo < 1 || d < 1) return null;
    return `${yr}-${pad2(mo)}-${pad2(d)}`;
  }
  if ((m = s.match(/^(\d{1,2})[ -]([A-Za-z]{3,9})[ ,-]+(\d{4})$/))) {
    const mo = MONTH_NUM[m[2].slice(0, 3).toLowerCase()];
    if (mo) return `${m[3]}-${pad2(mo)}-${pad2(+m[1])}`;
  }
  if ((m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/))) {
    const mo = MONTH_NUM[m[1].slice(0, 3).toLowerCase()];
    if (mo) return `${m[3]}-${pad2(mo)}-${pad2(+m[2])}`;
  }
  return null;
}

export interface ColumnPlan {
  name: string;
  type: SqlType;
  kind: "date" | "integer" | "decimal" | "text";
  dmy: boolean;
  transform: (raw: string) => string | number | null;
}

/**
 * Analyse each column and produce a type + a value transform, tolerating messy
 * real-world data: currency/comma/percent numbers, several date formats, a few
 * stray non-numeric cells, and leading-zero codes (kept as text).
 */
export function analyzeColumns(table: ParsedTable): ColumnPlan[] {
  return table.columns.map((name, ci) => {
    const raws = table.rows.map((r) => (r[ci] ?? "").trim()).filter((v) => v !== "");
    const n = raws.length;
    if (n === 0) {
      return { name, type: "TEXT", kind: "text", dmy: false, transform: (v) => (v.trim() === "" ? null : v) };
    }

    // Dates (≥70% parseable as dates and not plain numbers)
    const dateCount = raws.filter((v) => looksLikeDate(v)).length;
    if (dateCount / n >= 0.7) {
      let dmyEvidence = false;
      let mdyEvidence = false;
      for (const v of raws) {
        const m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}$/);
        if (m) { if (+m[1] > 12) dmyEvidence = true; if (+m[2] > 12) mdyEvidence = true; }
      }
      const dmy = dmyEvidence && !mdyEvidence; // default to MM/DD (US) unless evidence says DD/MM
      return {
        name, type: "TEXT", kind: "date", dmy,
        transform: (v) => (v.trim() === "" ? null : normalizeDate(v, dmy) ?? v),
      };
    }

    // Leading-zero codes (zip 07001, id 007) → keep as text so the zero survives
    if (raws.some((v) => /^0\d+$/.test(v))) {
      return { name, type: "TEXT", kind: "text", dmy: false, transform: (v) => (v.trim() === "" ? null : v) };
    }

    // Numbers (≥90% parse after cleaning currency/commas/percent)
    let numOk = 0;
    let allInt = true;
    for (const v of raws) {
      const c = cleanNumeric(v);
      if (c !== null) { numOk++; if (c.includes(".")) allInt = false; }
    }
    if (numOk / n >= 0.9) {
      return {
        name,
        type: allInt ? "INTEGER" : "REAL",
        kind: allInt ? "integer" : "decimal",
        dmy: false,
        transform: (v) => { const c = cleanNumeric(v); return c === null ? null : Number(c); },
      };
    }

    return { name, type: "TEXT", kind: "text", dmy: false, transform: (v) => (v.trim() === "" ? null : v) };
  });
}

/** Infer types for every column (delegates to the messy-data-aware analyzer). */
export function inferTypes(table: ParsedTable): SqlType[] {
  return analyzeColumns(table).map((p) => p.type);
}

/** Friendly per-column kind labels for the preview (DATE / DECIMAL / etc.). */
export function columnKinds(table: ParsedTable): ColumnPlan["kind"][] {
  return analyzeColumns(table).map((p) => p.kind);
}

export interface ImportResult {
  tableName: string;
  rowsInserted: number;
  columns: { name: string; type: SqlType }[];
  persisted: boolean; // false if too big for localStorage (kept in memory only)
}

/**
 * Create (or replace) a table from parsed CSV data and bulk-insert the rows
 * using a prepared statement (safe against quotes/commas in the data).
 */
export async function importTable(rawName: string, table: ParsedTable): Promise<ImportResult> {
  const db = await getDb();
  const tableName = sanitizeIdentifier(rawName, "my_table");
  const plans = analyzeColumns(table); // messy-data-aware types + value transforms

  db.run(`DROP TABLE IF EXISTS "${tableName}"`);
  const colDefs = plans.map((p) => `"${p.name}" ${p.type}`).join(", ");
  db.run(`CREATE TABLE "${tableName}" (${colDefs})`);

  const placeholders = table.columns.map(() => "?").join(", ");
  const stmt = db.prepare(`INSERT INTO "${tableName}" VALUES (${placeholders})`);
  const typedRows: (string | number | null)[][] = [];
  try {
    db.run("BEGIN TRANSACTION");
    for (const r of table.rows) {
      const values = plans.map((p, i) => p.transform(r[i] ?? "")) as (string | number | null)[];
      typedRows.push(values);
      stmt.run(values);
    }
    db.run("COMMIT");
  } catch (e) {
    db.run("ROLLBACK");
    stmt.free();
    throw e;
  }
  stmt.free();

  const columns = plans.map((p) => ({ name: p.name, type: p.type }));
  // Persist so the table survives a page refresh (false if it exceeds the quota).
  const persisted = saveImport({ name: tableName, columns, rows: typedRows });

  return { tableName, rowsInserted: table.rows.length, columns, persisted };
}

const SAMPLE_TABLE_NAMES = new Set(["customers", "products", "orders", "order_items", "employees"]);

export interface TableSummary {
  name: string;
  rowCount: number;
  columns: string[];
  isUserTable: boolean;
}

/** List every table currently in the database (sample + imported). */
export async function listAllTables(): Promise<TableSummary[]> {
  const db = await getDb();
  const res = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  if (res.length === 0) return [];
  return res[0].values.map((row) => {
    const name = String(row[0]);
    let rowCount = 0;
    let columns: string[] = [];
    try {
      rowCount = Number(db.exec(`SELECT COUNT(*) FROM "${name}"`)[0].values[0][0]);
      const info = db.exec(`PRAGMA table_info("${name}")`);
      if (info.length) columns = info[0].values.map((c) => String(c[1]));
    } catch {
      /* ignore malformed table */
    }
    return { name, rowCount, columns, isUserTable: !SAMPLE_TABLE_NAMES.has(name) };
  });
}

/**
 * Read a table's schema plus a sample of distinct values for each text column.
 * The distinct values let the data-aware assistant recognise filter phrases
 * like "completed orders" or "in the North" (mapping words → column values).
 */
export async function getTableSchema(
  name: string
): Promise<{
  name: string;
  columns: { name: string; type: SqlType }[];
  values: Record<string, string[]>;
}> {
  const db = await getDb();
  const safe = sanitizeIdentifier(name);
  const info = db.exec(`PRAGMA table_info("${safe}")`);
  const columns = info.length
    ? info[0].values.map((c) => {
        const declared = String(c[2] || "TEXT").toUpperCase();
        const type: SqlType =
          declared.includes("INT") ? "INTEGER" : declared.includes("REAL") || declared.includes("FLOA") || declared.includes("DOUB") ? "REAL" : "TEXT";
        return { name: String(c[1]), type };
      })
    : [];

  const values: Record<string, string[]> = {};
  for (const col of columns) {
    if (col.type !== "TEXT") continue;
    try {
      const res = db.exec(
        `SELECT DISTINCT "${col.name}" FROM "${safe}" WHERE "${col.name}" IS NOT NULL LIMIT 60`
      );
      if (res.length) values[col.name] = res[0].values.map((v) => String(v[0])).filter(Boolean);
    } catch {
      /* ignore */
    }
  }
  return { name, columns, values };
}

/** Columns two tables share by name (candidate join keys). */
export async function sharedColumns(tableA: string, tableB: string): Promise<string[]> {
  const a = await getTableSchema(tableA);
  const b = await getTableSchema(tableB);
  const bSet = new Set(b.columns.map((c) => c.name));
  return a.columns.filter((c) => bSet.has(c.name)).map((c) => c.name);
}

/**
 * Join two imported tables on a shared key into a new table you can query.
 * Colliding non-key columns from the second table are aliased (b_<col>).
 */
export async function joinTables(
  tableA: string,
  tableB: string,
  key: string,
  newName: string,
  kind: "INNER" | "LEFT" = "INNER"
): Promise<ImportResult> {
  const db = await getDb();
  const A = sanitizeIdentifier(tableA);
  const B = sanitizeIdentifier(tableB);
  const K = sanitizeIdentifier(key);
  const out = sanitizeIdentifier(newName, "joined");

  const a = await getTableSchema(A);
  const b = await getTableSchema(B);
  const aNames = new Set(a.columns.map((c) => c.name));

  const selects = [
    ...a.columns.map((c) => `ta."${c.name}"`),
    ...b.columns
      .filter((c) => c.name !== K)
      .map((c) => (aNames.has(c.name) ? `tb."${c.name}" AS "${B}_${c.name}"` : `tb."${c.name}"`)),
  ].join(", ");

  db.run(`DROP TABLE IF EXISTS "${out}"`);
  db.run(
    `CREATE TABLE "${out}" AS SELECT ${selects} FROM "${A}" ta ${kind} JOIN "${B}" tb ON ta."${K}" = tb."${K}"`
  );

  // Read back schema + rows so the joined table also persists across refresh.
  const schema = await getTableSchema(out);
  const rowsRes = db.exec(`SELECT * FROM "${out}"`);
  const rows = rowsRes.length ? (rowsRes[0].values as (string | number | null)[][]) : [];
  const persisted = saveImport({ name: out, columns: schema.columns, rows });

  return { tableName: out, rowsInserted: rows.length, columns: schema.columns, persisted };
}

/** Drop a user-imported table (and forget its persisted copy). */
export async function dropTable(name: string): Promise<void> {
  const db = await getDb();
  if (SAMPLE_TABLE_NAMES.has(name)) return; // never drop the sample tables here
  const safe = sanitizeIdentifier(name);
  db.run(`DROP TABLE IF EXISTS "${safe}"`);
  removeImport(safe);
}

/** A small demo CSV users can download to try the importer. */
export const SAMPLE_CSV = `employee,department,city,monthly_sales,joined
Alice Wong,Sales,Mumbai,42000,2024-01-15
Ben Carter,Sales,Delhi,38500,2024-03-02
Chandni Rao,Marketing,Mumbai,0,2024-02-20
Deepak Shah,Sales,Bengaluru,51000,2023-11-10
Elena Fischer,Marketing,Delhi,27000,2024-05-01
Farid Khan,Engineering,Bengaluru,0,2023-09-18
Grace Lee,Sales,Mumbai,46500,2024-04-12
Hassan Ali,Engineering,Delhi,0,2024-06-01`;
