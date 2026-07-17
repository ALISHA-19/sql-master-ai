/**
 * Sample e-commerce dataset loaded into the in-browser SQLite (sql.js) engine.
 * Five related tables: customers, products, orders, order_items, employees.
 * Small enough to read at a glance, rich enough for joins, windows and CTEs.
 */

export const SAMPLE_SCHEMA_SQL = `
CREATE TABLE customers (
  customer_id   INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE,
  city          TEXT,
  country       TEXT,
  signup_date   TEXT
);

CREATE TABLE products (
  product_id    INTEGER PRIMARY KEY,
  product_name  TEXT NOT NULL,
  category      TEXT,
  price         REAL,
  stock         INTEGER
);

CREATE TABLE orders (
  order_id      INTEGER PRIMARY KEY,
  customer_id   INTEGER REFERENCES customers(customer_id),
  order_date    TEXT,
  status        TEXT,
  total_amount  REAL
);

CREATE TABLE order_items (
  item_id       INTEGER PRIMARY KEY,
  order_id      INTEGER REFERENCES orders(order_id),
  product_id    INTEGER REFERENCES products(product_id),
  quantity      INTEGER,
  unit_price    REAL
);

CREATE TABLE employees (
  employee_id   INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  department    TEXT,
  salary        REAL,
  manager_id    INTEGER,
  hire_date     TEXT
);
`;

export const SAMPLE_SEED_SQL = `
INSERT INTO customers VALUES
 (1,'Aarav Shah','aarav@example.com','Mumbai','India','2025-01-12'),
 (2,'Bella Chen','bella@example.com','Singapore','Singapore','2025-02-03'),
 (3,'Carlos Diaz','carlos@example.com','Madrid','Spain','2025-02-18'),
 (4,'Diya Patel','diya@example.com','Ahmedabad','India','2025-03-05'),
 (5,'Emma Wilson','emma@example.com','London','UK','2025-03-22'),
 (6,'Farhan Ali','farhan@example.com','Dubai','UAE','2025-04-09'),
 (7,'Grace Kim','grace@example.com','Seoul','South Korea','2025-04-27'),
 (8,'Hiro Tanaka','hiro@example.com','Tokyo','Japan','2025-05-14'),
 (9,'Isha Reddy','isha@example.com','Hyderabad','India','2025-06-01'),
 (10,'Jack Miller','jack@example.com','New York','USA','2025-06-19');

INSERT INTO products VALUES
 (1,'Mechanical Keyboard','Electronics',89.99,120),
 (2,'Wireless Mouse','Electronics',29.99,300),
 (3,'27" 4K Monitor','Electronics',349.00,45),
 (4,'Standing Desk','Furniture',499.00,18),
 (5,'Ergonomic Chair','Furniture',289.00,32),
 (6,'Desk Lamp','Furniture',39.50,150),
 (7,'USB-C Hub','Electronics',59.00,210),
 (8,'Noise-Cancel Headphones','Electronics',199.00,80),
 (9,'Notebook Set','Stationery',12.50,500),
 (10,'Fountain Pen','Stationery',45.00,90);

INSERT INTO orders VALUES
 (101,1,'2026-05-02','delivered',438.98),
 (102,2,'2026-05-05','delivered',349.00),
 (103,3,'2026-05-09','cancelled',89.99),
 (104,1,'2026-05-15','delivered',258.00),
 (105,4,'2026-05-21','shipped',788.00),
 (106,5,'2026-05-28','delivered',59.00),
 (107,6,'2026-06-03','delivered',697.99),
 (108,7,'2026-06-08','pending',12.50),
 (109,2,'2026-06-14','delivered',488.00),
 (110,8,'2026-06-20','shipped',289.00),
 (111,9,'2026-06-25','delivered',244.00),
 (112,1,'2026-07-01','pending',199.00),
 (113,10,'2026-07-05','delivered',94.49),
 (114,4,'2026-07-08','delivered',349.00);

INSERT INTO order_items VALUES
 (1,101,1,1,89.99),(2,101,3,1,349.00),
 (3,102,3,1,349.00),
 (4,103,1,1,89.99),
 (5,104,8,1,199.00),(6,104,7,1,59.00),
 (7,105,4,1,499.00),(8,105,5,1,289.00),
 (9,106,7,1,59.00),
 (10,107,4,1,499.00),(11,107,8,1,199.00),
 (12,108,9,1,12.50),
 (13,109,3,1,349.00),(14,109,2,2,29.99),(15,109,6,2,39.50),
 (16,110,5,1,289.00),
 (17,111,8,1,199.00),(18,111,10,1,45.00),
 (19,112,8,1,199.00),
 (20,113,10,1,45.00),(21,113,2,1,29.99),(22,113,9,1,12.50),
 (23,114,3,1,349.00);

INSERT INTO employees VALUES
 (1,'Priya Nair','Engineering',185000,NULL,'2021-04-12'),
 (2,'Rohan Mehta','Engineering',142000,1,'2022-01-20'),
 (3,'Sofia Garcia','Engineering',138000,1,'2022-06-15'),
 (4,'Tom Baker','Sales',98000,NULL,'2021-09-01'),
 (5,'Uma Iyer','Sales',87000,4,'2023-02-11'),
 (6,'Victor Hugo','Sales',91000,4,'2022-11-30'),
 (7,'Wendy Zhao','Marketing',105000,NULL,'2022-03-08'),
 (8,'Xavier Dupont','Marketing',76000,7,'2023-07-19'),
 (9,'Yuki Sato','Engineering',151000,1,'2021-12-05'),
 (10,'Zara Khan','Marketing',82000,7,'2024-01-15');
`;

