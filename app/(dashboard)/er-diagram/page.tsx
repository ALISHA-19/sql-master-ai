"use client";

import { useRef, useState } from "react";
import { Download, GitBranch, RotateCcw } from "lucide-react";
import { Button, SectionTitle } from "@/components/ui/primitives";

interface TableBox {
  name: string;
  x: number;
  y: number;
  columns: { name: string; key?: "PK" | "FK" }[];
}

interface Rel {
  from: string; // table.column
  to: string;
  label: string;
}

const INITIAL_TABLES: TableBox[] = [
  { name: "customers", x: 40, y: 40, columns: [{ name: "customer_id", key: "PK" }, { name: "name" }, { name: "email" }, { name: "country" }] },
  { name: "orders", x: 340, y: 60, columns: [{ name: "order_id", key: "PK" }, { name: "customer_id", key: "FK" }, { name: "order_date" }, { name: "status" }, { name: "total_amount" }] },
  { name: "order_items", x: 640, y: 40, columns: [{ name: "item_id", key: "PK" }, { name: "order_id", key: "FK" }, { name: "product_id", key: "FK" }, { name: "quantity" }] },
  { name: "products", x: 640, y: 280, columns: [{ name: "product_id", key: "PK" }, { name: "product_name" }, { name: "category" }, { name: "price" }] },
  { name: "employees", x: 40, y: 300, columns: [{ name: "employee_id", key: "PK" }, { name: "name" }, { name: "manager_id", key: "FK" }, { name: "salary" }] },
];

const RELS: Rel[] = [
  { from: "orders", to: "customers", label: "N : 1" },
  { from: "order_items", to: "orders", label: "N : 1" },
  { from: "order_items", to: "products", label: "N : 1" },
  { from: "employees", to: "employees", label: "self" },
];

const ROW_H = 22;
const HEADER_H = 30;
const BOX_W = 190;

