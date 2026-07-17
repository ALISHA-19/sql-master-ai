"use client";

import type { SqlType } from "./import";

/**
 * Persists imported tables to localStorage so they survive a page refresh.
 * Pure storage helpers only — no dependency on the engine or import modules,
 * to keep the module graph acyclic (engine.ts reads these on startup).
 */

export interface StoredImport {
  name: string;
  columns: { name: string; type: SqlType }[];
  rows: (string | number | null)[][];
}

const KEY = "sqlmaster-imports-v1";
// localStorage is ~5MB; stay well under so we never blow the quota.
const MAX_BYTES = 3_500_000;

export function loadImports(): StoredImport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredImport[]) : [];
  } catch {
    return [];
  }
}

/** Save (or replace) one imported table. Returns false if it was too big to persist. */
export function saveImport(imp: StoredImport): boolean {
  if (typeof window === "undefined") return false;
  try {
    const all = loadImports().filter((x) => x.name !== imp.name);
    all.push(imp);
    const serialized = JSON.stringify(all);
    if (serialized.length > MAX_BYTES) return false;
    localStorage.setItem(KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function removeImport(name: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(loadImports().filter((x) => x.name !== name)));
  } catch {
    /* ignore */
  }
}