export interface TableInfo {
  name: string;
  columns: { name: string; type: string; key?: "PK" | "FK" }[];
  rowCount: number;
}

export const SAMPLE_TABLES: TableInfo[] = [
  {
    name: "customers",
    rowCount: 10,
    columns: [
      { name: "customer_id", type: "INTEGER", key: "PK" },
      { name: "name", type: "TEXT" },
      { name: "email", type: "TEXT" },
      { name: "city", type: "TEXT" },
      { name: "country", type: "TEXT" },
      { name: "signup_date", type: "TEXT" },
    ],
  },
  {
    name: "products",
    rowCount: 10,
    columns: [
      { name: "product_id", type: "INTEGER", key: "PK" },
      { name: "product_name", type: "TEXT" },
      { name: "category", type: "TEXT" },
      { name: "price", type: "REAL" },
      { name: "stock", type: "INTEGER" },
    ],
  },
  {
    name: "orders",
    rowCount: 14,
    columns: [
      { name: "order_id", type: "INTEGER", key: "PK" },
      { name: "customer_id", type: "INTEGER", key: "FK" },
      { name: "order_date", type: "TEXT" },
      { name: "status", type: "TEXT" },
      { name: "total_amount", type: "REAL" },
    ],
  },
  {
    name: "order_items",
    rowCount: 23,
    columns: [
      { name: "item_id", type: "INTEGER", key: "PK" },
      { name: "order_id", type: "INTEGER", key: "FK" },
      { name: "product_id", type: "INTEGER", key: "FK" },
      { name: "quantity", type: "INTEGER" },
      { name: "unit_price", type: "REAL" },
    ],
  },
  {
    name: "employees",
    rowCount: 10,
    columns: [
      { name: "employee_id", type: "INTEGER", key: "PK" },
      { name: "name", type: "TEXT" },
      { name: "department", type: "TEXT" },
      { name: "salary", type: "REAL" },
      { name: "manager_id", type: "INTEGER", key: "FK" },
      { name: "hire_date", type: "TEXT" },
    ],
  },
];

export const STARTER_QUERY = `-- Welcome to the SQL Playground!
-- 5 sample tables are pre-loaded: customers, products,
-- orders, order_items, employees. Try running this:

SELECT c.name, c.country,
       COUNT(o.order_id)      AS orders,
       ROUND(SUM(o.total_amount), 2) AS revenue
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
WHERE o.status != 'cancelled'
GROUP BY c.customer_id
ORDER BY revenue DESC
LIMIT 5;`;
