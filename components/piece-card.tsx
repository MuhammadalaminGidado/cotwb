import Link from "next/link";
import type { PieceWithAuthor } from "@/lib/db/queries/pieces";
import { excerpt } from "@/lib/sanitize";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function PieceCard({ piece }: { piece: PieceWithAuthor }) {
  return (
    <li className="rounded-xl border border-border bg-surface p-6">
      <Link href={`/pieces/${piece.slug}`} className="group block">
        <h2 className="font-serif text-lg font-semibold text-text-primary transition-colors group-hover:text-accent-primary">
          {piece.title}
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-text-muted">{excerpt(piece.body)}</p>
      </Link>
      <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
        <Link href={`/authors/${piece.author.username}`} className="font-medium transition-colors hover:text-text-primary">
          {piece.author.displayName ?? piece.author.username}
        </Link>
        <span aria-hidden>·</span>
        <time dateTime={piece.publishedAt?.toISOString()}>
          {piece.publishedAt ? dateFormatter.format(piece.publishedAt) : dateFormatter.format(piece.createdAt)}
        </time>
      </div>
    </li>
  );
}
