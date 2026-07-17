"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bookmark, BookOpen, Bot, Braces, Database, Download, FileText, Flame,
  GitBranch, Home, Layers, ListChecks, Map, Menu, Settings, Table2,
  Terminal, Trophy, Upload, User, X, Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme";
import { GlobalSearch } from "@/components/global-search";
import { useAppStore, levelForXp } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { section: "Overview", items: [
    { href: "/home", label: "Home", icon: Home },
    { href: "/assistant", label: "AI SQL Assistant", icon: Bot },
    { href: "/playground", label: "SQL Playground", icon: Terminal },
    { href: "/import", label: "Import Data & Test", icon: Upload },
    { href: "/roadmap", label: "SQL Roadmap", icon: Map },
  ]},
  { section: "Reference", items: [
    { href: "/learn", label: "Learn SQL", icon: BookOpen },
    { href: "/cheatsheets", label: "Cheat Sheets", icon: FileText },
    { href: "/functions", label: "Functions", icon: Braces },
    { href: "/visualizer", label: "Visualizer", icon: Layers },
    { href: "/databases", label: "Database Explorer", icon: Database },
  ]},
  { section: "Practice", items: [
    { href: "/practice", label: "Practice Questions", icon: ListChecks },
    { href: "/interview", label: "Interview Prep", icon: Trophy },
    { href: "/er-diagram", label: "ER Diagram Builder", icon: GitBranch },
  ]},
  { section: "You", items: [
    { href: "/downloads", label: "Downloads", icon: Download },
    { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/settings", label: "Settings", icon: Settings },
  ]},
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const xp = useAppStore((s) => s.xp);
  const streak = useAppStore((s) => s.streak);
  const touchStreak = useAppStore((s) => s.touchStreak);

  useEffect(() => {
    setMounted(true);
    touchStreak();
  }, [touchStreak]);

  useEffect(() => setMobileOpen(false), [pathname]);

  const lvl = levelForXp(xp);

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2 px-5 py-5 font-bold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-white">
          <Table2 size={15} />
        </span>
        <span>SQL Master <span className="gradient-text">AI</span></span>
      </Link>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              {group.section}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all",
                      active
                        ? "bg-gradient-to-r from-brand-500/15 to-violet-500/10 text-brand-600 dark:text-brand-300"
                        : "text-[var(--muted)] hover:bg-zinc-500/8 hover:text-[var(--fg)]"
                    )}
                  >
                    <item.icon size={15} className={active ? "text-brand-500" : ""} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      {/* XP footer */}
      <div className="border-t border-[var(--border)] p-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold">{mounted ? lvl.title : "SQL Novice"}</span>
          <span className="flex items-center gap-1 text-[var(--muted)]">
            <Zap size={11} className="text-amber-500" /> {mounted ? xp : 0} XP
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-500/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-700"
            style={{ width: `${mounted ? lvl.pct : 0}%` }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-[var(--border)] bg-[var(--card)] lg:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-[var(--card)] shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-5 cursor-pointer text-[var(--muted)]"
            >
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* Topbar */}
        <header className="glass sticky top-0 z-30 flex h-14 items-center gap-3 px-4">
          <button className="cursor-pointer lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu size={18} />
          </button>
          <div className="flex-1">
            <GlobalSearch />
          </div>
          <div
            className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold"
            title="Daily streak"
          >
            <Flame size={13} className="text-orange-500" />
            {mounted ? streak : 0}
          </div>
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
