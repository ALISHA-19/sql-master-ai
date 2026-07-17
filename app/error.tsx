"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

/**
 * Route-level error boundary. If any page throws during render, the user sees
 * this graceful fallback (with a retry) instead of a blank screen.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // In a real app this would go to an error-reporting service.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/12 text-red-500">
        <AlertTriangle size={26} />
      </div>
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
        An unexpected error occurred while rendering this page. Your data is safe — it all lives in
        your browser. You can retry, or head back home.
      </p>
      {error?.message && (
        <pre className="mt-4 max-w-md overflow-x-auto rounded-lg border border-[var(--border)] bg-zinc-500/5 p-3 text-left font-mono text-[11px] text-[var(--muted)]">
          {error.message}
        </pre>
      )}
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg"
        >
          <RotateCcw size={14} /> Try again
        </button>
        <Link
          href="/home"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:border-brand-400/60"
        >
          <Home size={14} /> Go home
        </Link>
      </div>
    </div>
  );
}
