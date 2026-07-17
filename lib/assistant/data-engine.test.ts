import { describe, it, expect } from "vitest";
import { askAboutData, suggestDataQuestions, type DataTable } from "./data-engine";

// A representative uploaded table: text, numeric, and date columns + sample values.
const table: DataTable = {
  name: "orders",
  columns: [
    { name: "order_id", type: "INTEGER" },
    { name: "customer", type: "TEXT" },
    { name: "region", type: "TEXT" },
    { name: "status", type: "TEXT" },
    { name: "amount", type: "REAL" },
    { name: "order_date", type: "TEXT" },
  ],
  values: {
    customer: ["Acme", "Beta"],
    region: ["North", "South", "East", "West"],
    status: ["completed", "pending", "cancelled"],
    order_date: ["2026-01-05", "2026-02-11"],
  },
};

const sqlOf = (q: string) => askAboutData(q, table).sql ?? "";

describe("askAboutData — aggregates", () => {
  it("counts all rows", () => {
    expect(sqlOf("how many orders are there")).toMatch(/SELECT COUNT\(\*\) AS total_rows/i);
  });
  it("counts distinct for 'unique'", () => {
    expect(sqlOf("how many unique customers")).toMatch(/COUNT\(DISTINCT "customer"\)/i);
  });
  it("sums a numeric column", () => {
    expect(sqlOf("total amount")).toMatch(/SELECT SUM\("amount"\)/i);
  });
  it("groups a sum by a column", () => {
    const sql = sqlOf("total amount by region");
    expect(sql).toMatch(/SUM\("amount"\)/i);
    expect(sql).toMatch(/GROUP BY "region"/i);
  });
  it("averages by group", () => {
    expect(sqlOf("average amount by region")).toMatch(/AVG\("amount"\)/i);
  });
});

describe("askAboutData — ranking & windows", () => {
  it("top-N with a limit", () => {
    expect(sqlOf("top 3 by amount")).toMatch(/ORDER BY "amount" DESC\s*LIMIT 3/i);
  });
  it("top-N per group uses a window function", () => {
    const sql = sqlOf("top 1 amount per region");
    expect(sql).toMatch(/ROW_NUMBER\(\) OVER \(PARTITION BY "region"/i);
  });
});

describe("askAboutData — filters", () => {
  it("value filter from known values", () => {
    expect(sqlOf("completed orders")).toMatch(/WHERE "status" = 'completed'/i);
  });
  it("numeric comparison", () => {
    expect(sqlOf("orders with amount over 5000")).toMatch(/"amount" > 5000/i);
  });
  it("between range", () => {
    expect(sqlOf("amount between 100 and 500")).toMatch(/"amount" BETWEEN 100 AND 500/i);
  });
  it("negation", () => {
    expect(sqlOf("orders where status is not cancelled")).toMatch(/"status" != 'cancelled'/i);
  });
  it("combines multiple filters with AND", () => {
    const sql = sqlOf("completed orders in the North over 5000");
    expect(sql).toMatch(/"status" = 'completed'/i);
    expect(sql).toMatch(/"region" = 'North'/i);
    expect(sql).toMatch(/"amount" > 5000/i);
    expect(sql).toMatch(/ AND /);
  });
  it("date month grouping uses the date column", () => {
    expect(sqlOf("count by month")).toMatch(/strftime\('%Y-%m', "order_date"\)/i);
  });
});

describe("askAboutData — safety & fallbacks", () => {
  it("flags questions it can't map and stays matched=false", () => {
    const r = askAboutData("show me the profit margin trend", table);
    expect(r.matched).toBe(false);
    expect(r.suggestions && r.suggestions.length).toBeGreaterThan(0);
  });
  it("never leaves SQL empty", () => {
    for (const q of ["", "hello", "total amount by region", "top 5 by amount"]) {
      expect(askAboutData(q, table).sql).toBeTruthy();
    }
  });
  it("suggests questions built from the columns", () => {
    const s = suggestDataQuestions(table);
    expect(s.some((x) => /customer|region/.test(x))).toBe(true);
  });
});
