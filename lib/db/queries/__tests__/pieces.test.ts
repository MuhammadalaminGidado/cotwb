import { describe, it, expect } from "vitest";
import { canViewPiece } from "@/lib/db/queries/pieces";

// ─── Helpers ──────────────────────────────────────────────────────────

function makePiece(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    title: "Test",
    slug: "test",
    body: "<p>Body</p>",
    authorId: "11111111-1111-4111-8111-111111111111",
    visibility: "public",
    reviewStatus: "approved",
    promptId: null,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as Parameters<typeof canViewPiece>[0];
}

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    clerkId: "clerk_1",
    role: "user",
    isWriter: false,
    username: "user1",
    displayName: "User One",
    bio: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as Parameters<typeof canViewPiece>[1];
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("canViewPiece", () => {
  const authorId = "11111111-1111-4111-8111-111111111111";
  const otherId = "22222222-2222-4222-8222-222222222222";
  const adminUser = makeUser({ id: otherId, role: "admin" });
  const authorUser = makeUser({ id: authorId });
  const otherUser = makeUser({ id: otherId });
  const anon: null = null;

  describe("author and admin always can view", () => {
    it("author can view own draft (non-approved)", () => {
      const piece = makePiece({ authorId, reviewStatus: "draft", visibility: "private" });
      expect(canViewPiece(piece, authorUser, [])).toBe(true);
    });

    it("author can view own submitted", () => {
      const piece = makePiece({ authorId, reviewStatus: "submitted", visibility: "public" });
      expect(canViewPiece(piece, authorUser, [])).toBe(true);
    });

    it("author can view own rejected", () => {
      const piece = makePiece({ authorId, reviewStatus: "rejected", visibility: "group" });
      expect(canViewPiece(piece, authorUser, [])).toBe(true);
    });

    it("admin can view any draft", () => {
      const piece = makePiece({ authorId, reviewStatus: "draft", visibility: "private" });
      expect(canViewPiece(piece, adminUser, [])).toBe(true);
    });

    it("admin can view any private approved", () => {
      const piece = makePiece({ authorId, reviewStatus: "approved", visibility: "private" });
      expect(canViewPiece(piece, adminUser, [])).toBe(true);
    });

    it("admin can view group piece without membership", () => {
      const piece = makePiece({ authorId, reviewStatus: "approved", visibility: "group" });
      expect(canViewPiece(piece, adminUser, [])).toBe(true);
    });
  });

  describe("non-approved hidden from non-author/non-admin", () => {
    it("draft hidden from other user", () => {
      const piece = makePiece({ authorId, reviewStatus: "draft", visibility: "public" });
      expect(canViewPiece(piece, otherUser, [])).toBe(false);
    });

    it("submitted hidden from anon", () => {
      const piece = makePiece({ authorId, reviewStatus: "submitted", visibility: "public" });
      expect(canViewPiece(piece, anon, [])).toBe(false);
    });

    it("in_review hidden from group member", () => {
      const piece = makePiece({ authorId, reviewStatus: "in_review", visibility: "public" });
      expect(canViewPiece(piece, otherUser, ["group1"])).toBe(false);
    });

    it("rejected hidden from other user", () => {
      const piece = makePiece({ authorId, reviewStatus: "rejected", visibility: "public" });
      expect(canViewPiece(piece, otherUser, [])).toBe(false);
    });
  });

  describe("approved + public — visible to everyone", () => {
    it("visible to anon", () => {
      const piece = makePiece({ authorId, reviewStatus: "approved", visibility: "public" });
      expect(canViewPiece(piece, anon, [])).toBe(true);
    });

    it("visible to other user", () => {
      const piece = makePiece({ authorId, reviewStatus: "approved", visibility: "public" });
      expect(canViewPiece(piece, otherUser, [])).toBe(true);
    });

    it("visible to group member", () => {
      const piece = makePiece({ authorId, reviewStatus: "approved", visibility: "public" });
      expect(canViewPiece(piece, otherUser, ["g1"])).toBe(true);
    });
  });

  describe("approved + private — only author/admin", () => {
    it("hidden from anon", () => {
      const piece = makePiece({ authorId, reviewStatus: "approved", visibility: "private" });
      expect(canViewPiece(piece, anon, [])).toBe(false);
    });

    it("hidden from other user", () => {
      const piece = makePiece({ authorId, reviewStatus: "approved", visibility: "private" });
      expect(canViewPiece(piece, otherUser, [])).toBe(false);
    });

    it("hidden from group member", () => {
      const piece = makePiece({ authorId, reviewStatus: "approved", visibility: "private" });
      expect(canViewPiece(piece, otherUser, ["g1"])).toBe(false);
    });

    it("visible to author", () => {
      const piece = makePiece({ authorId, reviewStatus: "approved", visibility: "private" });
      expect(canViewPiece(piece, authorUser, [])).toBe(true);
    });
  });

  describe("approved + group — only group members (or author/admin)", () => {
    it("hidden from anon", () => {
      const piece = makePiece({ authorId, reviewStatus: "approved", visibility: "group" });
      expect(canViewPiece(piece, anon, [])).toBe(false);
    });

    it("hidden from non-member", () => {
      const piece = makePiece({ authorId, reviewStatus: "approved", visibility: "group" });
      expect(canViewPiece(piece, otherUser, [])).toBe(false);
    });

    it("visible to group member", () => {
      const piece = makePiece({ authorId, reviewStatus: "approved", visibility: "group" });
      expect(canViewPiece(piece, otherUser, ["group1"])).toBe(true);
    });

    it("visible to member of any group (current implementation)", () => {
      const piece = makePiece({ authorId, reviewStatus: "approved", visibility: "group" });
      expect(canViewPiece(piece, otherUser, ["any-group-id"])).toBe(true);
    });

    it("visible to author without membership (author bypass)", () => {
      const piece = makePiece({ authorId, reviewStatus: "approved", visibility: "group" });
      expect(canViewPiece(piece, authorUser, [])).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("unknown visibility returns false for non-author", () => {
      const piece = makePiece({ authorId, reviewStatus: "approved", visibility: "unknown" as unknown as string });
      expect(canViewPiece(piece, otherUser, ["g1"])).toBe(false);
    });

    it("null viewer with group ids still respects visibility", () => {
      // anon with group ids shouldn't happen, but test defensively
      const pub = makePiece({ authorId, reviewStatus: "approved", visibility: "public" });
      const grp = makePiece({ authorId, reviewStatus: "approved", visibility: "group" });
      const prv = makePiece({ authorId, reviewStatus: "approved", visibility: "private" });
      expect(canViewPiece(pub, anon, ["g1"])).toBe(true);
      expect(canViewPiece(grp, anon, ["g1"])).toBe(true); // anon + group ids still counts as group member per current logic
      expect(canViewPiece(prv, anon, ["g1"])).toBe(false);
    });
  });
});
