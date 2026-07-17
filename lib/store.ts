"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  savedAt: string;
}

export interface HistoryEntry {
  sql: string;
  at: string;
  ok: boolean;
}

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  earnedAt: string;
}

const BADGE_DEFS: Record<string, { label: string; emoji: string }> = {
  "first-query": { label: "First Query", emoji: "⚡" },
  "query-10": { label: "10 Queries Run", emoji: "🔥" },
  "query-50": { label: "50 Queries Run", emoji: "🚀" },
  "first-topic": { label: "First Lesson", emoji: "📖" },
  "topic-5": { label: "5 Lessons Done", emoji: "🎓" },
  "topic-15": { label: "SQL Scholar", emoji: "🧠" },
  "first-problem": { label: "Problem Solver", emoji: "✅" },
  "problem-10": { label: "10 Problems Solved", emoji: "🏆" },
  "streak-3": { label: "3-Day Streak", emoji: "📅" },
  "streak-7": { label: "Week Streak", emoji: "🌟" },
  "ai-first": { label: "Asked the AI", emoji: "🤖" },
};

interface AppState {
  // Gamification
  xp: number;
  streak: number;
  lastVisit: string | null;
  badges: Badge[];
  queriesRun: number;
  aiQuestionsAsked: number;

  // Progress
  completedTopics: string[]; // topic slugs
  solvedProblems: string[]; // problem ids
  completedRoadmap: string[]; // roadmap node ids

  // Bookmarks: "topic:slug" | "function:name" | "question:id" | "cheat:id"
  bookmarks: string[];

  // Playground
  history: HistoryEntry[];
  savedQueries: SavedQuery[];

  addXp: (amount: number) => void;
  touchStreak: () => void;
  awardBadge: (id: string) => void;
  recordQueryRun: (sql: string, ok: boolean) => void;
  recordAiQuestion: () => void;
  toggleTopicComplete: (slug: string) => void;
  toggleProblemSolved: (id: string) => void;
  toggleRoadmapNode: (id: string) => void;
  toggleBookmark: (key: string) => void;
  saveQuery: (name: string, sql: string) => void;
  deleteSavedQuery: (id: string) => void;
  clearHistory: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      xp: 0,
      streak: 0,
      lastVisit: null,
      badges: [],
      queriesRun: 0,
      aiQuestionsAsked: 0,
      completedTopics: [],
      solvedProblems: [],
      completedRoadmap: [],
      bookmarks: [],
      history: [],
      savedQueries: [],

      addXp: (amount) => set((s) => ({ xp: s.xp + amount })),

      touchStreak: () => {
        const today = new Date().toISOString().slice(0, 10);
        const { lastVisit, streak, awardBadge } = get();
        if (lastVisit === today) return;
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const next = lastVisit === yesterday ? streak + 1 : 1;
        set({ lastVisit: today, streak: next });
        if (next >= 3) awardBadge("streak-3");
        if (next >= 7) awardBadge("streak-7");
      },

      awardBadge: (id) => {
        const def = BADGE_DEFS[id];
        if (!def) return;
        set((s) => {
          if (s.badges.some((b) => b.id === id)) return s;
          return {
            badges: [...s.badges, { id, ...def, earnedAt: new Date().toISOString() }],
            xp: s.xp + 50,
          };
        });
      },

      recordQueryRun: (sql, ok) => {
        const { awardBadge } = get();
        set((s) => ({
          queriesRun: s.queriesRun + 1,
          xp: s.xp + (ok ? 5 : 1),
          history: [{ sql, at: new Date().toISOString(), ok }, ...s.history].slice(0, 100),
        }));
        const n = get().queriesRun;
        if (n >= 1) awardBadge("first-query");
        if (n >= 10) awardBadge("query-10");
        if (n >= 50) awardBadge("query-50");
      },

      recordAiQuestion: () => {
        const { awardBadge } = get();
        set((s) => ({ aiQuestionsAsked: s.aiQuestionsAsked + 1, xp: s.xp + 3 }));
        awardBadge("ai-first");
      },

      toggleTopicComplete: (slug) => {
        const { awardBadge } = get();
        set((s) => {
          const done = s.completedTopics.includes(slug);
          return {
            completedTopics: done
              ? s.completedTopics.filter((t) => t !== slug)
              : [...s.completedTopics, slug],
            xp: s.xp + (done ? -20 : 20),
          };
        });
        const n = get().completedTopics.length;
        if (n >= 1) awardBadge("first-topic");
        if (n >= 5) awardBadge("topic-5");
        if (n >= 15) awardBadge("topic-15");
      },

      toggleProblemSolved: (id) => {
        const { awardBadge } = get();
        set((s) => {
          const done = s.solvedProblems.includes(id);
          return {
            solvedProblems: done
              ? s.solvedProblems.filter((p) => p !== id)
              : [...s.solvedProblems, id],
            xp: s.xp + (done ? -30 : 30),
          };
        });
        const n = get().solvedProblems.length;
        if (n >= 1) awardBadge("first-problem");
        if (n >= 10) awardBadge("problem-10");
      },

      toggleRoadmapNode: (id) =>
        set((s) => ({
          completedRoadmap: s.completedRoadmap.includes(id)
            ? s.completedRoadmap.filter((n) => n !== id)
            : [...s.completedRoadmap, id],
        })),

      toggleBookmark: (key) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(key)
            ? s.bookmarks.filter((b) => b !== key)
            : [...s.bookmarks, key],
        })),

      saveQuery: (name, sql) =>
        set((s) => ({
          savedQueries: [
            { id: crypto.randomUUID(), name, sql, savedAt: new Date().toISOString() },
            ...s.savedQueries,
          ],
        })),

      deleteSavedQuery: (id) =>
        set((s) => ({ savedQueries: s.savedQueries.filter((q) => q.id !== id) })),

      clearHistory: () => set({ history: [] }),
    }),
    { name: "sql-master-ai" }
  )
);

export function levelForXp(xp: number): { level: number; title: string; nextAt: number; pct: number } {
  const levels = [
    { at: 0, title: "SQL Novice" },
    { at: 100, title: "Query Apprentice" },
    { at: 300, title: "JOIN Journeyman" },
    { at: 600, title: "Aggregate Adept" },
    { at: 1000, title: "Window Wizard" },
    { at: 1600, title: "Optimization Oracle" },
    { at: 2500, title: "SQL Master" },
  ];
  let idx = 0;
  for (let i = 0; i < levels.length; i++) if (xp >= levels[i].at) idx = i;
  const nextAt = idx < levels.length - 1 ? levels[idx + 1].at : levels[idx].at;
  const prevAt = levels[idx].at;
  const pct = idx === levels.length - 1 ? 100 : Math.round(((xp - prevAt) / (nextAt - prevAt)) * 100);
  return { level: idx + 1, title: levels[idx].title, nextAt, pct };
}
