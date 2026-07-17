"use client";

import { Download, FileDown, FileText, Layers, Map as MapIcon, Sparkles } from "lucide-react";
import { Button, Card, SectionTitle } from "@/components/ui/primitives";
import { CHEATSHEETS } from "@/lib/data/cheatsheets";
import { INTERVIEW_QUESTIONS } from "@/lib/data/interview";
import { ROADMAP } from "@/lib/data/roadmap";
import { SQL_FUNCTIONS } from "@/lib/data/functions";
import { TOPICS } from "@/lib/data/topics";
import { downloadText } from "@/lib/utils";

function buildCheatsheetMd(): string {
  let md = "# SQL Master AI — Cheat Sheet\n\n";
  for (const s of CHEATSHEETS) {
    md += `## ${s.title}\n\n`;
    for (const e of s.entries) {
      md += `### ${e.title}\n\n\`\`\`sql\n${e.sql}\n\`\`\`\n\n> ${e.note}\n>\n> **Use for:** ${e.useCase}\n\n`;
    }
  }
  return md;
}

function buildInterviewMd(): string {
  let md = "# SQL Master AI — Interview Notes\n\n";
  for (const q of INTERVIEW_QUESTIONS) {
    md += `## ${q.question}\n\n*Difficulty: ${q.difficulty} · Tracks: ${q.tracks.join(", ")}*\n\n**Hint:** ${q.hint}\n\n\`\`\`sql\n${q.solution}\n\`\`\`\n\n${q.explanation}\n\n`;
    if (q.optimization) md += `**Optimization:** ${q.optimization}\n\n`;
  }
  return md;
}

function buildRoadmapMd(): string {
  let md = "# SQL Master AI — Learning Roadmap\n\n";
  for (const stage of ROADMAP) {
    md += `## ${stage.level} — ${stage.tagline}\n\n*Outcome: ${stage.outcome}*\n\n`;
    for (const n of stage.nodes) {
      md += `- [ ] **${n.title}** (~${n.estMinutes} min) — ${n.summary}\n`;
    }
    md += "\n";
  }
  return md;
}

function buildFlashcardsCsv(): string {
  const rows: string[] = ["front,back"];
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  for (const t of TOPICS) {
    rows.push(`${esc("What is " + t.title + "?")},${esc(t.definition)}`);
    for (const qz of t.quiz) {
      rows.push(`${esc(qz.q)},${esc(qz.options[qz.answer] + " — " + qz.why)}`);
    }
  }
  for (const f of SQL_FUNCTIONS.slice(0, 30)) {
    rows.push(`${esc(f.name + " — syntax?")},${esc(f.syntax.replace(/\n/g, " | "))}`);
  }
  return rows.join("\n");
}

function buildMindMapMd(): string {
  let md = "# SQL Mind Map (outline format — import into any mind-map tool)\n\n";
  const cats = new Map<string, string[]>();
  for (const t of TOPICS) {
    if (!cats.has(t.category)) cats.set(t.category, []);
    cats.get(t.category)!.push(t.title);
  }
  md += "- SQL Mastery\n";
  for (const [cat, items] of cats) {
    md += `  - ${cat}\n`;
    for (const i of items) md += `    - ${i}\n`;
  }
  return md;
}

const ITEMS = [
  { icon: FileText, title: "SQL Cheat Sheet", desc: "All 27 copy-ready patterns with notes and use cases.", file: "sql-cheatsheet.md", build: buildCheatsheetMd },
  { icon: Sparkles, title: "Interview Notes", desc: "Every interview question with solutions and grading criteria.", file: "sql-interview-notes.md", build: buildInterviewMd },
  { icon: MapIcon, title: "Learning Roadmap", desc: "The full Beginner→Expert checklist as a markdown todo list.", file: "sql-roadmap.md", build: buildRoadmapMd },
  { icon: Layers, title: "Flashcards (CSV)", desc: "80+ Anki-importable cards from topics, quizzes, and functions.", file: "sql-flashcards.csv", build: buildFlashcardsCsv },
  { icon: MapIcon, title: "Mind Map Outline", desc: "Topic hierarchy in outline format for XMind/Whimsical import.", file: "sql-mindmap.md", build: buildMindMapMd },
];

/** Render a markdown-ish string to a simple, readable PDF via jsPDF. */
async function downloadPdf(filename: string, markdown: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const width = pageW - margin * 2;
  let y = margin;

  const write = (text: string, size: number, style: "normal" | "bold" | "italic", rgb: [number, number, number], indent = 0) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    for (const w of doc.splitTextToSize(text || " ", width - indent)) {
      if (y > pageH - margin) { doc.addPage(); y = margin; }
      doc.text(w, margin + indent, y);
      y += size * 1.35;
    }
  };

  let inCode = false;
  for (const raw of markdown.split("\n")) {
    if (raw.startsWith("```")) { inCode = !inCode; y += 4; continue; }
    if (inCode) { doc.setFont("courier", "normal"); write(raw, 9, "normal", [30, 90, 170], 10); continue; }
    if (raw.startsWith("# ")) { y += 8; write(raw.slice(2), 18, "bold", [24, 24, 32]); y += 4; continue; }
    if (raw.startsWith("## ")) { y += 10; write(raw.slice(3), 14, "bold", [88, 60, 190]); y += 2; continue; }
    if (raw.startsWith("### ")) { y += 5; write(raw.slice(4), 11, "bold", [40, 40, 60]); continue; }
    if (raw.trim() === "") { y += 6; continue; }
    write(raw.replace(/\*\*/g, "").replace(/^>\s?/, "• "), 10, "normal", [45, 45, 55]);
  }
  doc.save(filename);
}

export default function DownloadsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle
        icon={<Download size={22} className="text-brand-500" />}
        title="Downloads"
        subtitle="Take the content with you. Files are generated live from the same knowledge base that powers the app — always in sync."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <Card key={item.file} className="flex flex-col p-5">
            <item.icon size={20} className="mb-3 text-brand-500" />
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mb-4 mt-1 flex-1 text-[13px] text-[var(--muted)]">{item.desc}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadText(item.file, item.build(), item.file.endsWith(".csv") ? "text/csv" : "text/markdown")}
              >
                <Download size={13} /> {item.file.split(".").pop()!.toUpperCase()}
              </Button>
              {!item.file.endsWith(".csv") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadPdf(item.file.replace(/\.\w+$/, ".pdf"), item.build())}
                >
                  <FileDown size={13} /> PDF
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-[12px] text-[var(--muted)]">
        Markdown files render beautifully in Notion, Obsidian, and GitHub. PDFs are generated in your browser — nothing is uploaded.
      </p>
    </div>
  );
}
