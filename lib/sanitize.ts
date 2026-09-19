import sanitizeHtml from "sanitize-html";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "hr", "blockquote", "pre", "code", "h1", "h2", "h3", "h4", "strong", "em", "u", "s", "mark", "ul", "ol", "li", "a", "img", "span"],
  allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt", "width", "height"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (tagName, attribs) => {
      const out: Record<string, string> = { ...attribs };
      if (out.target === "_blank" && !out.rel) out.rel = "noopener noreferrer";
      // Always ensure rel is present when target blank to prevent window.opener
      if (out.target === "_blank" && out.rel && !out.rel.includes("noopener")) {
        out.rel = `${out.rel} noopener noreferrer`.trim();
      }
      return { tagName, attribs: out };
    },
  },
};

export function sanitizePieceBody(body: string): string {
  return sanitizeHtml(body, SANITIZE_OPTIONS);
}

export function excerpt(html: string, max = 180): string {
  const text = html.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}
