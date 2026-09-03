"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { updatePiece } from "@/lib/actions/pieces";

type Props = {
  pieceId: string;
  initialTitle: string;
  initialBody: string;
  initialVisibility: "public" | "group" | "private";
  onSubmitted?: () => void;
};

export function PieceEditor({
  pieceId,
  initialTitle,
  initialBody,
  initialVisibility,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef({ title: initialTitle, body: initialBody, visibility: initialVisibility });

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialBody || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[280px] px-4 py-3 focus:outline-none",
      },
    },
  });

  const doSave = useCallback(
    (nextTitle: string, nextBody: string, nextVisibility: string) => {
      // Skip if nothing changed
      if (
        nextTitle === lastSavedRef.current.title &&
        nextBody === lastSavedRef.current.body &&
        nextVisibility === lastSavedRef.current.visibility
      ) {
        return;
      }

      setSaveState("saving");
      setError(null);

      startTransition(async () => {
        const result = await updatePiece({
          id: pieceId,
          title: nextTitle,
          body: nextBody,
          visibility: nextVisibility as "public" | "group" | "private",
        });

        if (result.success) {
          lastSavedRef.current = {
            title: nextTitle,
            body: nextBody,
            visibility: nextVisibility as "public" | "group" | "private",
          };
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 1500);
        } else {
          // Session expiry mid-edit: autosave fails due to expired Clerk token.
          // Redirect to sign-in with redirect_url back to this draft so no
          // work is lost (autosave already persisted prior keystrokes).
          if (result.error.toLowerCase().includes("signed in")) {
            const redirect = encodeURIComponent(window.location.pathname);
            router.push(`/sign-in?redirect_url=${redirect}`);
            return;
          }
          setSaveState("error");
          setError(result.error);
        }
      });
    },
    [pieceId, router],
  );

  const scheduleSave = useCallback(
    (nextTitle: string, nextBody: string, nextVisibility: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        doSave(nextTitle, nextBody, nextVisibility);
      }, 800);
    },
    [doSave],
  );

  // Autosave on title change
  useEffect(() => {
    if (title === initialTitle) return;
    const body = editor?.getHTML() ?? initialBody;
    scheduleSave(title, body, visibility);
  }, [title, editor, initialTitle, initialBody, visibility, scheduleSave]);

  // Autosave on visibility change
  useEffect(() => {
    if (visibility === initialVisibility) return;
    const body = editor?.getHTML() ?? initialBody;
    scheduleSave(title, body, visibility);
  }, [visibility, initialVisibility, title, editor, initialBody, scheduleSave]);

  // Autosave on editor content change
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const body = editor.getHTML();
      scheduleSave(title, body, visibility);
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor, title, visibility, scheduleSave]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : "Autosaves after 800ms";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-lg font-semibold text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-text-primary">
            Visibility
          </label>
          <select
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as "public" | "group" | "private")
            }
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary focus:border-accent-primary focus:outline-none"
          >
            <option value="public">Public</option>
            <option value="group">Group</option>
            <option value="private">Private</option>
          </select>

          <span
            className={`ml-auto text-xs ${
              saveState === "error"
                ? "text-danger"
                : saveState === "saved"
                  ? "text-success"
                  : "text-text-muted"
            }`}
            aria-live="polite"
          >
            {saveLabel}
          </span>
        </div>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap gap-1 border-b border-border p-2">
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")}>
            Bold
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")}>
            Italic
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })}>
            H2
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")}>
            List
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")}>
            Quote
          </ToolbarButton>
        </div>
        <EditorContent editor={editor} />
      </div>

      <p className="text-xs text-text-muted">
        Drafts autosave. Submit for review from the edit page when ready.
      </p>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-accent-primary text-text-inverse"
          : "border border-border bg-surface text-text-primary hover:bg-bg"
      }`}
    >
      {children}
    </button>
  );
}
