"use client";

import type { Database, SqlJsStatic } from "sql.js";
import { SAMPLE_SCHEMA_SQL, SAMPLE_SEED_SQL } from "./sample-data";
import { loadImports, type StoredImport } from "./persist-imports";

/**
 * Singleton wrapper around sql.js (SQLite compiled to WebAssembly).
 * The database lives entirely in the browser — queries run locally with
 * zero backend, which keeps the playground instant and private.
 */

let sqlJs: SqlJsStatic | null = null;
let db: Database | null = null;
let loading: Promise<Database> | null = null;

/** Recreate a previously-imported table (used to rehydrate after a refresh). */
export function applyStoredTable(database: Database, imp: StoredImport): void {
  // imp.name is already a sanitized identifier; keep it verbatim (may be Unicode).
  const safe = imp.name;
  database.run(`DROP TABLE IF EXISTS "${safe}"`);
  const colDefs = imp.columns.map((c) => `"${c.name}" ${c.type}`).join(", ");
  database.run(`CREATE TABLE "${safe}" (${colDefs})`);
  const placeholders = imp.columns.map(() => "?").join(", ");
  const stmt = database.prepare(`INSERT INTO "${safe}" VALUES (${placeholders})`);
  try {
    database.run("BEGIN TRANSACTION");
    for (const row of imp.rows) stmt.run(row as (string | number | null)[]);
    database.run("COMMIT");
  } catch {
    database.run("ROLLBACK");
  } finally {
    stmt.free();
  }
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  ms: number;
  error?: string;
}

export async function getDb(): Promise<Database> {
  if (db) return db;
  if (loading) return loading;

  loading = (async () => {
    const initSqlJs = (await import("sql.js")).default;
    sqlJs = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
    db = new sqlJs.Database();
    db.run(SAMPLE_SCHEMA_SQL);
    db.run(SAMPLE_SEED_SQL);
    // Rehydrate any tables the user imported in a previous session.
    for (const imp of loadImports()) {
      try {
        applyStoredTable(db, imp);
      } catch {
        /* skip a corrupt stored table rather than break startup */
      }
    }
    return db;
  })();

  return loading;
}

export async function resetDb(): Promise<Database> {
  if (db) {
    db.close();
    db = null;
    loading = null;
  }
  return getDb();
}

export async function runQuery(sql: string): Promise<QueryResult> {
  const database = await getDb();
  const start = performance.now();
  try {
    const results = database.exec(sql);
    const ms = performance.now() - start;
    if (results.length === 0) {
      // Statement ran but returned no result set (DDL/DML)
      const changes = database.getRowsModified();
      return {
        columns: ["status"],
        rows: [[`OK — ${changes} row(s) affected`]],
        rowCount: changes,
        ms,
      };
    }
    const last = results[results.length - 1];
    return {
      columns: last.columns,
      rows: last.values as unknown[][],
      rowCount: last.values.length,
      ms,
    };
  } catch (e) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      ms: performance.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
