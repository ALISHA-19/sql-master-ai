"use client";

import { useEffect, useState } from "react";

/**
 * Reads a single query-string parameter on the client.
 *
 * We deliberately avoid next/navigation's `useSearchParams`, which suspends
 * until the params are available and — for our statically-generated client
 * pages — can leave the Suspense boundary stuck on its fallback. Reading
 * `window.location.search` in an effect is fully client-side, never suspends,
 * and is exactly right for this browser-only app.
 */
export function useQueryParam(key: string): string | null {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setValue(params.get(key));
  }, [key]);
  return value;
}
