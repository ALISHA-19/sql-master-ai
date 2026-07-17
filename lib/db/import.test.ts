import { describe, it, expect } from "vitest";
import {
  cleanNumeric,
  normalizeDate,
  sanitizeIdentifier,
  parseDelimited,
  analyzeColumns,
  inferTypes,
} from "./import";

describe("cleanNumeric — messy real-world numbers", () => {
  it("strips currency symbols and thousands separators", () => {
    expect(cleanNumeric("$1,200")).toBe("1200");
    expect(cleanNumeric("₹3,40,000")).toBe("340000");
    expect(cleanNumeric("€999.99")).toBe("999.99");
  });
  it("handles percentages and accounting negatives", () => {
    expect(cleanNumeric("45%")).toBe("45");
    expect(cleanNumeric("(500)")).toBe("-500");
  });
  it("returns null for non-numbers", () => {
    expect(cleanNumeric("N/A")).toBeNull();
    expect(cleanNumeric("")).toBeNull();
    expect(cleanNumeric("abc")).toBeNull();
  });
});

describe("normalizeDate — flexible date formats → ISO", () => {
  it("normalizes ISO and slash dates", () => {
    expect(normalizeDate("2026-3-5", false)).toBe("2026-03-05");
    expect(normalizeDate("2026/03/05", false)).toBe("2026-03-05");
  });
  it("respects MM/DD vs DD/MM order", () => {
    expect(normalizeDate("01/15/2024", false)).toBe("2024-01-15"); // US MM/DD
    expect(normalizeDate("15/01/2024", true)).toBe("2024-01-15"); // DD/MM
  });
  it("parses month-name formats", () => {
    expect(normalizeDate("15 Jan 2024", false)).toBe("2024-01-15");
    expect(normalizeDate("January 15, 2024", false)).toBe("2024-01-15");
  });
  it("rejects impossible dates", () => {
    expect(normalizeDate("13/45/2024", false)).toBeNull();
  });
});

describe("sanitizeIdentifier", () => {
  it("keeps unicode letters, collapses the rest", () => {
    expect(sanitizeIdentifier("Order Amount")).toBe("order_amount");
    expect(sanitizeIdentifier("café")).toBe("café");
  });
  it("prefixes leading digits and falls back on empty", () => {
    expect(sanitizeIdentifier("2024")).toBe("c_2024");
    expect(sanitizeIdentifier("!!!", "col")).toBe("col");
  });
});

describe("parseDelimited", () => {
  it("parses quoted fields with embedded commas", () => {
    const t = parseDelimited(`name,note\nAcme,"a, b, c"\nBeta,plain`);
    expect(t.columns).toEqual(["name", "note"]);
    expect(t.rows[0]).toEqual(["Acme", "a, b, c"]);
  });
  it("auto-detects tab delimiter", () => {
    const t = parseDelimited("a\tb\n1\t2");
    expect(t.delimiter).toBe("\t");
    expect(t.rows[0]).toEqual(["1", "2"]);
  });
  it("supports header-less files", () => {
    const t = parseDelimited("1,2,3\n4,5,6", undefined, false);
    expect(t.columns).toEqual(["col_1", "col_2", "col_3"]);
    expect(t.rows).toHaveLength(2);
  });
});

describe("analyzeColumns / inferTypes — column type detection", () => {
  const table = parseDelimited(
    `company,revenue,signup,active\nAcme,"$1,200",01/15/2024,Yes\nBeta,"$3,400",02/20/2024,No`
  );
  it("detects currency as a number, US date as date", () => {
    const kinds = analyzeColumns(table).map((p) => p.kind);
    expect(kinds).toEqual(["text", "integer", "date", "text"]);
    expect(inferTypes(table)).toEqual(["TEXT", "INTEGER", "TEXT", "TEXT"]);
  });
  it("transforms values (currency→number, date→ISO)", () => {
    const plans = analyzeColumns(table);
    expect(plans[1].transform("$1,200")).toBe(1200);
    expect(plans[2].transform("01/15/2024")).toBe("2024-01-15");
  });
  it("keeps leading-zero codes as text", () => {
    const t = parseDelimited("zip\n07001\n90210");
    expect(analyzeColumns(t)[0].kind).toBe("text");
  });
  it("tolerates a stray non-number in a numeric column", () => {
    const t = parseDelimited("amount\n100\n200\nN/A\n300\n400\n500\n600\n700\n800\n900");
    expect(analyzeColumns(t)[0].type).toBe("INTEGER");
  });
});
