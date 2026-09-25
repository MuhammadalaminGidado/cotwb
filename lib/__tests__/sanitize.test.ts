import { describe, it, expect } from "vitest";
import { sanitizePieceBody } from "@/lib/sanitize";

describe("sanitizePieceBody", () => {
  it("keeps allowed Tiptap formatting", () => {
    const html =
      "<h2>Head</h2><p>Some <strong>bold</strong> and <em>italic</em> text.</p><ul><li>item</li></ul>";
    expect(sanitizePieceBody(html)).toBe(html);
  });

  it("strips script tags and their content attributes", () => {
    const out = sanitizePieceBody("<p>ok</p><script>alert(1)</script>");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
  });

  it("strips event handlers", () => {
    const out = sanitizePieceBody('<p onclick="evil()">hi</p><img src="x.png" onerror="evil()">');
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("onerror");
  });

  it("strips javascript: scheme hrefs", () => {
    const out = sanitizePieceBody('<a href="javascript:evil()">x</a>');
    expect(out).not.toContain("javascript:");
  });

  it("keeps safe hrefs", () => {
    const out = sanitizePieceBody('<a href="https://example.com">x</a>');
    expect(out).toContain('href="https://example.com"');
  });

  it("strips disallowed tags like iframe and style", () => {
    const out = sanitizePieceBody("<p>ok</p><iframe src=\"https://evil.com\"></iframe><style>.x{}</style>");
    expect(out).not.toContain("<iframe");
    expect(out).not.toContain("<style");
  });

  it("keeps img with allowed attributes", () => {
    const out = sanitizePieceBody('<img src="https://example.com/a.png" alt="A">');
    expect(out).toContain('src="https://example.com/a.png"');
    expect(out).toContain('alt="A"');
  });
});
