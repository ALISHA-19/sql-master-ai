import type { Level } from "./topic-types";

export interface RoadmapNode {
  id: string;
  title: string;
  topicSlug?: string; // links into Learn section
  estMinutes: number;
  summary: string;
  prerequisites: string[]; // node ids
}

export interface RoadmapStage {
  level: Level;
  tagline: string;
  outcome: string;
  nodes: RoadmapNode[];
}

export const ROADMAP: RoadmapStage[] = [
  {
    level: "Beginner",
    tagline: "Read data confidently",
    outcome: "You can answer 'show me…' questions on a single table.",
    nodes: [
      { id: "b1", title: "SELECT & FROM", topicSlug: "select", estMinutes: 10, summary: "Pick columns, compute expressions.", prerequisites: [] },
      { id: "b2", title: "WHERE filtering", topicSlug: "where", estMinutes: 12, summary: "Conditions, AND/OR, NULL rules.", prerequisites: ["b1"] },
      { id: "b3", title: "Sorting & paging", topicSlug: "order-by", estMinutes: 8, summary: "ORDER BY, LIMIT, OFFSET.", prerequisites: ["b1"] },
      { id: "b4", title: "Patterns & ranges", topicSlug: "like", estMinutes: 8, summary: "LIKE, BETWEEN, IN.", prerequisites: ["b2"] },
      { id: "b5", title: "DISTINCT & aliases", topicSlug: "distinct", estMinutes: 6, summary: "Dedup and readable names.", prerequisites: ["b1"] },
      { id: "b6", title: "Aggregates", topicSlug: "aggregate-functions", estMinutes: 12, summary: "COUNT, SUM, AVG, MIN, MAX.", prerequisites: ["b2"] },
      { id: "b7", title: "GROUP BY & HAVING", topicSlug: "group-by", estMinutes: 15, summary: "Per-group metrics; filtering groups.", prerequisites: ["b6"] },
      { id: "b8", title: "CASE expressions", topicSlug: "case", estMinutes: 10, summary: "If/else logic and pivots.", prerequisites: ["b6"] },
    ],
  },
  {
    level: "Intermediate",
    tagline: "Combine tables like a professional",
    outcome: "You can answer real business questions across multiple tables.",
    nodes: [
      { id: "i1", title: "JOINs (all types)", topicSlug: "joins", estMinutes: 25, summary: "INNER/LEFT/FULL, anti-joins, self-joins.", prerequisites: ["b7"] },
      { id: "i2", title: "UNION & set ops", topicSlug: "union", estMinutes: 10, summary: "Stacking result sets.", prerequisites: ["i1"] },
      { id: "i3", title: "Subqueries", topicSlug: "subqueries", estMinutes: 15, summary: "Scalar, correlated, derived tables.", prerequisites: ["i1"] },
      { id: "i4", title: "EXISTS & anti-joins", topicSlug: "exists", estMinutes: 10, summary: "Semi/anti-join patterns; the NOT IN trap.", prerequisites: ["i3"] },
      { id: "i5", title: "CTEs", topicSlug: "ctes", estMinutes: 15, summary: "Readable multi-step pipelines.", prerequisites: ["i3"] },
      { id: "i6", title: "Views", topicSlug: "views", estMinutes: 10, summary: "Saved queries as virtual tables.", prerequisites: ["i5"] },
      { id: "i7", title: "Constraints & keys", topicSlug: "constraints", estMinutes: 15, summary: "PK, FK, UNIQUE, CHECK.", prerequisites: ["i1"] },
      { id: "i8", title: "Normalization", topicSlug: "normalization", estMinutes: 20, summary: "1NF→3NF and when to denormalize.", prerequisites: ["i7"] },
      { id: "i9", title: "ER modeling", topicSlug: "er-design", estMinutes: 18, summary: "Entities, cardinality, junction tables.", prerequisites: ["i7"] },
    ],
  },
  {
    level: "Advanced",
    tagline: "Analytics-grade SQL",
    outcome: "You can write the queries that power dashboards and pass FAANG screens.",
    nodes: [
      { id: "a1", title: "Window functions", topicSlug: "window-functions", estMinutes: 30, summary: "Ranking, running totals, LAG/LEAD, frames.", prerequisites: ["i5"] },
      { id: "a2", title: "Recursive CTEs", topicSlug: "recursive-cte", estMinutes: 20, summary: "Hierarchies, graphs, date series.", prerequisites: ["i5"] },
      { id: "a3", title: "Indexes", topicSlug: "indexes", estMinutes: 25, summary: "B-trees, composite rules, covering indexes.", prerequisites: ["i1"] },
      { id: "a4", title: "Transactions & ACID", topicSlug: "transactions", estMinutes: 20, summary: "Atomic units, commit/rollback.", prerequisites: ["i7"] },
      { id: "a5", title: "JSON in SQL", topicSlug: "json", estMinutes: 15, summary: "Semi-structured columns, extraction, indexing.", prerequisites: ["i1"] },
      { id: "a6", title: "Stored procedures & triggers", topicSlug: "stored-procedures", estMinutes: 20, summary: "DB-side programs and event hooks.", prerequisites: ["a4"] },
      { id: "a7", title: "Materialized views", topicSlug: "materialized-views", estMinutes: 10, summary: "Precomputed results, refresh tradeoffs.", prerequisites: ["i6", "a3"] },
    ],
  },
  {
    level: "Expert",
    tagline: "Performance & architecture",
    outcome: "You can diagnose slow systems and design data platforms.",
    nodes: [
      { id: "e1", title: "Execution plans", topicSlug: "execution-plans", estMinutes: 25, summary: "EXPLAIN, scans vs seeks, join algorithms.", prerequisites: ["a3"] },
      { id: "e2", title: "Query optimization", topicSlug: "optimization", estMinutes: 30, summary: "Sargability, rewrites, the full checklist.", prerequisites: ["e1"] },
      { id: "e3", title: "Isolation levels & locks", topicSlug: "isolation-levels", estMinutes: 25, summary: "Anomalies, MVCC, deadlocks.", prerequisites: ["a4"] },
      { id: "e4", title: "OLTP vs OLAP", topicSlug: "oltp-olap", estMinutes: 12, summary: "Row vs column stores, workload shapes.", prerequisites: ["a3"] },
      { id: "e5", title: "Star & snowflake schemas", topicSlug: "star-snowflake", estMinutes: 15, summary: "Facts, dimensions, grain, SCDs.", prerequisites: ["e4", "i8"] },
    ],
  },
];

export const ALL_ROADMAP_NODES = ROADMAP.flatMap((s) => s.nodes);
