export interface CheatEntry {
  id: string;
  title: string;
  sql: string;
  note: string;
  useCase: string;
}

export interface CheatSection {
  id: string;
  title: string;
  color: string; // tailwind-ish tone key used by the page
  entries: CheatEntry[];
}

export const CHEATSHEETS: CheatSection[] = [
  {
    id: "querying",
    title: "Querying Basics",
    color: "brand",
    entries: [
      { id: "q1", title: "Select & filter", sql: "SELECT name, city FROM customers\nWHERE country = 'India'\nORDER BY name\nLIMIT 10;", note: "Project → filter → sort → cap.", useCase: "The skeleton of 90% of ad-hoc questions." },
      { id: "q2", title: "Pattern match", sql: "SELECT * FROM products\nWHERE product_name LIKE 'Desk%';   -- starts with\n-- '%Desk'  ends with  |  '%Desk%'  contains", note: "% = any chars, _ = one char. Prefix patterns can use indexes.", useCase: "Search boxes, quick data exploration." },
      { id: "q3", title: "Ranges & sets", sql: "WHERE price BETWEEN 30 AND 100      -- inclusive!\nWHERE country IN ('India','Japan')\nWHERE order_date >= '2026-06-01'\n  AND order_date <  '2026-07-01'    -- safe date range", note: "Half-open date ranges avoid the midnight-timestamp bug.", useCase: "Monthly reports, price bands, region filters." },
      { id: "q4", title: "NULL handling", sql: "WHERE manager_id IS NULL            -- never = NULL\nSELECT COALESCE(discount, 0) ...\nSELECT amount / NULLIF(qty, 0) ...  -- ÷0 guard", note: "NULL = NULL is UNKNOWN. IS NULL / COALESCE / NULLIF are the toolkit.", useCase: "Every dataset has NULLs; these prevent silent wrong answers." },
      { id: "q5", title: "Dedupe", sql: "SELECT DISTINCT country FROM customers;\nSELECT COUNT(DISTINCT customer_id) FROM orders;", note: "DISTINCT applies to the whole selected row.", useCase: "Unique counts, deduped exports." },
    ],
  },
  {
    id: "aggregation",
    title: "Aggregation",
    color: "violet",
    entries: [
      { id: "a1", title: "Group & measure", sql: "SELECT category,\n       COUNT(*)              AS n,\n       ROUND(AVG(price), 2)  AS avg_price,\n       SUM(stock)            AS units\nFROM products\nGROUP BY category;", note: "Every non-aggregated SELECT column must be in GROUP BY.", useCase: "Revenue by region, signups by week — the metric pattern." },
      { id: "a2", title: "Filter groups (HAVING)", sql: "SELECT customer_id, SUM(total_amount) AS spent\nFROM orders\nGROUP BY customer_id\nHAVING SUM(total_amount) > 500;", note: "WHERE filters rows before grouping; HAVING filters groups after.", useCase: "Repeat customers, products above a sales threshold." },
      { id: "a3", title: "Conditional aggregation (pivot)", sql: "SELECT\n  COUNT(CASE WHEN status='delivered' THEN 1 END) AS delivered,\n  COUNT(CASE WHEN status='pending'   THEN 1 END) AS pending,\n  COUNT(CASE WHEN status='cancelled' THEN 1 END) AS cancelled\nFROM orders;", note: "CASE inside an aggregate pivots categories into columns in one pass.", useCase: "Status breakdowns, A/B arm comparisons, funnel columns." },
      { id: "a4", title: "Time-series bucket", sql: "SELECT strftime('%Y-%m', order_date) AS month,   -- DATE_TRUNC in PG\n       SUM(total_amount) AS revenue\nFROM orders\nGROUP BY month\nORDER BY month;", note: "Truncate the date, group by it. DATE_TRUNC('month', d) in Postgres.", useCase: "Monthly revenue, weekly actives — every trend chart." },
    ],
  },
  {
    id: "joins",
    title: "Joins",
    color: "cyan",
    entries: [
      { id: "j1", title: "Inner join", sql: "SELECT o.order_id, c.name, o.total_amount\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id;", note: "Only rows with a match on both sides survive.", useCase: "Enriching facts (orders) with context (customer names)." },
      { id: "j2", title: "Left join + anti-join", sql: "-- keep ALL customers, orders where they exist\nSELECT c.name, o.order_id\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id;\n\n-- customers with NO orders\nSELECT c.name FROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id\nWHERE o.order_id IS NULL;", note: "IS NULL on the right side's key = anti-join.", useCase: "Churn lists, never-purchased products, missing-data audits." },
      { id: "j3", title: "The LEFT JOIN trap", sql: "-- WRONG: WHERE on right table → becomes INNER JOIN\n... LEFT JOIN orders o ON o.customer_id = c.customer_id\nWHERE o.status = 'delivered';\n\n-- RIGHT: filter inside ON\n... LEFT JOIN orders o ON o.customer_id = c.customer_id\n                      AND o.status = 'delivered';", note: "Right-table filters go in ON to preserve unmatched left rows.", useCase: "The single most common join bug in analytics code." },
      { id: "j4", title: "Self join", sql: "SELECT e.name AS employee, m.name AS manager\nFROM employees e\nLEFT JOIN employees m ON m.employee_id = e.manager_id;", note: "Alias the same table twice.", useCase: "Org charts, referral chains, comparing rows within one table." },
    ],
  },
  {
    id: "advanced",
    title: "CTEs & Window Functions",
    color: "amber",
    entries: [
      { id: "w1", title: "CTE pipeline", sql: "WITH monthly AS (\n  SELECT strftime('%Y-%m', order_date) AS month,\n         SUM(total_amount) AS revenue\n  FROM orders GROUP BY month\n)\nSELECT month, revenue,\n       revenue - LAG(revenue) OVER (ORDER BY month) AS mom_change\nFROM monthly;", note: "Name each step; chain CTEs with commas.", useCase: "Readable multi-step analyses your team can maintain." },
      { id: "w2", title: "Top-N per group", sql: "WITH ranked AS (\n  SELECT name, department, salary,\n    ROW_NUMBER() OVER (PARTITION BY department\n                       ORDER BY salary DESC) AS rn\n  FROM employees\n)\nSELECT * FROM ranked WHERE rn <= 2;", note: "THE interview pattern. Window functions can't go in WHERE — wrap in a CTE.", useCase: "Top 2 earners per dept, best seller per category, latest event per user." },
      { id: "w3", title: "Running total", sql: "SELECT order_date, total_amount,\n  SUM(total_amount) OVER (ORDER BY order_date) AS running_total\nFROM orders;", note: "ORDER BY inside OVER makes it cumulative.", useCase: "Cumulative revenue, burn-down charts, pacing vs target." },
      { id: "w4", title: "Dedupe keep-latest", sql: "WITH numbered AS (\n  SELECT *, ROW_NUMBER() OVER (\n    PARTITION BY email ORDER BY signup_date DESC) AS rn\n  FROM raw_signups\n)\nSELECT * FROM numbered WHERE rn = 1;", note: "Partition by the duplicate key, order by recency, keep rn=1.", useCase: "Cleaning duplicate user records, latest snapshot per entity." },
      { id: "w5", title: "Recursive hierarchy", sql: "WITH RECURSIVE org AS (\n  SELECT employee_id, name, 1 AS depth\n  FROM employees WHERE manager_id IS NULL\n  UNION ALL\n  SELECT e.employee_id, e.name, org.depth + 1\n  FROM employees e JOIN org ON e.manager_id = org.employee_id\n)\nSELECT * FROM org;", note: "Anchor UNION ALL recursive member; guard depth on cyclic data.", useCase: "Org charts, category trees, bill-of-materials." },
    ],
  },
  {
    id: "dml-ddl",
    title: "Writing Data (DML & DDL)",
    color: "green",
    entries: [
      { id: "d1", title: "Insert / Update / Delete", sql: "INSERT INTO products VALUES (11, 'Webcam', 'Electronics', 79.0, 60);\n\nUPDATE products SET price = price * 0.9\nWHERE category = 'Stationery';\n\nDELETE FROM orders WHERE status = 'cancelled';", note: "Always write the WHERE before the SET/DELETE keyword hits Enter.", useCase: "The three write verbs. Test on a SELECT first." },
      { id: "d2", title: "Create table with constraints", sql: "CREATE TABLE reviews (\n  review_id   INTEGER PRIMARY KEY,\n  product_id  INTEGER NOT NULL REFERENCES products(product_id),\n  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),\n  body        TEXT,\n  created_at  TEXT DEFAULT CURRENT_TIMESTAMP\n);", note: "Constraints are the last line of defense against bad data.", useCase: "Every new feature that stores something." },
      { id: "d3", title: "Upsert", sql: "-- SQLite / PostgreSQL\nINSERT INTO settings (key, value) VALUES ('theme','dark')\nON CONFLICT (key) DO UPDATE SET value = excluded.value;", note: "MySQL: ON DUPLICATE KEY UPDATE. Needs a unique constraint to conflict on.", useCase: "Idempotent writes: preferences, counters, sync jobs." },
      { id: "d4", title: "Transaction", sql: "BEGIN TRANSACTION;\n  UPDATE accounts SET balance = balance - 100 WHERE id = 1;\n  UPDATE accounts SET balance = balance + 100 WHERE id = 2;\nCOMMIT;   -- or ROLLBACK;", note: "All-or-nothing. Keep them short; never hold across user think-time.", useCase: "Money moves, inventory, anything multi-step." },
    ],
  },
  {
    id: "performance",
    title: "Performance",
    color: "red",
    entries: [
      { id: "p1", title: "Index the right things", sql: "CREATE INDEX idx_orders_customer ON orders (customer_id);\nCREATE INDEX idx_orders_cust_date ON orders (customer_id, order_date);\n-- composite serves: WHERE customer_id=? [AND order_date>?]\n-- but NOT: WHERE order_date=? alone (leftmost prefix rule)", note: "Index FKs and frequent WHERE columns. Every index taxes writes.", useCase: "The highest-leverage performance tool that exists." },
      { id: "p2", title: "Sargable predicates", sql: "-- BAD: function on column disables index\nWHERE strftime('%Y', order_date) = '2026'\n-- GOOD: range predicate keeps index usable\nWHERE order_date >= '2026-01-01'\n  AND order_date <  '2027-01-01'", note: "Keep the column bare; move computation to the constant side.", useCase: "The most common fix in slow-query reviews." },
      { id: "p3", title: "Read the plan", sql: "EXPLAIN QUERY PLAN          -- SQLite\nSELECT * FROM orders WHERE customer_id = 4;\n-- PG: EXPLAIN ANALYZE ...   MySQL: EXPLAIN FORMAT=TREE ...", note: "SCAN = full table read; SEARCH ... USING INDEX = what you want.", useCase: "Step one of every slowness investigation." },
      { id: "p4", title: "Keyset pagination", sql: "-- Slow at depth:  ... LIMIT 20 OFFSET 100000\n-- Fast at any depth:\nSELECT * FROM orders\nWHERE order_id > :last_seen_id\nORDER BY order_id\nLIMIT 20;", note: "OFFSET reads and discards skipped rows; keyset seeks directly.", useCase: "Infinite scroll, API pagination." },
      { id: "p5", title: "EXISTS over IN (and the NOT IN trap)", sql: "-- NULL-safe anti-join\nSELECT p.* FROM products p\nWHERE NOT EXISTS (\n  SELECT 1 FROM order_items oi WHERE oi.product_id = p.product_id\n);\n-- NOT IN returns ZERO rows if the subquery yields any NULL!", note: "EXISTS short-circuits and handles NULLs sanely.", useCase: "Never-sold products, users without events." },
    ],
  },
];
