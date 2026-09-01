"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDraft } from "@/lib/actions/pieces";

export function NewPieceForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"public" | "group" | "private">("public");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createDraft({ title, body: body || "<p></p>", visibility });
      if (result.success) {
        router.push(`/write/${result.pieceId}/edit`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        required
        maxLength={256}
        className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-lg font-semibold text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
      />

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-text-primary">Visibility</label>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as "public" | "group" | "private")}
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary focus:border-accent-primary focus:outline-none"
        >
          <option value="public">Public</option>
          <option value="group">Group</option>
          <option value="private">Private</option>
        </select>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your piece… (HTML allowed, editor coming fully in Phase 4. You can paste HTML or plain text)"
          rows={12}
          className="w-full rounded-xl bg-surface px-4 py-3 text-sm leading-6 text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <p className="border-t border-border px-4 py-2 text-xs text-text-muted">
          Tip: you can switch to the rich Tiptap editor after creating the draft.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || !title.trim()}
          className="rounded-full bg-accent-primary px-6 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-light disabled:opacity-50"
        >
          {isPending ? "Creating…" : "Create draft"}
        </button>
      </div>
    </form>
  );
}
