"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-6">
        <h1 className="text-lg font-semibold text-text-primary">Something went wrong</h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">{error.message || "Unexpected error"}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 rounded-full bg-accent-primary px-5 py-2 text-sm font-medium text-text-inverse"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