export default function ErDiagramPage() {
  const [tables, setTables] = useState<TableBox[]>(INITIAL_TABLES);
  const [drag, setDrag] = useState<{ name: string; dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const byName = new Map(tables.map((t) => [t.name, t]));

  const center = (t: TableBox) => ({
    x: t.x + BOX_W / 2,
    y: t.y + (HEADER_H + t.columns.length * ROW_H) / 2,
  });

  const onPointerDown = (e: React.PointerEvent, t: TableBox) => {
    const pt = svgPoint(e);
    setDrag({ name: t.name, dx: pt.x - t.x, dy: pt.y - t.y });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const svgPoint = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const scaleX = 900 / rect.width;
    const scaleY = 520 / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const pt = svgPoint(e);
    setTables((ts) =>
      ts.map((t) =>
        t.name === drag.name
          ? { ...t, x: Math.max(0, Math.min(900 - BOX_W, pt.x - drag.dx)), y: Math.max(0, Math.min(400, pt.y - drag.dy)) }
          : t
      )
    );
  };

  const exportPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", "1800");
    clone.setAttribute("height", "1040");
    // Inline theme colors so the export doesn't depend on CSS variables
    clone.style.background = "#0b0b0f";
    const xml = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1800;
      canvas.height = 1040;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#0b0b0f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, 1800, 1040);
      const a = document.createElement("a");
      a.download = "er-diagram.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
  };

  return (
    <div>
      <SectionTitle
        icon={<GitBranch size={22} className="text-brand-500" />}
        title="ER Diagram Builder"
        subtitle="The sample database's entity-relationship diagram. Drag tables to rearrange; export as PNG. Gold = primary key, cyan = foreign key."
      />
      <div className="mb-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setTables(INITIAL_TABLES)}>
          <RotateCcw size={13} /> Reset layout
        </Button>
        <Button variant="gradient" size="sm" onClick={exportPng}>
          <Download size={13} /> Export PNG
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[#0b0b0f]">
        <svg
          ref={svgRef}
          viewBox="0 0 900 520"
          className="w-full touch-none select-none"
          onPointerMove={onPointerMove}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
        >
          {/* grid */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#ffffff0a" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="900" height="520" fill="url(#grid)" />

          {/* relationships */}
          {RELS.map((r, i) => {
            const a = byName.get(r.from);
            const b = byName.get(r.to);
            if (!a || !b) return null;
            if (r.from === r.to) {
              const c = center(a);
              return (
                <g key={i}>
                  <path
                    d={`M ${a.x + BOX_W} ${c.y - 20} C ${a.x + BOX_W + 60} ${c.y - 40}, ${a.x + BOX_W + 60} ${c.y + 20}, ${a.x + BOX_W} ${c.y + 10}`}
                    fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3"
                  />
                  <text x={a.x + BOX_W + 66} y={c.y - 8} fill="#f59e0b" fontSize="10" fontFamily="monospace">{r.label}</text>
                </g>
              );
            }
            const ca = center(a);
            const cb = center(b);
            const mx = (ca.x + cb.x) / 2;
            const my = (ca.y + cb.y) / 2;
            return (
              <g key={i}>
                <path
                  d={`M ${ca.x} ${ca.y} Q ${mx} ${my - 30} ${cb.x} ${cb.y}`}
                  fill="none" stroke="#6366f1" strokeWidth="1.5" opacity="0.75"
                />
                <circle cx={cb.x} cy={cb.y} r="3.5" fill="#6366f1" />
                <text x={mx} y={my - 34} fill="#818cf8" fontSize="10" fontFamily="monospace" textAnchor="middle">{r.label}</text>
              </g>
            );
          })}

          {/* tables */}
          {tables.map((t) => {
            const h = HEADER_H + t.columns.length * ROW_H;
            return (
              <g
                key={t.name}
                transform={`translate(${t.x}, ${t.y})`}
                onPointerDown={(e) => onPointerDown(e, t)}
                style={{ cursor: "grab" }}
              >
                <rect width={BOX_W} height={h} rx="10" fill="#15151c" stroke={drag?.name === t.name ? "#a855f7" : "#2a2a35"} strokeWidth="1.5" />
                <rect width={BOX_W} height={HEADER_H} rx="10" fill="#1e1b3a" />
                <rect y={HEADER_H - 10} width={BOX_W} height="10" fill="#1e1b3a" />
                <text x={BOX_W / 2} y="19" textAnchor="middle" fill="#c7d2fe" fontSize="12" fontWeight="700" fontFamily="monospace">
                  {t.name}
                </text>
                {t.columns.map((c, i) => (
                  <g key={c.name} transform={`translate(0, ${HEADER_H + i * ROW_H})`}>
                    <line x1="0" y1="0" x2={BOX_W} y2="0" stroke="#ffffff0d" />
                    <text x="12" y="15" fill={c.key === "PK" ? "#fbbf24" : c.key === "FK" ? "#22d3ee" : "#a1a1aa"} fontSize="10.5" fontFamily="monospace">
                      {c.key === "PK" ? "🔑 " : c.key === "FK" ? "🔗 " : ""}{c.name}
                    </text>
                    {c.key && (
                      <text x={BOX_W - 12} y="15" textAnchor="end" fill={c.key === "PK" ? "#fbbf24" : "#22d3ee"} fontSize="9" fontFamily="monospace" fontWeight="700">
                        {c.key}
                      </text>
                    )}
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 grid gap-4 text-[13px] text-[var(--muted)] md:grid-cols-3">
        <p><strong className="text-[var(--fg)]">1-to-many:</strong> customers → orders. The FK (customer_id) always lives on the &ldquo;many&rdquo; side.</p>
        <p><strong className="text-[var(--fg)]">Many-to-many:</strong> orders ↔ products, resolved by the order_items junction table carrying both FKs.</p>
        <p><strong className="text-[var(--fg)]">Self-reference:</strong> employees.manager_id points back at employees — how org charts are modeled.</p>
      </div>
    </div>
  );
}
