"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client runtime errors
    console.error("Dashboard error caught by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)] text-[var(--text)]">
      <div className="max-w-md w-full bg-[var(--card)] border border-[var(--line)] rounded-2xl p-6 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--bad-bg)] text-[var(--bad)] flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-sm text-[var(--muted)] mb-6">
          The dashboard encountered an unexpected error. You can try refreshing
          the page or reloading state.
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-[var(--ink)] text-[var(--ink-text)] hover:opacity-90 active:scale-95 transition-all w-full cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
