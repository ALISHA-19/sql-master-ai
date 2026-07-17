"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { AlertTriangle, Keyboard, Monitor, Moon, Settings, Sun, Trash2 } from "lucide-react";
import { Button, Card, Kbd, SectionTitle } from "@/components/ui/primitives";
import { resetDb } from "@/lib/db/engine";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setMounted(true), []);

  const wipeProgress = () => {
    localStorage.removeItem("sql-master-ai");
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <SectionTitle icon={<Settings size={22} className="text-brand-500" />} title="Settings" />

      <div className="space-y-5">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-bold">Appearance</h3>
          <div className="flex gap-2">
            {([
              ["light", Sun, "Light"],
              ["dark", Moon, "Dark"],
              ["system", Monitor, "System"],
            ] as const).map(([val, Icon, label]) => (
              <button
                key={val}
                onClick={() => setTheme(val)}
                className={`flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-xl border py-3.5 text-xs font-medium transition-colors ${
                  mounted && theme === val
                    ? "border-brand-500/60 bg-brand-500/10 text-brand-500"
                    : "border-[var(--border)] text-[var(--muted)] hover:border-brand-500/40"
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Keyboard size={14} /> Keyboard shortcuts
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Global search</span>
              <span><Kbd>Ctrl</Kbd> + <Kbd>K</Kbd></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Run query (playground)</span>
              <span><Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Send message (assistant)</span>
              <span><Kbd>Enter</Kbd></span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-2 text-sm font-bold">Sample database</h3>
          <p className="mb-3 text-[13px] text-[var(--muted)]">
            Restore the playground database to its original state (undoes your INSERTs/UPDATEs/DROPs).
          </p>
          <Button variant="outline" size="sm" onClick={() => resetDb()}>
            Reset sample database
          </Button>
        </Card>

        <Card className="border-red-500/25 p-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-red-500">
            <AlertTriangle size={14} /> Danger zone
          </h3>
          <p className="mb-3 text-[13px] text-[var(--muted)]">
            Erase ALL local progress: XP, streaks, badges, completed topics, solved problems, bookmarks,
            history, and saved queries. This cannot be undone.
          </p>
          {confirming ? (
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={wipeProgress}>
                <Trash2 size={13} /> Yes, erase everything
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="border-red-500/40 text-red-500" onClick={() => setConfirming(true)}>
              <Trash2 size={13} /> Reset all progress…
            </Button>
          )}
        </Card>

        <p className="text-center text-[12px] text-[var(--muted)]">
          All data lives in your browser&apos;s localStorage. Nothing is sent to any server.
        </p>
      </div>
    </div>
  );
}
