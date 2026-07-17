import type { Topic } from "./topic-types";

/** Advanced & expert SQL topics. */
export const ADVANCED_TOPICS: Topic[] = [
  {
    slug: "ctes",
    title: "CTEs (WITH)",
    category: "Advanced Queries",
    level: "Intermediate",
    estMinutes: 15,
    definition: "A Common Table Expression names a subquery so it can be referenced like a table, making complex queries readable.",
    simple:
      "Instead of nesting queries inside queries, you name each step: 'first compute monthly revenue, call it monthly; then rank it'. Reads top-to-bottom like a recipe.",
    technical:
      "Defined with WITH name AS (...). Multiple CTEs chain with commas and can reference earlier ones. Postgres 12+/modern engines usually inline CTEs into the main plan (no materialization) unless told otherwise (MATERIALIZED keyword). CTEs also enable recursion.",
    syntax:
      "WITH step1 AS (\n  SELECT ...\n), step2 AS (\n  SELECT ... FROM step1\n)\nSELECT * FROM step2;",
    examples: [
      {
        sql: "WITH customer_totals AS (\n  SELECT customer_id, SUM(total_amount) AS spent\n  FROM orders\n  WHERE status != 'cancelled'\n  GROUP BY customer_id\n)\nSELECT c.name, ct.spent\nFROM customer_totals ct\nJOIN customers c ON c.customer_id = ct.customer_id\nORDER BY ct.spent DESC\nLIMIT 3;",
        output: {
          columns: ["name", "spent"],
          rows: [
            ["Diya Patel", 1137.0],
            ["Aarav Shah", 895.98],
            ["Bella Chen", 837.0],
          ],
        },
      },
    ],
    businessUseCase:
      "Multi-step funnel analyses, cohort computations, and any query a teammate must be able to read and modify six months later.",
    interviewAngle:
      "CTE vs subquery (mostly readability; recursion is CTE-only) and whether CTEs are optimization fences in your dialect.",
    performanceTips: [
      "A CTE referenced twice may be computed twice if inlined — materialize (or use a temp table) when it's expensive and reused.",
      "Old PostgreSQL (<12) always materialized CTEs — an optimization fence to be aware of in legacy systems.",
    ],
    commonMistakes: [
      "Assuming a CTE result is cached across references.",
      "Chaining ten CTEs when two would do — name steps that mean something.",
    ],
    quiz: [
      {
        q: "Which can CTEs do that plain subqueries cannot?",
        options: ["Aggregate", "Recursion", "Join", "Filter"],
        answer: 1,
        why: "WITH RECURSIVE has no plain-subquery equivalent.",
      },
    ],
    practice: [
      "CTE of revenue per product, then select products above the average of that CTE.",
    ],
    related: ["recursive-cte", "subqueries", "window-functions", "views"],
  },
  {
    slug: "recursive-cte",
    title: "Recursive CTEs",
    category: "Advanced Queries",
    level: "Advanced",
    estMinutes: 20,
    definition: "A recursive CTE repeatedly executes a query that references itself — for hierarchies, graphs, and sequences.",
    simple:
      "Start with a seed row (the CEO), then repeatedly ask 'who reports to the rows I have so far?' until no new rows appear. That walks an entire org chart of any depth.",
    technical:
      "Anchor member UNION ALL recursive member; the recursive part references the CTE name and runs iteratively on the previous iteration's rows until it yields none. Track depth with a counter column; guard against cycles (path arrays or dialect cycle detection).",
    syntax:
      "WITH RECURSIVE tree AS (\n  SELECT ..., 1 AS depth FROM t WHERE parent_id IS NULL  -- anchor\n  UNION ALL\n  SELECT ..., tree.depth + 1 FROM t JOIN tree ON t.parent_id = tree.id  -- recursive\n)\nSELECT * FROM tree;",
    examples: [
      {
        sql: "WITH RECURSIVE org AS (\n  SELECT employee_id, name, manager_id, 1 AS depth\n  FROM employees WHERE manager_id IS NULL\n  UNION ALL\n  SELECT e.employee_id, e.name, e.manager_id, org.depth + 1\n  FROM employees e\n  JOIN org ON e.manager_id = org.employee_id\n)\nSELECT depth, name FROM org ORDER BY depth, name;",
        note: "Walks the reporting chain from the top; depth = level in the org chart.",
      },
      {
        sql: "-- Generate a date series (calendar table on the fly)\nWITH RECURSIVE dates(d) AS (\n  SELECT '2026-07-01'\n  UNION ALL\n  SELECT date(d, '+1 day') FROM dates WHERE d < '2026-07-10'\n)\nSELECT d FROM dates;",
        note: "Handy for filling gaps in time-series reports (SQLite date syntax shown).",
      },
    ],
    businessUseCase:
      "Org charts, category trees, bill-of-materials explosions, referral chains, filling missing dates in reports.",
    interviewAngle:
      "Senior-level differentiator. Be ready to explain anchor vs recursive member and how to prevent infinite loops.",
    performanceTips: [
      "Bound the recursion (depth column + WHERE depth < n) as a safety net.",
      "Index parent_id — each iteration joins on it.",
    ],
    commonMistakes: [
      "No cycle guard on graph-like data → infinite loop.",
      "Using UNION instead of UNION ALL (needless dedup per iteration; can also change semantics).",
    ],
    quiz: [
      {
        q: "The two parts of a recursive CTE are:",
        options: [
          "SELECT and INSERT",
          "Anchor member and recursive member",
          "Base table and index",
          "Inner and outer query",
        ],
        answer: 1,
        why: "The anchor seeds the result; the recursive member extends it until fixpoint.",
      },
    ],
    practice: ["List every employee under Priya Nair with their depth in the chain."],
    related: ["ctes", "joins"],
  },
  {
    slug: "window-functions",
    title: "Window Functions",
    category: "Advanced Queries",
    level: "Advanced",
    estMinutes: 30,
    definition: "Window functions compute values across a set of related rows (a 'window') while keeping every row — no collapsing like GROUP BY.",
    simple:
      "GROUP BY squashes each department into one row. A window function keeps every employee row and adds a column like 'rank within department' or 'department average' alongside it.",
    technical:
      "OVER (PARTITION BY ... ORDER BY ... [frame]) defines the window. PARTITION BY splits rows into groups; ORDER BY sequences them (required for ranking/offset functions); the frame clause (ROWS BETWEEN ...) bounds running calculations. Windows are evaluated after WHERE/GROUP BY/HAVING — filter on them via a wrapping CTE (or QUALIFY where supported).",
    syntax:
      "SELECT col,\n  FUNC(...) OVER (\n    PARTITION BY group_col\n    ORDER BY sort_col\n    [ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW]\n  ) AS win_val\nFROM table;",
    examples: [
      {
        sql: "SELECT name, department, salary,\n  RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank\nFROM employees;",
        output: {
          columns: ["name", "department", "salary", "dept_rank"],
          rows: [
            ["Priya Nair", "Engineering", 185000, 1],
            ["Yuki Sato", "Engineering", 151000, 2],
            ["Rohan Mehta", "Engineering", 142000, 3],
            ["Wendy Zhao", "Marketing", 105000, 1],
          ],
        },
      },
      {
        sql: "-- Running revenue total by date\nSELECT order_date, total_amount,\n  SUM(total_amount) OVER (ORDER BY order_date) AS running_total\nFROM orders;",
        note: "Default frame with ORDER BY = from the start up to the current row.",
      },
      {
        sql: "-- Top earner per department (filter a window via CTE)\nWITH ranked AS (\n  SELECT name, department, salary,\n    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn\n  FROM employees\n)\nSELECT name, department, salary FROM ranked WHERE rn = 1;",
        note: "The single most useful SQL interview pattern: top-N per group.",
      },
    ],
    businessUseCase:
      "Top-N per group, running totals, month-over-month growth (LAG), moving averages, percentile bands, sessionization.",
    interviewAngle:
      "ROW_NUMBER vs RANK vs DENSE_RANK on ties is the #1 question. Second: 'second-highest salary'. Third: LAG for period-over-period change. Master 'top-N per group' via CTE + ROW_NUMBER.",
    performanceTips: [
      "Each distinct OVER clause may add a sort — align PARTITION/ORDER across functions when possible.",
      "An index matching (partition, order) columns can eliminate the sort.",
      "Don't compute windows over unfiltered tables — reduce rows first in a CTE.",
    ],
    commonMistakes: [
      "Trying to filter a window function in WHERE (not allowed — wrap in a CTE).",
      "Confusing RANK (gaps after ties: 1,1,3) with DENSE_RANK (1,1,2) and ROW_NUMBER (arbitrary tiebreak: 1,2,3).",
      "Forgetting ORDER BY inside OVER for running totals — you get the whole-partition total on every row.",
    ],
    quiz: [
      {
        q: "Salaries 90k, 90k, 80k — RANK() gives:",
        options: ["1,1,2", "1,1,3", "1,2,3", "2,2,3"],
        answer: 1,
        why: "RANK leaves a gap after ties; DENSE_RANK would give 1,1,2.",
      },
      {
        q: "How do you filter rows on a window function's result?",
        options: [
          "WHERE rn = 1 directly",
          "HAVING rn = 1",
          "Wrap the query in a CTE/subquery, filter outside",
          "You can't",
        ],
        answer: 2,
        why: "Window functions are computed after WHERE; an outer query (or QUALIFY) is needed.",
      },
    ],
    practice: [
      "Each order with the customer's cumulative spend to date (running SUM partitioned by customer).",
      "Month-over-month revenue change using LAG.",
    ],
    related: ["group-by", "ctes", "aggregate-functions", "order-by"],
  },
  {
    slug: "views",
    title: "Views",
    category: "Database Objects",
    level: "Intermediate",
    estMinutes: 10,
    definition: "A view is a saved query that behaves like a virtual table — no data stored, just the definition.",
    simple:
      "Wrap your gnarly 40-line revenue query in CREATE VIEW revenue_report AS ... — now anyone can SELECT * FROM revenue_report without knowing the internals.",
    technical:
      "Views expand into the underlying query at execution time (like a macro). They provide abstraction, column-level security, and a stable interface over changing schemas. Simple views may be updatable; complex ones (joins, aggregates) generally aren't.",
    syntax: "CREATE VIEW view_name AS\nSELECT ...;\n\nSELECT * FROM view_name;",
    examples: [
      {
        sql: "CREATE VIEW customer_revenue AS\nSELECT c.customer_id, c.name, c.country,\n       COALESCE(SUM(o.total_amount), 0) AS lifetime_value\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id\n  AND o.status != 'cancelled'\nGROUP BY c.customer_id;\n\nSELECT * FROM customer_revenue ORDER BY lifetime_value DESC LIMIT 3;",
        note: "Try it in the playground — views work in SQLite too.",
      },
    ],
    businessUseCase:
      "Canonical metric definitions (one blessed 'revenue' view instead of five conflicting queries), hiding sensitive columns, simplifying BI-tool access.",
    interviewAngle:
      "View vs materialized view vs table is the standard question: view = stored query (always fresh, computed each time); materialized view = stored results (fast, can be stale).",
    performanceTips: [
      "A view is not faster than its query — it IS its query.",
      "Stacking views on views hides complexity from humans and sometimes from optimizers; keep nesting shallow.",
    ],
    commonMistakes: [
      "Expecting views to cache results.",
      "Building view-on-view towers nobody can debug.",
    ],
    quiz: [
      {
        q: "A regular (non-materialized) view stores:",
        options: ["The result rows", "Only the query definition", "An index", "A table copy"],
        answer: 1,
        why: "It's a named query, expanded at execution time.",
      },
    ],
    practice: ["Create a view of delivered orders only, then query it."],
    related: ["materialized-views", "ctes", "select"],
  },
  {
    slug: "materialized-views",
    title: "Materialized Views",
    category: "Database Objects",
    level: "Advanced",
    estMinutes: 10,
    definition: "A materialized view physically stores the result of its query and must be refreshed to stay current.",
    simple:
      "It's a cached report table: the expensive aggregation runs once (or on a schedule), and readers get instant answers — at the cost of possible staleness.",
    technical:
      "Postgres: REFRESH MATERIALIZED VIEW [CONCURRENTLY]. Some engines support incremental refresh; others rebuild fully. You can index a materialized view like a table. It trades freshness and storage for read speed — the same tradeoff as any cache.",
    syntax:
      "CREATE MATERIALIZED VIEW mv AS SELECT ...;\nREFRESH MATERIALIZED VIEW mv;",
    examples: [
      {
        sql: "CREATE MATERIALIZED VIEW daily_revenue AS\nSELECT order_date, SUM(total_amount) AS revenue\nFROM orders GROUP BY order_date;\n-- later, on a schedule:\nREFRESH MATERIALIZED VIEW daily_revenue;",
        note: "PostgreSQL syntax; SQLite doesn't support materialized views.",
      },
    ],
    businessUseCase:
      "Dashboard tiles hit thousands of times an hour, pre-joined denormalized reads, heavy aggregations over slowly-changing data.",
    interviewAngle:
      "Know the freshness/speed tradeoff and refresh strategies (scheduled, on-write, incremental).",
    performanceTips: [
      "Index the materialized view for its read patterns.",
      "REFRESH CONCURRENTLY (Postgres) avoids blocking readers but needs a unique index.",
    ],
    commonMistakes: [
      "Serving stale data without surfacing 'last refreshed' anywhere.",
      "Refreshing an expensive MV far more often than the data changes.",
    ],
    quiz: [
      {
        q: "The core tradeoff of a materialized view is:",
        options: [
          "Security vs speed",
          "Read speed vs data freshness",
          "Storage vs correctness",
          "None",
        ],
        answer: 1,
        why: "Precomputed results are fast to read but only as fresh as the last refresh.",
      },
    ],
    practice: ["Design (on paper) an MV for 'revenue by country by month' and a refresh policy."],
    related: ["views", "indexes", "star-snowflake"],
  },
  {
    slug: "indexes",
    title: "Indexes",
    category: "Performance",
    level: "Advanced",
    estMinutes: 25,
    definition: "An index is a sorted auxiliary structure (usually a B-tree) that lets the engine find rows without scanning the whole table.",
    simple:
      "Like a book's index: instead of reading 500 pages to find 'JOIN', you look it up alphabetically and jump to page 214. Databases do the same for WHERE and JOIN columns.",
    technical:
      "B-tree indexes support equality and range predicates and maintain sorted order (helping ORDER BY too). Every index slows writes (it must be maintained) and costs storage. Composite indexes follow the leftmost-prefix rule. Covering indexes satisfy a query entirely from the index. Other types: hash, GIN/GiST (Postgres full-text/JSONB), bitmap (warehouses).",
    syntax:
      "CREATE INDEX idx_orders_customer ON orders (customer_id);\nCREATE INDEX idx_orders_cust_date ON orders (customer_id, order_date);\nCREATE UNIQUE INDEX idx_email ON customers (email);",
    examples: [
      {
        sql: "CREATE INDEX idx_orders_customer ON orders (customer_id);\n-- Now this hits the index instead of scanning all orders:\nSELECT * FROM orders WHERE customer_id = 4;\n-- Inspect the plan:\nEXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 4;",
        note: "Run in the playground — SQLite's EXPLAIN QUERY PLAN will show the index being used.",
      },
    ],
    businessUseCase:
      "The difference between a 3-second page and a 30-millisecond page. FK columns, login lookups (email), and time-range scans are the classic candidates.",
    interviewAngle:
      "Expect: how B-trees work at a high level, composite index column order (leftmost prefix), why indexes hurt writes, covering indexes, and why the optimizer might ignore an index (low selectivity, functions on the column, type mismatch).",
    performanceTips: [
      "Index FK columns used in joins and columns in frequent WHERE clauses.",
      "Composite index (a, b) serves WHERE a=… and WHERE a=… AND b=…, but NOT WHERE b=… alone.",
      "Put equality columns before range columns in composite indexes.",
      "Don't index low-cardinality columns (e.g. a status with 3 values) in isolation on OLTP tables.",
      "Drop unused indexes — they tax every INSERT/UPDATE/DELETE.",
    ],
    commonMistakes: [
      "Wrapping an indexed column in a function (LOWER(email) = ...) and losing the index — use an expression index instead.",
      "Indexing everything 'just in case' and wondering why writes crawl.",
      "Expecting an index to help a query that reads 60% of the table (a scan is cheaper).",
    ],
    quiz: [
      {
        q: "Composite index on (customer_id, order_date). Which query can NOT use it efficiently?",
        options: [
          "WHERE customer_id = 5",
          "WHERE customer_id = 5 AND order_date > '2026-01-01'",
          "WHERE order_date > '2026-01-01'",
          "All can",
        ],
        answer: 2,
        why: "Leftmost-prefix rule: without customer_id, the index's sort order doesn't help order_date alone.",
      },
      {
        q: "Adding an index always:",
        options: [
          "Speeds up all queries",
          "Slows down writes to that table",
          "Reduces storage",
          "Locks the table forever",
        ],
        answer: 1,
        why: "Each write must also update every index on the table.",
      },
    ],
    practice: [
      "Create an index on order_items(product_id) and compare EXPLAIN QUERY PLAN before/after.",
    ],
    related: ["execution-plans", "where", "joins", "optimization"],
  },
  {
    slug: "constraints",
    title: "Constraints & Keys",
    category: "Database Objects",
    level: "Intermediate",
    estMinutes: 15,
    definition: "Constraints are rules the database enforces on data: PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, CHECK, DEFAULT.",
    simple:
      "Guardrails: a primary key means every row has a unique ID; a foreign key means an order can't point to a customer that doesn't exist; NOT NULL means the field can't be left blank.",
    technical:
      "PRIMARY KEY = UNIQUE + NOT NULL, one per table, usually backed by an index (clustered in some engines). FOREIGN KEY enforces referential integrity with configurable ON DELETE/UPDATE actions (CASCADE, SET NULL, RESTRICT). CHECK validates arbitrary boolean expressions. Constraints are the last line of defense — application validation can be bypassed; the database cannot.",
    syntax:
      "CREATE TABLE orders (\n  order_id INTEGER PRIMARY KEY,\n  customer_id INTEGER NOT NULL REFERENCES customers(customer_id)\n    ON DELETE RESTRICT,\n  total_amount REAL CHECK (total_amount >= 0),\n  status TEXT DEFAULT 'pending'\n);",
    examples: [
      {
        sql: "CREATE TABLE test_constraints (\n  id INTEGER PRIMARY KEY,\n  email TEXT UNIQUE NOT NULL,\n  age INTEGER CHECK (age >= 18)\n);\nINSERT INTO test_constraints VALUES (1, 'a@b.com', 25);\n-- This next line fails the CHECK constraint:\nINSERT INTO test_constraints VALUES (2, 'c@d.com', 15);",
        note: "Run it — the playground will show the constraint violation.",
      },
    ],
    businessUseCase:
      "Preventing orphan orders, duplicate accounts, negative prices, and the 3 a.m. data-corruption incident.",
    interviewAngle:
      "PK vs UNIQUE (PK also implies NOT NULL, one per table), FK delete actions, and why DB-level constraints matter even with app validation.",
    performanceTips: [
      "FK checks cost a lookup per write — index the referencing column.",
      "Bulk loads sometimes disable/re-enable constraints; understand the integrity risk window.",
    ],
    commonMistakes: [
      "No FK indexes → slow deletes on the parent table.",
      "Using CASCADE deletes casually and wiping child data unintentionally.",
      "Relying only on application-level validation.",
    ],
    quiz: [
      {
        q: "How many PRIMARY KEYs can a table have?",
        options: ["One", "Two", "One per column", "Unlimited"],
        answer: 0,
        why: "Exactly one PK (which may span multiple columns — a composite key).",
      },
    ],
    practice: ["Create a table with a composite primary key and a CHECK constraint; test violations."],
    related: ["normalization", "indexes", "transactions"],
  },
  {
    slug: "normalization",
    title: "Normalization",
    category: "Database Design",
    level: "Intermediate",
    estMinutes: 20,
    definition: "Normalization organizes tables to remove redundancy, so each fact is stored exactly once.",
    simple:
      "If a customer's address is copied onto every order row, updating it means editing 50 rows (and missing one = inconsistent data). Normalization says: store the address once in customers, reference it by ID.",
    technical:
      "1NF: atomic values, no repeating groups. 2NF: no partial dependency on part of a composite key. 3NF: no transitive dependencies (non-key → non-key). Most OLTP schemas target 3NF. Denormalization deliberately reintroduces redundancy for read speed — standard in analytics (star schemas).",
    syntax: "-- Not a syntax feature; a design discipline.\n-- Unnormalized: orders(cust_name, cust_email, cust_city, item1, item2...)\n-- Normalized: customers ←FK— orders ←FK— order_items —FK→ products",
    examples: [
      {
        sql: "-- Our playground schema IS a 3NF design:\n-- customers(customer_id PK, name, email, city, country)\n-- orders(order_id PK, customer_id FK, order_date, status, total)\n-- order_items(item_id PK, order_id FK, product_id FK, qty, price)\nSELECT c.name, o.order_id, p.product_name, oi.quantity\nFROM customers c\nJOIN orders o ON o.customer_id = c.customer_id\nJOIN order_items oi ON oi.order_id = o.order_id\nJOIN products p ON p.product_id = oi.product_id\nLIMIT 5;",
        note: "Normalization is why we join — each fact lives in one place.",
      },
    ],
    businessUseCase:
      "OLTP systems (checkout, banking, CRM) normalize for write correctness; warehouses denormalize the same data for read speed.",
    interviewAngle:
      "Explain 1NF→3NF with a concrete example, and when you would deliberately denormalize (reporting, caching, read-heavy paths).",
    performanceTips: [
      "Normalization optimizes writes and consistency; heavy read paths may justify denormalized copies (with a sync strategy).",
      "Don't over-normalize lookup data into 6-table join chains for marginal purity.",
    ],
    commonMistakes: [
      "Storing comma-separated lists in a column (violates 1NF; kills queryability).",
      "Denormalizing without any mechanism to keep copies consistent.",
    ],
    quiz: [
      {
        q: "A products table where supplier_phone depends on supplier_name (a non-key) violates:",
        options: ["1NF", "2NF", "3NF", "Nothing"],
        answer: 2,
        why: "That's a transitive dependency: key → supplier_name → supplier_phone. 3NF forbids it.",
      },
    ],
    practice: ["Take a flat orders spreadsheet (customer + product columns repeated) and sketch its 3NF tables."],
    related: ["constraints", "star-snowflake", "er-design"],
  },
  {
    slug: "transactions",
    title: "Transactions & ACID",
    category: "Reliability",
    level: "Advanced",
    estMinutes: 20,
    definition: "A transaction groups statements into an all-or-nothing unit with ACID guarantees: Atomicity, Consistency, Isolation, Durability.",
    simple:
      "Transferring money = debit one account + credit another. A transaction guarantees both happen or neither does — even if the server dies between them.",
    technical:
      "Atomicity: all statements commit or roll back together (via undo logs). Consistency: constraints hold before and after. Isolation: concurrent transactions don't see each other's partial work (levels: READ UNCOMMITTED → SERIALIZABLE). Durability: committed data survives crashes (write-ahead logging). BEGIN … COMMIT/ROLLBACK delimits the unit.",
    syntax:
      "BEGIN TRANSACTION;\n  UPDATE accounts SET balance = balance - 100 WHERE id = 1;\n  UPDATE accounts SET balance = balance + 100 WHERE id = 2;\nCOMMIT;  -- or ROLLBACK;",
    examples: [
      {
        sql: "BEGIN TRANSACTION;\nUPDATE products SET stock = stock - 1 WHERE product_id = 1;\nINSERT INTO orders VALUES (115, 3, '2026-07-14', 'pending', 89.99);\nCOMMIT;\nSELECT stock FROM products WHERE product_id = 1;",
        note: "Both changes commit together. Try replacing COMMIT with ROLLBACK and re-checking stock.",
      },
    ],
    businessUseCase:
      "Payments, inventory decrements, seat booking, any multi-step write where a half-finished state means corrupted business data.",
    interviewAngle:
      "Define each ACID letter with an example. Follow-ups: isolation anomalies (dirty read, non-repeatable read, phantom) and which isolation level prevents which.",
    performanceTips: [
      "Keep transactions short — long ones hold locks and block others.",
      "Never hold a transaction open across user think-time or network calls.",
    ],
    commonMistakes: [
      "Auto-commit mode assumed off (or on) — know your driver's default.",
      "Catching an error mid-transaction and continuing without ROLLBACK.",
      "Doing external API calls inside a DB transaction.",
    ],
    quiz: [
      {
        q: "Atomicity guarantees:",
        options: [
          "Fast queries",
          "All statements in the transaction succeed or none take effect",
          "No duplicates",
          "Encrypted storage",
        ],
        answer: 1,
        why: "That's the A in ACID — indivisibility of the unit of work.",
      },
    ],
    practice: ["Begin a transaction, delete all orders, verify, then ROLLBACK and verify they're back."],
    related: ["isolation-levels", "constraints"],
  },
  {
    slug: "isolation-levels",
    title: "Isolation Levels & Locks",
    category: "Reliability",
    level: "Expert",
    estMinutes: 25,
    definition: "Isolation levels define what concurrent transactions can see of each other's work, trading correctness against concurrency.",
    simple:
      "Two cashiers selling the last ticket at once: isolation rules decide whether they can both think it's available. Stricter rules = fewer surprises, more waiting.",
    technical:
      "READ UNCOMMITTED allows dirty reads; READ COMMITTED (Postgres default) prevents them; REPEATABLE READ prevents non-repeatable reads (MySQL InnoDB default); SERIALIZABLE prevents phantoms and enforces true serial-equivalent execution. MVCC engines give readers snapshots without blocking writers. Explicit locks: SELECT ... FOR UPDATE; deadlocks are detected and one victim is rolled back.",
    syntax:
      "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;\nBEGIN;\nSELECT * FROM seats WHERE id = 7 FOR UPDATE;\n-- ... decide, update ...\nCOMMIT;",
    examples: [
      {
        sql: "-- Anomaly cheat sheet\n-- dirty read: see uncommitted data          (blocked from READ COMMITTED up)\n-- non-repeatable read: same row changes     (blocked from REPEATABLE READ up)\n-- phantom: new rows match your WHERE        (blocked at SERIALIZABLE)\nSELECT 'see note above' AS anomalies;",
        note: "SQLite is SERIALIZABLE by default (single-writer), so these anomalies don't reproduce in the playground.",
      },
    ],
    businessUseCase:
      "Inventory oversells, double bookings, and balance races are all isolation bugs. Choosing the level is a product decision: strictness vs throughput.",
    interviewAngle:
      "Senior interviews: map each anomaly to the minimum level that prevents it, explain MVCC in one paragraph, and describe a deadlock plus how engines resolve it.",
    performanceTips: [
      "Higher isolation = more blocking/aborts; use SERIALIZABLE surgically, not globally.",
      "Lock rows in a consistent order across code paths to avoid deadlocks.",
      "Prefer short transactions and optimistic retries under MVCC.",
    ],
    commonMistakes: [
      "Assuming the default level is the same across databases (it isn't).",
      "Read-modify-write without FOR UPDATE or a WHERE-guarded update (lost updates).",
    ],
    quiz: [
      {
        q: "A 'phantom read' is prevented only at:",
        options: ["READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE", "READ UNCOMMITTED"],
        answer: 2,
        why: "Phantoms (new rows matching a repeated predicate) require SERIALIZABLE (or index-range locking) to prevent.",
      },
    ],
    practice: ["Write the FOR UPDATE pattern for safely decrementing stock for the last unit of a product."],
    related: ["transactions", "indexes"],
  },
  {
    slug: "stored-procedures",
    title: "Stored Procedures, Functions & Triggers",
    category: "Database Objects",
    level: "Advanced",
    estMinutes: 20,
    definition: "Stored procedures/functions are named programs saved in the database; triggers are procedures that fire automatically on data events.",
    simple:
      "A stored procedure is a saved script you call by name (CALL monthly_close()). A trigger is a tripwire: 'whenever a row is inserted into orders, also write an audit row' — automatic, every time.",
    technical:
      "Procedures (may modify data, called via CALL) vs functions (return a value, usable in SELECT). Written in procedural dialects (PL/pgSQL, T-SQL, PL/SQL). Triggers bind to INSERT/UPDATE/DELETE, BEFORE/AFTER, per-row or per-statement, with access to OLD/NEW row images. Powerful but hidden control flow — use deliberately.",
    syntax:
      "-- PostgreSQL flavor\nCREATE FUNCTION audit_order() RETURNS trigger AS $$\nBEGIN\n  INSERT INTO order_audit VALUES (NEW.order_id, now());\n  RETURN NEW;\nEND; $$ LANGUAGE plpgsql;\n\nCREATE TRIGGER trg_audit AFTER INSERT ON orders\nFOR EACH ROW EXECUTE FUNCTION audit_order();",
    examples: [
      {
        sql: "-- SQLite supports triggers — try this in the playground:\nCREATE TABLE order_audit (order_id INTEGER, logged_at TEXT);\nCREATE TRIGGER trg_audit AFTER INSERT ON orders\nBEGIN\n  INSERT INTO order_audit VALUES (NEW.order_id, datetime('now'));\nEND;\nINSERT INTO orders VALUES (116, 5, '2026-07-14', 'pending', 42.0);\nSELECT * FROM order_audit;",
        note: "The trigger wrote the audit row automatically.",
      },
    ],
    businessUseCase:
      "Audit trails, derived-column maintenance, enforcing cross-table rules, batch jobs living close to the data.",
    interviewAngle:
      "Procedure vs function vs trigger definitions, plus the design debate: business logic in the DB (fast, consistent) vs the app (testable, versionable).",
    performanceTips: [
      "Row-level triggers on bulk loads fire per row — can be brutal; consider statement-level or disabling during loads.",
      "Keep trigger bodies tiny; heavy logic belongs in explicit jobs.",
    ],
    commonMistakes: [
      "Trigger cascades (trigger fires trigger fires trigger…) nobody can trace.",
      "Hiding critical business logic where app developers never look.",
    ],
    quiz: [
      {
        q: "Which fires automatically without being called?",
        options: ["Stored procedure", "Function", "Trigger", "View"],
        answer: 2,
        why: "Triggers bind to data events; procedures/functions must be invoked.",
      },
    ],
    practice: ["Create a trigger that blocks (or logs) inserts of orders with negative totals."],
    related: ["transactions", "constraints", "views"],
  },
  {
    slug: "json",
    title: "JSON & Semi-Structured Data",
    category: "Modern SQL",
    level: "Advanced",
    estMinutes: 15,
    definition: "Modern engines store and query JSON documents inside columns, blending relational and document models.",
    simple:
      "When each product has different attributes (laptops have RAM, chairs have material), a JSON column holds the flexible part while normal columns hold the common part.",
    technical:
      "Postgres: json/jsonb (jsonb is binary, indexable via GIN; operators ->, ->>, @>). MySQL: JSON type + JSON_EXTRACT / ->>. SQLite: json1 functions (json_extract). Trade-off: schema flexibility vs weaker integrity and clunkier queries — extract hot fields into real columns.",
    syntax:
      "-- PostgreSQL\nSELECT data->>'brand' FROM products WHERE data @> '{\"wireless\": true}';\n-- SQLite\nSELECT json_extract(data, '$.brand') FROM products_json;",
    examples: [
      {
        sql: "CREATE TABLE products_json (id INTEGER PRIMARY KEY, data TEXT);\nINSERT INTO products_json VALUES\n (1, '{\"name\":\"Keyboard\",\"specs\":{\"switches\":\"brown\",\"wireless\":true}}'),\n (2, '{\"name\":\"Chair\",\"specs\":{\"material\":\"mesh\"}}');\nSELECT json_extract(data, '$.name') AS name,\n       json_extract(data, '$.specs.wireless') AS wireless\nFROM products_json;",
        note: "SQLite's json_extract works in the playground.",
      },
    ],
    businessUseCase:
      "Event payloads, user preferences, product catalogs with varying attributes, API response storage.",
    interviewAngle:
      "When JSON columns are appropriate vs an EAV table vs proper columns; jsonb vs json in Postgres; indexing JSON paths.",
    performanceTips: [
      "Extract frequently-filtered JSON fields into generated/computed columns and index those.",
      "Postgres GIN indexes make containment (@>) fast; path extraction still costs parsing.",
    ],
    commonMistakes: [
      "Using JSON as an excuse to skip schema design entirely.",
      "Filtering on deep JSON paths without any index and scanning millions of documents.",
    ],
    quiz: [
      {
        q: "In PostgreSQL, which JSON type should you almost always choose?",
        options: ["json", "jsonb", "text", "xml"],
        answer: 1,
        why: "jsonb is parsed once, supports indexing and containment operators; plain json is just validated text.",
      },
    ],
    practice: ["Store two orders with a JSON metadata column and extract a nested field."],
    related: ["indexes", "normalization"],
  },
  {
    slug: "execution-plans",
    title: "Execution Plans & EXPLAIN",
    category: "Performance",
    level: "Expert",
    estMinutes: 25,
    definition: "An execution plan shows the strategy the optimizer chose to run your query — scans, joins, sorts — with cost estimates.",
    simple:
      "EXPLAIN is 'show your work' for the database. Instead of guessing why a query is slow, you read the plan: 'ah, it's scanning all 10M rows because the index isn't being used'.",
    technical:
      "EXPLAIN shows the estimated plan; EXPLAIN ANALYZE executes and shows actual rows/timings. Key operators: Seq Scan vs Index Scan vs Index Only Scan; Nested Loop vs Hash Join vs Merge Join; Sort vs pre-sorted index reads. Bad row estimates (stale statistics) cause bad plans — ANALYZE refreshes them.",
    syntax:
      "-- PostgreSQL\nEXPLAIN ANALYZE SELECT ...;\n-- MySQL\nEXPLAIN FORMAT=TREE SELECT ...;\n-- SQLite\nEXPLAIN QUERY PLAN SELECT ...;",
    examples: [
      {
        sql: "EXPLAIN QUERY PLAN\nSELECT c.name, SUM(o.total_amount)\nFROM customers c\nJOIN orders o ON o.customer_id = c.customer_id\nGROUP BY c.customer_id;",
        note: "Run in the playground to see SQLite's plan (SCAN / SEARCH lines).",
      },
    ],
    businessUseCase:
      "Every production slowness investigation starts with a plan. It converts 'the dashboard is slow' into 'this join is scanning 40M rows'.",
    interviewAngle:
      "Senior screens: read a plan aloud, spot the sequential scan, explain why the optimizer skipped an index, know estimated vs actual rows divergence = stale stats.",
    performanceTips: [
      "Compare estimated vs actual row counts in EXPLAIN ANALYZE — big gaps mean stale statistics.",
      "Look at the innermost/most-repeated node first; that's usually the cost center.",
      "A Seq Scan isn't automatically bad — for large fractions of a table it's optimal.",
    ],
    commonMistakes: [
      "Optimizing without ever reading the plan.",
      "Testing plans on tiny dev data — optimizers choose differently at scale.",
      "Fearing every Seq Scan.",
    ],
    quiz: [
      {
        q: "EXPLAIN vs EXPLAIN ANALYZE:",
        options: [
          "Identical",
          "ANALYZE actually executes the query and reports real timings",
          "ANALYZE only works on views",
          "EXPLAIN executes twice",
        ],
        answer: 1,
        why: "EXPLAIN estimates; EXPLAIN ANALYZE runs the query and measures actual rows and time.",
      },
    ],
    practice: [
      "Compare EXPLAIN QUERY PLAN for a WHERE on customer_id before and after creating an index on it.",
    ],
    related: ["indexes", "optimization", "joins"],
  },
  {
    slug: "optimization",
    title: "Query Optimization",
    category: "Performance",
    level: "Expert",
    estMinutes: 30,
    definition: "Query optimization is the practice of restructuring queries, indexes, and schemas so the engine does dramatically less work.",
    simple:
      "The fastest row is the one you never read. Optimization is mostly: filter earlier, read fewer columns, help the engine use indexes, and stop doing the same work twice.",
    technical:
      "A practical checklist: (1) read the plan; (2) make predicates sargable; (3) index join/filter columns; (4) SELECT only needed columns; (5) replace correlated subqueries with joins/windows; (6) pre-aggregate before fan-out joins; (7) use UNION ALL over UNION and EXISTS over IN when appropriate; (8) paginate by keyset; (9) batch writes; (10) keep statistics fresh.",
    syntax:
      "-- Non-sargable (index unusable):\nWHERE YEAR(order_date) = 2026\n-- Sargable rewrite:\nWHERE order_date >= '2026-01-01' AND order_date < '2027-01-01'",
    examples: [
      {
        sql: "-- Before: correlated subquery per row\nSELECT o.order_id, o.total_amount,\n  (SELECT name FROM customers c WHERE c.customer_id = o.customer_id) AS name\nFROM orders o;\n\n-- After: one hash join\nSELECT o.order_id, o.total_amount, c.name\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id;",
        note: "Same result, one pass instead of a lookup per row.",
      },
    ],
    businessUseCase:
      "Cutting a dashboard from 40s to 400ms, halving warehouse compute bills, keeping checkout latency inside SLA.",
    interviewAngle:
      "'This query is slow — walk me through your process' is the senior staple. Answer with a process (plan → data volumes → predicates → indexes → rewrite), not a bag of tricks.",
    performanceTips: [
      "Measure first; the bottleneck is rarely where you assume.",
      "One good composite index frequently beats three single-column ones.",
      "Cache truly-hot aggregates in summary tables/MVs instead of re-optimizing the impossible.",
    ],
    commonMistakes: [
      "Adding random indexes without reading the plan.",
      "Optimizing a query that runs once a month while ignoring the one that runs 10k times/hour.",
      "DISTINCT/GROUP BY band-aids over join fan-out bugs.",
    ],
    quiz: [
      {
        q: "Which rewrite makes a predicate sargable?",
        options: [
          "WHERE UPPER(name) = 'BOB' → WHERE name = 'Bob' (if data is clean)",
          "WHERE x=1 → WHERE x IN (1)",
          "Adding DISTINCT",
          "Adding ORDER BY",
        ],
        answer: 0,
        why: "Removing the function from the column lets the index on name be used.",
      },
    ],
    practice: [
      "Take the correlated 'latest order per customer' query from the Subqueries topic and rewrite it with ROW_NUMBER.",
    ],
    related: ["indexes", "execution-plans", "window-functions", "joins"],
  },
  {
    slug: "star-snowflake",
    title: "Star & Snowflake Schemas",
    category: "Database Design",
    level: "Advanced",
    estMinutes: 15,
    definition: "Dimensional warehouse designs: a central fact table (events/measures) joined to denormalized dimension tables (context).",
    simple:
      "Star: one big 'sales' fact table in the middle, with dimension tables (date, product, store, customer) around it like points of a star. Snowflake: same, but dimensions are further normalized into sub-tables.",
    technical:
      "Facts hold measures (amount, quantity) plus FK surrogate keys to dimensions; grain (one row = one order item?) is the critical design decision. Star keeps dimensions flat for simple, fast BI joins; snowflake saves space and update anomalies at the cost of more joins. Slowly Changing Dimensions (SCD type 2) track history via versioned dimension rows.",
    syntax:
      "-- Star\nfact_sales(date_key, product_key, store_key, customer_key, qty, amount)\ndim_date(date_key, date, month, quarter, year)\ndim_product(product_key, name, category, brand)",
    examples: [
      {
        sql: "-- Typical star-schema query shape:\nSELECT d.month, p.category, SUM(f.amount) AS revenue\nFROM fact_sales f\nJOIN dim_date d ON d.date_key = f.date_key\nJOIN dim_product p ON p.product_key = f.product_key\nWHERE d.year = 2026\nGROUP BY d.month, p.category;",
        note: "Aggregate the fact, slice by dimensions — the universal BI pattern.",
      },
    ],
    businessUseCase:
      "Every serious analytics warehouse (retail sales cubes, product event marts) is dimensional. PMs read these schemas when defining metrics.",
    interviewAngle:
      "Analytics roles: define fact vs dimension, choose a grain for a given business question, star vs snowflake tradeoffs, and what an SCD-2 dimension looks like.",
    performanceTips: [
      "Pick the finest grain you'll ever need — you can aggregate up, never down.",
      "Columnar warehouses (BigQuery, Snowflake, Redshift) love flat star joins.",
    ],
    commonMistakes: [
      "Mixing grains in one fact table (order-level and item-level rows together).",
      "Storing mutable business attributes only on facts, losing dimensional history.",
    ],
    quiz: [
      {
        q: "In a star schema, 'revenue amount' lives in:",
        options: ["A dimension table", "The fact table", "A bridge table", "An index"],
        answer: 1,
        why: "Measures live on facts; descriptive context lives on dimensions.",
      },
    ],
    practice: ["Design the star schema for a food-delivery app's completed orders (name grain, facts, 4 dimensions)."],
    related: ["oltp-olap", "normalization", "materialized-views"],
  },
  {
    slug: "oltp-olap",
    title: "OLTP vs OLAP",
    category: "Database Design",
    level: "Advanced",
    estMinutes: 12,
    definition: "OLTP systems process many small transactions (apps); OLAP systems answer big analytical questions (warehouses).",
    simple:
      "OLTP: 'insert this order' — thousands of tiny reads/writes per second, row at a time. OLAP: 'total revenue by country for 2 years' — few queries, each chewing millions of rows.",
    technical:
      "OLTP: normalized (3NF), row-oriented storage, B-tree indexes, strict transactions, millisecond point queries. OLAP: dimensional/denormalized, columnar storage (only reads needed columns, compresses well), massive scans and aggregation, eventual/batch loading via ETL/ELT. Modern stacks pipe OLTP → CDC/ETL → warehouse.",
    syntax: "-- Same SQL language, different engines & schemas:\n-- OLTP: PostgreSQL/MySQL, 3NF, point lookups\n-- OLAP: BigQuery/Snowflake/Redshift, star schema, full scans",
    examples: [
      {
        sql: "-- OLTP-shaped query (point lookup):\nSELECT * FROM orders WHERE order_id = 109;\n\n-- OLAP-shaped query (scan + aggregate):\nSELECT c.country, strftime('%Y-%m', o.order_date) AS month,\n       SUM(o.total_amount) AS revenue\nFROM orders o JOIN customers c ON c.customer_id = o.customer_id\nGROUP BY c.country, month;",
        note: "Both run here, but at scale they'd live on very different engines.",
      },
    ],
    businessUseCase:
      "Knowing which system a question belongs to is a core PM/analyst skill — you don't run year-long cohort scans against the production checkout database.",
    interviewAngle:
      "Compare on: workload shape, schema style, storage orientation (row vs column), and why running analytics on the OLTP primary is an incident waiting to happen.",
    performanceTips: [
      "Row stores excel at 'give me this whole row'; column stores at 'aggregate this one column over everything'.",
      "Use read replicas or a warehouse for analytics; keep the primary for transactions.",
    ],
    commonMistakes: [
      "BI dashboards pointed at the production OLTP database.",
      "Designing a warehouse in 3NF and wondering why every query is a 12-way join.",
    ],
    quiz: [
      {
        q: "Columnar storage is fast for analytics because:",
        options: [
          "It encrypts less",
          "It reads only the referenced columns and compresses them well",
          "It skips WHERE clauses",
          "It stores data in RAM",
        ],
        answer: 1,
        why: "Scanning 2 columns of 50 means ~4% of the I/O, and similar values compress tightly.",
      },
    ],
    practice: ["Classify five queries from your product as OLTP-shaped or OLAP-shaped and say why."],
    related: ["star-snowflake", "normalization", "indexes"],
  },
  {
    slug: "er-design",
    title: "ER Diagrams & Database Design",
    category: "Database Design",
    level: "Intermediate",
    estMinutes: 18,
    definition: "Entity-Relationship modeling maps business concepts to entities, attributes, and relationships before any table is created.",
    simple:
      "Boxes are things (Customer, Order, Product); lines are how they relate (a customer places many orders; an order contains many products). Cardinality marks — 1, N, crow's feet — say how many.",
    technical:
      "One-to-many: FK on the many side. Many-to-many: junction table (order_items bridges orders↔products). One-to-one: shared PK or unique FK. Attributes become columns; identifying attributes become keys. The ER model then normalizes into physical tables. Try the built-in ER Diagram Builder to sketch this app's sample schema.",
    syntax:
      "-- M:N resolved via junction table\norders (order_id PK, ...)\nproducts (product_id PK, ...)\norder_items (item_id PK, order_id FK, product_id FK, qty)",
    examples: [
      {
        sql: "-- Our sample schema's relationships:\n-- customers 1 ─── N orders          (FK orders.customer_id)\n-- orders    1 ─── N order_items      (FK order_items.order_id)\n-- products  1 ─── N order_items      (FK order_items.product_id)\n-- employees N ─── 1 employees        (self-reference: manager_id)\nSELECT 'see comment' AS er_map;",
        note: "order_items is the junction table resolving the orders↔products many-to-many.",
      },
    ],
    businessUseCase:
      "The design step of every new feature that stores data. PMs who read ER diagrams catch data-model gaps in spec reviews, before engineering builds the wrong thing.",
    interviewAngle:
      "'Design the database for X' (Instagram, Uber, a library). Process: list entities → relationships with cardinality → junction tables for M:N → keys → indexes for the main access patterns.",
    performanceTips: [
      "Design for your access patterns, not just purity — know your top 5 queries before finalizing.",
      "Junction tables usually deserve a composite index both ways: (a_id, b_id) and (b_id, a_id).",
    ],
    commonMistakes: [
      "Modeling M:N as a repeated column or CSV list instead of a junction table.",
      "Forgetting self-referencing relationships (managers, referrers, reply threads).",
    ],
    quiz: [
      {
        q: "A many-to-many relationship is physically implemented as:",
        options: ["Two FKs on one table", "A junction table with two FKs", "A JSON column", "A trigger"],
        answer: 1,
        why: "The junction (bridge) table holds one row per link between the two entities.",
      },
    ],
    practice: ["Draw the ER diagram for a course-enrollment system (students, courses, enrollments, teachers)."],
    related: ["normalization", "constraints", "star-snowflake"],
  },
];
