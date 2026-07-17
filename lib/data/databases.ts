export interface DbProfile {
  name: string;
  vendor: string;
  bestFor: string;
  license: string;
  personality: string;
}

export const DB_PROFILES: DbProfile[] = [
  { name: "PostgreSQL", vendor: "Open source (PostgreSQL Global Dev Group)", bestFor: "General-purpose apps, analytics, JSON workloads — the default choice for new products.", license: "PostgreSQL License (permissive)", personality: "The standards nerd: strictest SQL compliance, richest feature set (CTEs, window functions, JSONB, extensions like PostGIS)." },
  { name: "MySQL", vendor: "Oracle (open source)", bestFor: "Read-heavy web apps, WordPress/LAMP ecosystems, teams that value operational familiarity.", license: "GPL / commercial dual", personality: "The web workhorse: massive hosting ecosystem, historically looser SQL semantics (silent coercions), InnoDB engine." },
  { name: "SQL Server", vendor: "Microsoft", bestFor: "Enterprise .NET shops, BI stacks (SSRS/SSIS/Power BI), Windows-centric IT.", license: "Commercial (free Express tier)", personality: "The enterprise suite: T-SQL dialect, superb tooling (SSMS), tight Azure integration." },
  { name: "Oracle", vendor: "Oracle", bestFor: "Large enterprises, ERP/financial cores, extreme-scale OLTP with DBA teams.", license: "Commercial", personality: "The heavyweight: PL/SQL, unmatched depth of features, priced accordingly." },
  { name: "SQLite", vendor: "Public domain (D. Richard Hipp)", bestFor: "Embedded apps, mobile, prototypes, this very playground — a database in a single file.", license: "Public domain", personality: "The featherweight: zero-config, serverless, runs in your browser via WASM. Dynamic typing quirks." },
];

export interface SyntaxRow {
  task: string;
  postgres: string;
  mysql: string;
  sqlserver: string;
  oracle: string;
  sqlite: string;
}

export const SYNTAX_COMPARISON: SyntaxRow[] = [
  { task: "Limit rows", postgres: "LIMIT 10", mysql: "LIMIT 10", sqlserver: "TOP 10 / OFFSET-FETCH", oracle: "FETCH FIRST 10 ROWS ONLY", sqlite: "LIMIT 10" },
  { task: "Auto-increment PK", postgres: "GENERATED ALWAYS AS IDENTITY / SERIAL", mysql: "AUTO_INCREMENT", sqlserver: "IDENTITY(1,1)", oracle: "GENERATED AS IDENTITY", sqlite: "INTEGER PRIMARY KEY (rowid alias)" },
  { task: "String concat", postgres: "'a' || 'b' or CONCAT()", mysql: "CONCAT('a','b')", sqlserver: "'a' + 'b' or CONCAT()", oracle: "'a' || 'b'", sqlite: "'a' || 'b'" },
  { task: "Current timestamp", postgres: "NOW() / CURRENT_TIMESTAMP", mysql: "NOW()", sqlserver: "GETDATE() / SYSDATETIME()", oracle: "SYSDATE / SYSTIMESTAMP", sqlite: "datetime('now')" },
  { task: "Truncate date to month", postgres: "DATE_TRUNC('month', d)", mysql: "DATE_FORMAT(d, '%Y-%m-01')", sqlserver: "DATETRUNC(month, d)", oracle: "TRUNC(d, 'MM')", sqlite: "strftime('%Y-%m-01', d)" },
  { task: "Date difference (days)", postgres: "d1 - d2", mysql: "DATEDIFF(d1, d2)", sqlserver: "DATEDIFF(day, d2, d1)", oracle: "d1 - d2", sqlite: "julianday(d1) - julianday(d2)" },
  { task: "IF-NULL fallback", postgres: "COALESCE(x, 0)", mysql: "IFNULL(x, 0)", sqlserver: "ISNULL(x, 0)", oracle: "NVL(x, 0)", sqlite: "IFNULL(x, 0)" },
  { task: "Case-insensitive LIKE", postgres: "ILIKE", mysql: "LIKE (default CI collation)", sqlserver: "LIKE (default CI collation)", oracle: "REGEXP_LIKE(x, p, 'i')", sqlite: "LIKE (CI for ASCII)" },
  { task: "Upsert", postgres: "ON CONFLICT DO UPDATE", mysql: "ON DUPLICATE KEY UPDATE", sqlserver: "MERGE", oracle: "MERGE", sqlite: "ON CONFLICT DO UPDATE" },
  { task: "String aggregation", postgres: "STRING_AGG(x, ',')", mysql: "GROUP_CONCAT(x)", sqlserver: "STRING_AGG(x, ',')", oracle: "LISTAGG(x, ',')", sqlite: "GROUP_CONCAT(x)" },
  { task: "Explain a query", postgres: "EXPLAIN ANALYZE", mysql: "EXPLAIN FORMAT=TREE", sqlserver: "SET SHOWPLAN_XML / Actual Plan", oracle: "EXPLAIN PLAN FOR", sqlite: "EXPLAIN QUERY PLAN" },
  { task: "JSON extract (text)", postgres: "data->>'key'", mysql: "data->>'$.key'", sqlserver: "JSON_VALUE(data, '$.key')", oracle: "JSON_VALUE(data, '$.key')", sqlite: "json_extract(data, '$.key')" },
  { task: "Default isolation level", postgres: "READ COMMITTED", mysql: "REPEATABLE READ", sqlserver: "READ COMMITTED", oracle: "READ COMMITTED", sqlite: "SERIALIZABLE" },
];
