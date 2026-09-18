import sanitizeHtml from "sanitize-html";

// Tiptap StarterKit output + links/images. Everything else is stripped
// server-side before render — piece bodies are user-submitted HTML.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "blockquote", "pre", "code",
    "h1", "h2", "h3", "h4",
    "strong", "em", "u", "s", "mark",
    "ul", "ol", "li",
    "a", "img", "span",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};

export function sanitizePieceBody(body: string): string {
  return sanitizeHtml(body, SANITIZE_OPTIONS);
}

export function sanitizeHeadline(headline: string): string {
  // ts_headline output contains <mark> highlights — SANITIZE_OPTIONS already
  // allows mark, so reuse the same allowlist (explicit wrapper for intent).
  return sanitizeHtml(headline, SANITIZE_OPTIONS);
}
