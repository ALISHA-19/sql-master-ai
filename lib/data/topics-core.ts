import type { Topic } from "./topic-types";

/** Beginner & core-intermediate SQL topics. */
export const CORE_TOPICS: Topic[] = [
  {
    slug: "select",
    title: "SELECT",
    category: "Query Basics",
    level: "Beginner",
    estMinutes: 10,
    definition: "SELECT retrieves columns (or expressions) from one or more tables.",
    simple:
      "Think of SELECT as pointing at the columns you want from a spreadsheet. `SELECT name, city FROM customers` says: give me just the name and city columns from the customers sheet.",
    technical:
      "SELECT defines the projection of a query. Although written first, it is evaluated near the end of logical execution order (after FROM, WHERE, GROUP BY, HAVING), which is why column aliases defined in SELECT usually can't be referenced in WHERE.",
    syntax: "SELECT column1, column2, expression AS alias\nFROM table_name;",
    examples: [
      {
        sql: "SELECT name, country FROM customers;",
        note: "Project just two columns.",
        output: {
          columns: ["name", "country"],
          rows: [
            ["Aarav Shah", "India"],
            ["Bella Chen", "Singapore"],
            ["Carlos Diaz", "Spain"],
          ],
        },
      },
      {
        sql: "SELECT product_name, price, price * 1.18 AS price_with_gst\nFROM products;",
        note: "SELECT can compute expressions, not just read columns.",
        output: {
          columns: ["product_name", "price", "price_with_gst"],
          rows: [
            ["Mechanical Keyboard", 89.99, 106.19],
            ["Wireless Mouse", 29.99, 35.39],
          ],
        },
      },
    ],
    businessUseCase:
      "Every report starts with SELECT: pulling customer emails for a campaign, listing yesterday's orders, or extracting KPIs for a dashboard.",
    interviewAngle:
      "Interviewers test whether you know the logical execution order (FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT) and why `SELECT *` is discouraged in production code.",
    performanceTips: [
      "Select only the columns you need — `SELECT *` forces extra I/O and can break covering-index optimizations.",
      "Computed expressions in SELECT are cheap; the expensive parts are scans and joins feeding them.",
      "Column order in SELECT has no performance impact — it's purely presentational.",
    ],
    commonMistakes: [
      "Using SELECT * in application code, which breaks when the schema changes.",
      "Referencing a SELECT alias in WHERE (it doesn't exist yet during WHERE evaluation).",
      "Forgetting that expressions on NULL values return NULL (e.g. price * NULL = NULL).",
    ],
    quiz: [
      {
        q: "Which clause is logically evaluated FIRST in a query?",
        options: ["SELECT", "FROM", "WHERE", "ORDER BY"],
        answer: 1,
        why: "The engine first determines the source rows (FROM), then filters, groups, projects, and finally sorts.",
      },
      {
        q: "Why can't you use a SELECT alias inside WHERE?",
        options: [
          "Aliases are case-sensitive",
          "WHERE runs before SELECT, so the alias doesn't exist yet",
          "WHERE only accepts column names",
          "You can — it always works",
        ],
        answer: 1,
        why: "Logical execution order: WHERE filters rows before SELECT computes aliases.",
      },
    ],
    practice: [
      "Select product_name and stock from products.",
      "Select each order's id and total_amount with a 10% discount column called discounted.",
    ],
    related: ["where", "aliases", "distinct", "order-by"],
  },
  {
    slug: "where",
    title: "WHERE",
    category: "Query Basics",
    level: "Beginner",
    estMinutes: 12,
    definition: "WHERE filters rows before any grouping or aggregation happens.",
    simple:
      "WHERE is a bouncer at the door: each row is checked against your condition, and only rows that pass get into the rest of the query.",
    technical:
      "WHERE applies a boolean predicate to each candidate row produced by FROM/JOIN. It runs before GROUP BY, so it cannot see aggregate results — that's HAVING's job. Predicates on indexed columns can be satisfied via index seeks instead of full scans (a 'sargable' predicate).",
    syntax: "SELECT columns\nFROM table\nWHERE condition [AND|OR condition ...];",
    examples: [
      {
        sql: "SELECT name, city FROM customers\nWHERE country = 'India';",
        output: {
          columns: ["name", "city"],
          rows: [
            ["Aarav Shah", "Mumbai"],
            ["Diya Patel", "Ahmedabad"],
            ["Isha Reddy", "Hyderabad"],
          ],
        },
      },
      {
        sql: "SELECT order_id, total_amount, status\nFROM orders\nWHERE total_amount > 300 AND status = 'delivered';",
        note: "Combine conditions with AND / OR — use parentheses when mixing them.",
      },
    ],
    businessUseCase:
      "Filtering is the core of every business question: 'orders this month', 'customers in India', 'transactions above ₹10,000', 'active subscriptions only'.",
    interviewAngle:
      "The classic trap is WHERE vs HAVING. Also expect NULL questions: `WHERE col != 'x'` silently drops rows where col IS NULL, because NULL comparisons yield UNKNOWN.",
    performanceTips: [
      "Keep predicates sargable: `WHERE order_date >= '2026-01-01'` can use an index, `WHERE YEAR(order_date) = 2026` usually can't.",
      "Put highly selective conditions on indexed columns.",
      "Avoid leading-wildcard LIKE ('%abc') — it defeats B-tree indexes.",
    ],
    commonMistakes: [
      "Using = NULL instead of IS NULL (= NULL is never true).",
      "Forgetting parentheses when mixing AND/OR: `a AND b OR c` means `(a AND b) OR c`.",
      "Filtering aggregates in WHERE instead of HAVING.",
    ],
    quiz: [
      {
        q: "What does `WHERE commission = NULL` return?",
        options: [
          "Rows where commission is NULL",
          "All rows",
          "No rows — NULL comparisons are UNKNOWN",
          "A syntax error",
        ],
        answer: 2,
        why: "NULL = NULL evaluates to UNKNOWN, not TRUE. Use IS NULL.",
      },
      {
        q: "Which predicate can use a B-tree index on order_date?",
        options: [
          "WHERE YEAR(order_date) = 2026",
          "WHERE order_date >= '2026-01-01'",
          "WHERE CAST(order_date AS TEXT) LIKE '2026%'",
          "None of these",
        ],
        answer: 1,
        why: "Wrapping the column in a function makes the predicate non-sargable; a bare range comparison keeps the index usable.",
      },
    ],
    practice: [
      "Find products cheaper than 50 with stock above 100.",
      "Find orders that are NOT delivered (careful with NULLs).",
    ],
    related: ["select", "having", "like", "between-in", "exists"],
  },
  {
    slug: "order-by",
    title: "ORDER BY",
    category: "Query Basics",
    level: "Beginner",
    estMinutes: 8,
    definition: "ORDER BY sorts the final result set by one or more columns or expressions.",
    simple:
      "It's the sort button on a spreadsheet column — ascending by default, DESC for descending, and you can sort by several columns as tiebreakers.",
    technical:
      "ORDER BY is applied after SELECT, so it CAN reference SELECT aliases. Sorting large result sets may spill to disk; an index matching the sort order lets the engine skip the sort entirely. NULL placement (first/last) is dialect-specific.",
    syntax: "SELECT columns FROM table\nORDER BY col1 [ASC|DESC], col2 [ASC|DESC];",
    examples: [
      {
        sql: "SELECT product_name, price\nFROM products\nORDER BY price DESC\nLIMIT 3;",
        output: {
          columns: ["product_name", "price"],
          rows: [
            ["Standing Desk", 499.0],
            ["27\" 4K Monitor", 349.0],
            ["Ergonomic Chair", 289.0],
          ],
        },
      },
      {
        sql: "SELECT name, country, city FROM customers\nORDER BY country ASC, city ASC;",
        note: "Multi-column sort: country first, then city breaks ties.",
      },
    ],
    businessUseCase:
      "Top-N reports — best-selling products, highest-value customers, most recent signups — are all ORDER BY + LIMIT.",
    interviewAngle:
      "Know that ORDER BY runs last (so aliases work), that sorting without LIMIT on huge tables is expensive, and how your dialect places NULLs.",
    performanceTips: [
      "ORDER BY + LIMIT lets engines use a cheap top-N heap sort instead of a full sort.",
      "An index on the sort column(s) in the right direction can eliminate the sort step.",
      "Avoid ORDER BY on expressions when a stored/computed column could be indexed instead.",
    ],
    commonMistakes: [
      "Assuming rows come back in insertion order without ORDER BY — order is never guaranteed.",
      "Sorting by column position (ORDER BY 2) — legal but fragile when the SELECT list changes.",
      "Forgetting DESC and shipping a 'top customers' report sorted ascending.",
    ],
    quiz: [
      {
        q: "Can ORDER BY use a column alias defined in SELECT?",
        options: ["No, never", "Yes — ORDER BY runs after SELECT", "Only in PostgreSQL", "Only with DESC"],
        answer: 1,
        why: "ORDER BY is evaluated after projection, so aliases are visible there.",
      },
    ],
    practice: [
      "List employees by salary descending, then name ascending.",
      "Show the 3 most recent orders.",
    ],
    related: ["limit-offset", "select", "window-functions"],
  },
  {
    slug: "group-by",
    title: "GROUP BY",
    category: "Aggregation",
    level: "Beginner",
    estMinutes: 15,
    definition: "GROUP BY collapses rows that share the same value(s) into one row per group, so aggregates can be computed per group.",
    simple:
      "Imagine sorting receipts into piles by store, then summing each pile. GROUP BY makes the piles; COUNT/SUM/AVG measure each pile.",
    technical:
      "After WHERE filtering, rows are partitioned by the grouping key. Every SELECT column must be either a grouping column or wrapped in an aggregate — otherwise the value is ambiguous (MySQL's loose mode notwithstanding). Grouping is implemented via hashing or sorting.",
    syntax: "SELECT group_col, AGG(col)\nFROM table\n[WHERE ...]\nGROUP BY group_col\n[HAVING agg_condition];",
    examples: [
      {
        sql: "SELECT category, COUNT(*) AS products, ROUND(AVG(price),2) AS avg_price\nFROM products\nGROUP BY category;",
        output: {
          columns: ["category", "products", "avg_price"],
          rows: [
            ["Electronics", 5, 145.39],
            ["Furniture", 3, 275.83],
            ["Stationery", 2, 28.75],
          ],
        },
      },
      {
        sql: "SELECT c.country, SUM(o.total_amount) AS revenue\nFROM customers c\nJOIN orders o ON o.customer_id = c.customer_id\nGROUP BY c.country\nORDER BY revenue DESC;",
        note: "Group after a join to aggregate across tables.",
      },
    ],
    businessUseCase:
      "Nearly every metric is a GROUP BY: revenue by region, signups by week, tickets by priority, conversion by channel.",
    interviewAngle:
      "Expect: 'every non-aggregated SELECT column must appear in GROUP BY — why?', WHERE vs HAVING, and COUNT(*) vs COUNT(col) (the latter skips NULLs).",
    performanceTips: [
      "Filter with WHERE before grouping — smaller groups mean less hashing/sorting work.",
      "COUNT(*) is usually fastest; COUNT(DISTINCT col) is much more expensive.",
      "For very large groupings, pre-aggregated summary tables or materialized views pay off.",
    ],
    commonMistakes: [
      "Selecting a non-grouped, non-aggregated column (undefined which row's value you get).",
      "Using HAVING for row-level filters that belong in WHERE.",
      "Forgetting that COUNT(col) ignores NULLs while COUNT(*) counts every row.",
    ],
    quiz: [
      {
        q: "COUNT(*) vs COUNT(email): what's the difference?",
        options: [
          "None",
          "COUNT(email) skips rows where email IS NULL",
          "COUNT(*) is deprecated",
          "COUNT(email) counts distinct emails",
        ],
        answer: 1,
        why: "COUNT(col) counts non-NULL values only; COUNT(*) counts rows.",
      },
      {
        q: "Where do you filter groups by an aggregate (e.g. SUM > 1000)?",
        options: ["WHERE", "HAVING", "ON", "QUALIFY"],
        answer: 1,
        why: "WHERE runs before grouping and can't see aggregates; HAVING runs after.",
      },
    ],
    practice: [
      "Count orders per status.",
      "Revenue per customer, only customers with 2+ orders (needs HAVING).",
    ],
    related: ["having", "aggregate-functions", "window-functions", "distinct"],
  },
  {
    slug: "having",
    title: "HAVING",
    category: "Aggregation",
    level: "Beginner",
    estMinutes: 8,
    definition: "HAVING filters groups after aggregation, using conditions on aggregate values.",
    simple:
      "WHERE filters rows before the piles are made; HAVING throws away entire piles afterwards — 'only keep customers whose pile sums to more than 500'.",
    technical:
      "HAVING is evaluated after GROUP BY and aggregation but before SELECT/ORDER BY. Any aggregate expression is allowed. A HAVING without GROUP BY treats the whole result as one group.",
    syntax: "SELECT group_col, AGG(col)\nFROM table\nGROUP BY group_col\nHAVING AGG(col) > value;",
    examples: [
      {
        sql: "SELECT customer_id, COUNT(*) AS orders, SUM(total_amount) AS spent\nFROM orders\nGROUP BY customer_id\nHAVING COUNT(*) >= 2;",
        output: {
          columns: ["customer_id", "orders", "spent"],
          rows: [
            [1, 3, 895.98],
            [2, 2, 837.0],
            [4, 2, 1137.0],
          ],
        },
      },
    ],
    businessUseCase:
      "Cohort thresholds: 'repeat customers (2+ orders)', 'products with >100 units sold', 'regions above quota'.",
    interviewAngle:
      "WHERE vs HAVING is a guaranteed interview question. The crisp answer: WHERE filters rows pre-aggregation; HAVING filters groups post-aggregation; using WHERE where possible is faster.",
    performanceTips: [
      "Push every row-level condition into WHERE — HAVING can't use indexes to skip rows.",
      "HAVING on a grouping column works but wastes work; filter it in WHERE instead.",
    ],
    commonMistakes: [
      "Putting row filters in HAVING (slower, sometimes wrong results).",
      "Referencing SELECT aliases in HAVING in dialects that don't allow it (standard SQL doesn't).",
    ],
    quiz: [
      {
        q: "`HAVING country = 'India'` (country is a grouping column) — better as?",
        options: ["Keep in HAVING", "Move to WHERE", "Move to ON", "Move to ORDER BY"],
        answer: 1,
        why: "It's a row-level filter; WHERE removes those rows before grouping, doing less work.",
      },
    ],
    practice: [
      "Categories whose average product price exceeds 100.",
      "Customers who spent more than 800 in total.",
    ],
    related: ["group-by", "where", "aggregate-functions"],
  },
  {
    slug: "limit-offset",
    title: "LIMIT & OFFSET",
    category: "Query Basics",
    level: "Beginner",
    estMinutes: 6,
    definition: "LIMIT caps how many rows are returned; OFFSET skips rows before returning them.",
    simple:
      "LIMIT 10 = 'just the first 10'. OFFSET 20 LIMIT 10 = 'skip 20, then give me 10' — the classic page 3 of results.",
    technical:
      "LIMIT is applied last. OFFSET still computes and discards the skipped rows, so deep pagination (OFFSET 100000) is slow; keyset pagination (WHERE id > last_seen ORDER BY id LIMIT n) scales better. SQL Server uses TOP / OFFSET-FETCH; Oracle uses FETCH FIRST.",
    syntax: "SELECT columns FROM table\nORDER BY col\nLIMIT n OFFSET m;",
    examples: [
      {
        sql: "SELECT product_name, price FROM products\nORDER BY price DESC\nLIMIT 3 OFFSET 3;",
        note: "Products ranked 4th–6th by price — 'page 2' of a 3-per-page list.",
      },
    ],
    businessUseCase:
      "Pagination in every product list, admin table, and API endpoint; top-N leaderboards.",
    interviewAngle:
      "Interviewers love asking why deep OFFSET pagination is slow and what keyset (seek) pagination is.",
    performanceTips: [
      "Always pair LIMIT with ORDER BY — without it the 'first' rows are arbitrary.",
      "Prefer keyset pagination (WHERE id > ?) over large OFFSETs.",
    ],
    commonMistakes: [
      "LIMIT without ORDER BY, giving non-deterministic pages.",
      "Assuming OFFSET is free — the engine still reads the skipped rows.",
    ],
    quiz: [
      {
        q: "Why is OFFSET 1000000 LIMIT 10 slow?",
        options: [
          "LIMIT is slow",
          "The engine must still produce and discard the first million rows",
          "It isn't slow",
          "OFFSET disables indexes",
        ],
        answer: 1,
        why: "OFFSET doesn't teleport — rows are generated then thrown away. Keyset pagination avoids this.",
      },
    ],
    practice: ["Return the 2nd and 3rd most expensive products only."],
    related: ["order-by", "select"],
  },
  {
    slug: "distinct",
    title: "DISTINCT",
    category: "Query Basics",
    level: "Beginner",
    estMinutes: 6,
    definition: "DISTINCT removes duplicate rows from the result set.",
    simple:
      "If you select countries from customers you'll see 'India' three times. DISTINCT collapses repeats so each unique value shows once.",
    technical:
      "DISTINCT applies to the whole selected row, not one column. It's implemented by hashing or sorting, so it costs memory/CPU. `SELECT DISTINCT a, b` returns unique (a,b) pairs. GROUP BY without aggregates is equivalent.",
    syntax: "SELECT DISTINCT col1 [, col2 ...] FROM table;",
    examples: [
      {
        sql: "SELECT DISTINCT country FROM customers ORDER BY country;",
        output: {
          columns: ["country"],
          rows: [["India"], ["Japan"], ["Singapore"], ["South Korea"], ["Spain"], ["UAE"], ["UK"], ["USA"]],
        },
      },
      {
        sql: "SELECT COUNT(DISTINCT customer_id) AS buyers FROM orders;",
        note: "Distinct inside an aggregate: how many unique customers ever ordered.",
      },
    ],
    businessUseCase:
      "Unique visitor counts, deduplicating email lists, 'how many distinct products were sold this quarter'.",
    interviewAngle:
      "Classic: 'DISTINCT applies to the row, not the first column' and 'COUNT(DISTINCT x) vs COUNT(x)'.",
    performanceTips: [
      "DISTINCT over many columns on big tables is expensive — check whether a join is producing duplicates you could avoid instead.",
      "If DISTINCT 'fixes' your result, you may have a fan-out join bug; fix the join.",
    ],
    commonMistakes: [
      "Thinking `SELECT DISTINCT a, b` dedupes only column a.",
      "Using DISTINCT to paper over a join that multiplies rows.",
    ],
    quiz: [
      {
        q: "SELECT DISTINCT city, country — what is deduplicated?",
        options: ["Only city", "Only country", "The (city, country) pair", "Nothing"],
        answer: 2,
        why: "DISTINCT always applies to the full selected row.",
      },
    ],
    practice: ["List each distinct order status.", "Count distinct categories in products."],
    related: ["group-by", "union", "select"],
  },
  {
    slug: "aliases",
    title: "Aliases (AS)",
    category: "Query Basics",
    level: "Beginner",
    estMinutes: 5,
    definition: "Aliases give temporary names to columns or tables within a query.",
    simple:
      "Rename things for readability: `SUM(total_amount) AS revenue` makes reports readable; `customers c` saves typing in joins.",
    technical:
      "Column aliases exist from SELECT onward (usable in ORDER BY, not WHERE/GROUP BY in standard SQL). Table aliases are mandatory for self-joins and recommended in every multi-table query. AS is optional but clearer.",
    syntax: "SELECT col AS friendly_name\nFROM long_table_name t\nWHERE t.col = ...;",
    examples: [
      {
        sql: "SELECT e.name AS employee, m.name AS manager\nFROM employees e\nLEFT JOIN employees m ON e.manager_id = m.employee_id;",
        note: "A self-join is impossible without table aliases.",
      },
    ],
    businessUseCase:
      "Readable dashboards (revenue, aov, mrr instead of SUM(...)) and unambiguous multi-table queries.",
    interviewAngle:
      "Self-join questions implicitly test aliases. Also: why can't WHERE see a column alias? (execution order).",
    performanceTips: ["Aliases are purely syntactic — zero performance cost."],
    commonMistakes: [
      "Referencing a column alias in WHERE.",
      "Ambiguous column errors in joins because no table alias was used.",
    ],
    quiz: [
      {
        q: "Which clause CAN reference a SELECT column alias (standard SQL)?",
        options: ["WHERE", "GROUP BY", "ORDER BY", "ON"],
        answer: 2,
        why: "ORDER BY runs after SELECT; the others run before aliases exist.",
      },
    ],
    practice: ["Write a self-join listing each employee with their manager's name."],
    related: ["select", "joins", "order-by"],
  },
  {
    slug: "aggregate-functions",
    title: "Aggregate Functions",
    category: "Aggregation",
    level: "Beginner",
    estMinutes: 12,
    definition: "Aggregates (COUNT, SUM, AVG, MIN, MAX) collapse many rows into a single summary value.",
    simple:
      "They answer 'how many / how much / on average / smallest / largest' — over the whole table, or per group with GROUP BY.",
    technical:
      "All aggregates except COUNT(*) ignore NULLs. AVG is SUM/COUNT of non-NULL values — which can surprise you when NULLs exist. Most support DISTINCT inside (COUNT(DISTINCT x)). Without GROUP BY, the entire input is one group.",
    syntax: "SELECT COUNT(*), SUM(col), AVG(col), MIN(col), MAX(col)\nFROM table [WHERE ...] [GROUP BY ...];",
    examples: [
      {
        sql: "SELECT COUNT(*) AS orders,\n       ROUND(SUM(total_amount),2) AS revenue,\n       ROUND(AVG(total_amount),2) AS aov,\n       MIN(order_date) AS first_order,\n       MAX(order_date) AS last_order\nFROM orders\nWHERE status = 'delivered';",
        output: {
          columns: ["orders", "revenue", "aov", "first_order", "last_order"],
          rows: [[9, 2978.96, 331.0, "2026-05-02", "2026-07-08"]],
        },
      },
    ],
    businessUseCase:
      "Revenue, average order value, DAU counts, min/max latency — the vocabulary of every KPI dashboard.",
    interviewAngle:
      "NULL handling is the trap: AVG over (10, NULL, 20) is 15, not 10. Use COALESCE(col, 0) if NULL should mean zero.",
    performanceTips: [
      "COUNT(*) can often be answered from index metadata; COUNT(DISTINCT) cannot.",
      "Filtering first (WHERE) shrinks the aggregation input.",
      "For repeated heavy aggregations, consider a materialized/summary table.",
    ],
    commonMistakes: [
      "Expecting AVG to treat NULL as 0.",
      "Aggregating a fan-out join and double-counting (dedupe or pre-aggregate in a CTE).",
      "SUM of a money column stored as FLOAT — use DECIMAL to avoid drift.",
    ],
    quiz: [
      {
        q: "AVG over values (10, NULL, 20) returns:",
        options: ["10", "15", "NULL", "30"],
        answer: 1,
        why: "NULLs are excluded: (10+20)/2 = 15.",
      },
    ],
    practice: [
      "Average salary per department.",
      "Total quantity sold per product across order_items.",
    ],
    related: ["group-by", "having", "window-functions", "case"],
  },
  {
    slug: "case",
    title: "CASE Expressions",
    category: "Query Basics",
    level: "Beginner",
    estMinutes: 10,
    definition: "CASE is SQL's if/else — it returns different values based on conditions, inside any expression position.",
    simple:
      "Label rows on the fly: orders above 300 become 'high value', the rest 'standard'. CASE evaluates conditions top-down and returns the first match.",
    technical:
      "Two forms: simple (CASE col WHEN v THEN ...) and searched (CASE WHEN cond THEN ...). Evaluation short-circuits at the first true branch; a missing ELSE yields NULL. CASE inside aggregates enables pivot-style conditional aggregation — a hugely useful pattern.",
    syntax:
      "CASE\n  WHEN condition1 THEN result1\n  WHEN condition2 THEN result2\n  ELSE default\nEND",
    examples: [
      {
        sql: "SELECT order_id, total_amount,\n  CASE\n    WHEN total_amount >= 500 THEN 'high'\n    WHEN total_amount >= 200 THEN 'medium'\n    ELSE 'low'\n  END AS value_tier\nFROM orders;",
        note: "Bucketing — conditions are checked top-down.",
      },
      {
        sql: "SELECT\n  SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) AS delivered_rev,\n  SUM(CASE WHEN status = 'cancelled' THEN total_amount ELSE 0 END) AS cancelled_rev\nFROM orders;",
        note: "Conditional aggregation: pivot statuses into columns.",
      },
    ],
    businessUseCase:
      "Customer segmentation tiers, pivoting statuses into columns, custom sort orders, cleaning messy categorical data.",
    interviewAngle:
      "Conditional aggregation (SUM(CASE WHEN ...)) is one of the most-tested analyst patterns — learn it cold.",
    performanceTips: [
      "CASE is evaluated per row — cheap, but avoid burying sargable filters inside it.",
      "Prefer one pass with conditional aggregation over multiple self-joined subqueries.",
    ],
    commonMistakes: [
      "Forgetting ELSE and being surprised by NULLs.",
      "Overlapping WHEN conditions where order silently matters.",
      "Using CASE in WHERE when a plain boolean expression is cleaner.",
    ],
    quiz: [
      {
        q: "A CASE with no ELSE and no matching WHEN returns:",
        options: ["0", "'' (empty string)", "NULL", "An error"],
        answer: 2,
        why: "Missing ELSE defaults to NULL.",
      },
    ],
    practice: [
      "Label products 'premium' (>200), 'mid' (50–200), 'budget' (<50).",
      "One row: count of delivered vs pending vs cancelled orders as three columns.",
    ],
    related: ["aggregate-functions", "group-by", "select"],
  },
  {
    slug: "like",
    title: "LIKE & Pattern Matching",
    category: "Query Basics",
    level: "Beginner",
    estMinutes: 8,
    definition: "LIKE matches strings against patterns using % (any characters) and _ (exactly one character).",
    simple:
      "'A%' = starts with A. '%son' = ends with son. '%ana%' = contains ana. '_r%' = second letter is r.",
    technical:
      "LIKE is case-sensitive in PostgreSQL (use ILIKE for insensitive) but case-insensitive by default in MySQL and SQL Server (collation-dependent). Leading wildcards prevent B-tree index use; full-text search or trigram indexes handle 'contains' queries at scale.",
    syntax: "SELECT columns FROM table\nWHERE col LIKE 'pattern';",
    examples: [
      {
        sql: "SELECT name, email FROM customers\nWHERE email LIKE '%@example.com';",
        note: "Ends-with pattern — note this can't use a normal index.",
      },
      {
        sql: "SELECT product_name FROM products\nWHERE product_name LIKE '%Desk%';",
        output: {
          columns: ["product_name"],
          rows: [["Standing Desk"], ["Desk Lamp"]],
        },
      },
    ],
    businessUseCase:
      "Search boxes, email-domain filters, cleaning inconsistent free-text fields, quick data exploration.",
    interviewAngle:
      "Expect '%x' vs 'x%' index behavior and the case-sensitivity differences across databases.",
    performanceTips: [
      "'abc%' (prefix) can use an index; '%abc' cannot.",
      "For real search features, use full-text indexes (or pg_trgm in Postgres), not LIKE.",
    ],
    commonMistakes: [
      "Assuming LIKE is case-insensitive everywhere.",
      "Forgetting to escape literal % or _ in patterns.",
    ],
    quiz: [
      {
        q: "Which LIKE pattern can use a standard B-tree index?",
        options: ["'%son'", "'%ana%'", "'A%'", "None"],
        answer: 2,
        why: "Only a fixed prefix allows an index range scan.",
      },
    ],
    practice: ["Find customers whose name contains 'a' as the second letter."],
    related: ["where", "indexes"],
  },
  {
    slug: "between-in",
    title: "BETWEEN & IN",
    category: "Query Basics",
    level: "Beginner",
    estMinutes: 7,
    definition: "BETWEEN tests a value against an inclusive range; IN tests membership in a list (or subquery result).",
    simple:
      "BETWEEN 10 AND 20 means ≥10 and ≤20 — both ends included. IN ('a','b','c') is shorthand for three ORs.",
    technical:
      "BETWEEN is inclusive on both bounds — a classic source of date bugs when timestamps are involved (prefer >= start AND < next_day). IN with a subquery relates to EXISTS; NOT IN with any NULL in the list returns no rows at all.",
    syntax: "WHERE col BETWEEN low AND high\nWHERE col IN (v1, v2, ...) | (SELECT ...)",
    examples: [
      {
        sql: "SELECT product_name, price FROM products\nWHERE price BETWEEN 30 AND 100;",
        note: "Inclusive: 30 and 100 both match.",
      },
      {
        sql: "SELECT name, country FROM customers\nWHERE country IN ('India', 'Japan', 'USA');",
      },
    ],
    businessUseCase:
      "Date-range reports, price-band filters, whitelisting a set of regions or statuses.",
    interviewAngle:
      "The NOT IN + NULL trap is a favorite: `WHERE id NOT IN (SELECT ref_id ...)` returns nothing if any ref_id is NULL. NOT EXISTS is the safe pattern.",
    performanceTips: [
      "For timestamp ranges use `>= start AND < end_exclusive`, not BETWEEN.",
      "Long IN lists are fine; engines convert them to efficient lookups — but a join against a temp table beats thousand-item lists.",
    ],
    commonMistakes: [
      "BETWEEN '2026-01-01' AND '2026-01-31' silently missing Jan 31 timestamps after midnight.",
      "NOT IN against a subquery containing NULLs (returns zero rows).",
    ],
    quiz: [
      {
        q: "`x NOT IN (1, 2, NULL)` evaluates to:",
        options: ["TRUE when x=3", "FALSE always", "UNKNOWN — so no rows pass", "Error"],
        answer: 2,
        why: "x != NULL is UNKNOWN, so the whole predicate can never be TRUE. Use NOT EXISTS.",
      },
    ],
    practice: ["Orders placed in June 2026 (mind the range bounds)."],
    related: ["where", "exists", "subqueries"],
  },
  {
    slug: "joins",
    title: "JOINs",
    category: "Multiple Tables",
    level: "Intermediate",
    estMinutes: 25,
    definition: "JOINs combine rows from two tables based on a matching condition, producing a wider row.",
    simple:
      "Orders store a customer_id, not the customer's name. A JOIN lines each order up with its matching customer row so you can see both together. INNER keeps only matches; LEFT keeps every left row even without a match (NULLs fill the gap).",
    technical:
      "INNER JOIN returns the intersection; LEFT/RIGHT preserve one side; FULL OUTER preserves both; CROSS is the Cartesian product. Engines execute joins via nested loops, hash joins, or merge joins depending on sizes and indexes. Filters on the right table of a LEFT JOIN belong in ON (keeping unmatched rows) not WHERE (which silently converts it to INNER).",
    syntax:
      "SELECT ...\nFROM a\n[INNER|LEFT|RIGHT|FULL OUTER|CROSS] JOIN b\n  ON a.key = b.key;",
    examples: [
      {
        sql: "SELECT o.order_id, c.name, o.total_amount\nFROM orders o\nINNER JOIN customers c ON c.customer_id = o.customer_id\nLIMIT 3;",
        output: {
          columns: ["order_id", "name", "total_amount"],
          rows: [
            [101, "Aarav Shah", 438.98],
            [102, "Bella Chen", 349.0],
            [103, "Carlos Diaz", 89.99],
          ],
        },
      },
      {
        sql: "-- Customers who never ordered (anti-join pattern)\nSELECT c.name\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id\nWHERE o.order_id IS NULL;",
        output: { columns: ["name"], rows: [["Grace Kim"]] },
      },
      {
        sql: "-- LEFT JOIN trap: this WHERE turns it into an INNER JOIN\nSELECT c.name, o.total_amount\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id\nWHERE o.status = 'delivered';  -- drops customers with no orders!",
        note: "Move the status filter into ON to keep unmatched customers.",
      },
    ],
    businessUseCase:
      "Almost every real query joins: orders↔customers, events↔users, transactions↔accounts. Anti-joins find churned users; self-joins build org charts.",
    interviewAngle:
      "The most-tested SQL area. Know: row counts from each join type, the LEFT JOIN + WHERE trap, anti-join patterns, self-joins, and what happens with duplicate keys (fan-out).",
    performanceTips: [
      "Index the join keys — especially the 'many' side's foreign key.",
      "Join on keys with matching data types; implicit casts kill index use.",
      "Watch for fan-out: joining one order to N items multiplies rows — pre-aggregate in a CTE before joining if you'll aggregate after.",
    ],
    commonMistakes: [
      "WHERE on the right table of a LEFT JOIN, silently discarding unmatched rows.",
      "Missing/incorrect ON clause producing an accidental Cartesian product.",
      "Double-counting after a one-to-many join, then 'fixing' with DISTINCT.",
    ],
    quiz: [
      {
        q: "Table A has 5 rows, B has 3 rows, no ON clause (CROSS JOIN). Rows returned?",
        options: ["5", "3", "8", "15"],
        answer: 3,
        why: "Cartesian product: 5 × 3 = 15.",
      },
      {
        q: "To keep ALL customers but only delivered orders, the status filter goes in:",
        options: ["WHERE", "ON", "HAVING", "SELECT"],
        answer: 1,
        why: "Conditions in ON apply during the match; WHERE runs after and removes NULL-extended rows.",
      },
    ],
    practice: [
      "Each product with total quantity sold (LEFT JOIN so unsold products show 0).",
      "Employees earning more than their manager (self-join).",
    ],
    related: ["subqueries", "exists", "aliases", "indexes"],
  },
  {
    slug: "union",
    title: "UNION & UNION ALL",
    category: "Multiple Tables",
    level: "Intermediate",
    estMinutes: 10,
    definition: "UNION stacks the results of two queries vertically; UNION removes duplicates, UNION ALL keeps everything.",
    simple:
      "JOIN glues tables side-by-side; UNION stacks them top-to-bottom. Same number of columns, compatible types, and you get one combined list.",
    technical:
      "UNION performs an implicit DISTINCT over the combined result — a sort/hash that costs real time. UNION ALL is a pure concatenation and is much faster. Column names come from the first query; ORDER BY applies to the final combined result. INTERSECT and EXCEPT are the set-operation siblings.",
    syntax: "SELECT a, b FROM t1\nUNION [ALL]\nSELECT a, b FROM t2\n[ORDER BY ...];",
    examples: [
      {
        sql: "SELECT name, 'customer' AS kind FROM customers WHERE country = 'India'\nUNION ALL\nSELECT name, 'employee' AS kind FROM employees WHERE department = 'Sales';",
        note: "Tag each source with a literal column to keep provenance.",
      },
    ],
    businessUseCase:
      "Combining current + archived tables, merging similar event streams, building 'all contacts' lists from multiple sources.",
    interviewAngle:
      "'Difference between UNION and UNION ALL?' is a guaranteed screener. Answer: dedup vs not, and the performance implication.",
    performanceTips: [
      "Default to UNION ALL; only pay for UNION's dedup when duplicates are actually possible AND unwanted.",
      "Each branch is optimized separately — filter inside each branch, not after.",
    ],
    commonMistakes: [
      "Using UNION out of habit and paying a needless dedup sort.",
      "Mismatched column order between branches (silent wrong data if types happen to align).",
    ],
    quiz: [
      {
        q: "Which is faster on large inputs with no duplicates?",
        options: ["UNION", "UNION ALL", "Identical", "Depends on ORDER BY"],
        answer: 1,
        why: "UNION ALL skips the dedup sort/hash entirely.",
      },
    ],
    practice: ["Stack all Furniture products and all Stationery products with a source label."],
    related: ["distinct", "joins", "subqueries"],
  },
  {
    slug: "subqueries",
    title: "Subqueries",
    category: "Multiple Tables",
    level: "Intermediate",
    estMinutes: 15,
    definition: "A subquery is a query nested inside another — in WHERE, FROM, SELECT, or HAVING.",
    simple:
      "'Products above the average price' needs two steps: find the average, then compare. A subquery does step one inline: WHERE price > (SELECT AVG(price)...).",
    technical:
      "Scalar subqueries return one value; row/table subqueries feed IN/EXISTS/FROM. A correlated subquery references the outer row and conceptually re-executes per row — optimizers often decorrelate them into joins, but not always. Derived tables (subqueries in FROM) need an alias.",
    syntax:
      "-- scalar\nWHERE col > (SELECT AVG(col) FROM t)\n-- membership\nWHERE id IN (SELECT id FROM t2)\n-- derived table\nFROM (SELECT ... ) AS sub",
    examples: [
      {
        sql: "SELECT product_name, price\nFROM products\nWHERE price > (SELECT AVG(price) FROM products);",
        output: {
          columns: ["product_name", "price"],
          rows: [
            ["27\" 4K Monitor", 349.0],
            ["Standing Desk", 499.0],
            ["Ergonomic Chair", 289.0],
            ["Noise-Cancel Headphones", 199.0],
          ],
        },
      },
      {
        sql: "-- Correlated: each customer's most recent order\nSELECT o.order_id, o.customer_id, o.order_date\nFROM orders o\nWHERE o.order_date = (\n  SELECT MAX(o2.order_date) FROM orders o2\n  WHERE o2.customer_id = o.customer_id\n);",
        note: "The inner query references the outer row (o.customer_id) — that's correlation.",
      },
    ],
    businessUseCase:
      "Comparisons against computed benchmarks ('above average', 'latest per customer'), filtering by membership in another table.",
    interviewAngle:
      "Correlated vs non-correlated is the standard question; also when a subquery beats a join (readability, anti-joins) and when it doesn't (row-by-row execution).",
    performanceTips: [
      "Check the plan: correlated subqueries the optimizer can't decorrelate run once per outer row.",
      "Window functions often replace correlated subqueries with a single pass.",
      "A derived table computed once usually beats a scalar subquery repeated per row.",
    ],
    commonMistakes: [
      "Scalar subquery returning multiple rows → runtime error.",
      "NOT IN with NULLs in the subquery result (returns nothing).",
      "Forgetting the alias on a FROM-clause subquery.",
    ],
    quiz: [
      {
        q: "A correlated subquery is one that:",
        options: [
          "Uses JOIN internally",
          "References columns from the outer query",
          "Returns multiple columns",
          "Runs exactly once",
        ],
        answer: 1,
        why: "Correlation = dependence on the outer row, implying per-row evaluation unless the optimizer rewrites it.",
      },
    ],
    practice: [
      "Employees earning above their department's average (correlated).",
      "Customers who ordered a Furniture product (IN subquery through order_items).",
    ],
    related: ["exists", "ctes", "joins", "window-functions"],
  },
  {
    slug: "exists",
    title: "EXISTS & NOT EXISTS",
    category: "Multiple Tables",
    level: "Intermediate",
    estMinutes: 10,
    definition: "EXISTS tests whether a subquery returns at least one row — it's a boolean, not a value comparison.",
    simple:
      "'Customers who have ordered' = for each customer, peek into orders; if anything is there, keep the customer. It short-circuits at the first match.",
    technical:
      "EXISTS stops at the first matching row (semi-join); NOT EXISTS is the NULL-safe anti-join. The subquery's SELECT list is irrelevant — SELECT 1 is conventional. Optimizers translate these into semi/anti-join operators, typically as fast as or faster than IN.",
    syntax: "WHERE [NOT] EXISTS (\n  SELECT 1 FROM other o WHERE o.fk = outer.pk\n)",
    examples: [
      {
        sql: "SELECT c.name FROM customers c\nWHERE EXISTS (\n  SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id\n);",
        note: "Semi-join: customers with at least one order.",
      },
      {
        sql: "SELECT c.name FROM customers c\nWHERE NOT EXISTS (\n  SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id\n);",
        output: { columns: ["name"], rows: [["Grace Kim"]] },
      },
    ],
    businessUseCase:
      "Churn analysis (users with no activity), inventory gaps (products never sold), compliance checks (accounts missing verification).",
    interviewAngle:
      "IN vs EXISTS vs JOIN for existence checks — and why NOT EXISTS is safe with NULLs while NOT IN is not.",
    performanceTips: [
      "EXISTS short-circuits; a JOIN for a pure existence check may produce duplicates you then have to remove.",
      "Index the subquery's correlation column (the FK).",
    ],
    commonMistakes: [
      "Using NOT IN where NULLs can appear — NOT EXISTS is the correct tool.",
      "Writing SELECT * inside EXISTS thinking columns matter (they don't).",
    ],
    quiz: [
      {
        q: "Safest pattern for 'customers with no orders' when FK may be NULL:",
        options: ["NOT IN (subquery)", "NOT EXISTS (correlated)", "LEFT JOIN + COUNT", "MINUS"],
        answer: 1,
        why: "NOT EXISTS handles NULLs correctly and expresses an anti-join directly.",
      },
    ],
    practice: ["Products that have never appeared in order_items (NOT EXISTS)."],
    related: ["subqueries", "joins", "between-in"],
  },
];
