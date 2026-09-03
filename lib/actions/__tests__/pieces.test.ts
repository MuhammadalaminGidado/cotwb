import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (hoisted) ──────────────────────────────────────────────────

const {
  mockCurrentUser,
  mockPiecesFindFirst,
  mockUsersFindFirst,
  mockInsertValues,
  mockInsertReturning,
  mockUpdateSet,
  mockUpdateWhere,
  mockUpdateWhereReturning,
  mockSelectWhere,
  mockPieceVersionsInsertValues,
  mockDeleteWhere,
  mockRevalidatePath,
  mockDb,
} = vi.hoisted(() => {
  const mockCurrentUser = vi.fn();
  const mockPiecesFindFirst = vi.fn();
  const mockUsersFindFirst = vi.fn();
  const mockInsertValues = vi.fn();
  const mockInsertReturning = vi.fn();
  const mockUpdateSet = vi.fn();
  const mockUpdateWhere = vi.fn();
  const mockUpdateWhereReturning = vi.fn();
  const mockSelectWhere = vi.fn();
  const mockPieceVersionsInsertValues = vi.fn();
  const mockDeleteWhere = vi.fn();
  const mockRevalidatePath = vi.fn();

  // For select max version: db.select({maxVersion}).from(pieceVersions).where()
  const mockSelect = vi.fn(() => ({
    from: vi.fn(() => ({
      where: (...args: unknown[]) => {
        mockSelectWhere(...args);
        return Promise.resolve([{ maxVersion: 0 }]);
      },
    })),
  }));

  const mockDb = {
    query: {
      users: { findFirst: mockUsersFindFirst },
      pieces: { findFirst: mockPiecesFindFirst, findMany: vi.fn() },
    },
    insert: vi.fn((table: unknown) => {
      // Determine if it's pieceVersions (no returning needed) vs pieces
      const isPieceVersions =
        typeof table === "object" &&
        table !== null &&
        "name" in table === false; // crude, but we treat both same
      return {
        values: (...args: unknown[]) => {
          // Record all inserts
          mockInsertValues(...args);
          // Also record pieceVersions specifically
          if (String(table).includes("piece_versions") || isPieceVersions) {
            mockPieceVersionsInsertValues(...args);
          }
          return {
            returning: (...rArgs: unknown[]) => {
              mockInsertReturning(...rArgs);
              // createDraft returns [{id, slug}]
              return Promise.resolve([
                { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", slug: "test-title" },
              ]);
            },
            onConflictDoNothing: vi.fn(() => Promise.resolve()),
          };
        },
      };
    }),
    update: vi.fn(() => ({
      set: (...args: unknown[]) => {
        mockUpdateSet(...args);
        return {
          where: (...wArgs: unknown[]) => {
            mockUpdateWhere(...wArgs);
            const p = Promise.resolve([{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", slug: "updated-title" }]) as Promise<unknown> & {
              returning: typeof mockUpdateWhereReturning;
            };
            (p as unknown as Record<string, unknown>).returning = (...rArgs: unknown[]) => {
              mockUpdateWhereReturning(...rArgs);
              return Promise.resolve([
                { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", slug: "updated-title" },
              ]);
            };
            return p as unknown as Promise<unknown>;
          },
        };
      },
    })),
    select: mockSelect,
    delete: vi.fn(() => ({
      where: (...args: unknown[]) => {
        mockDeleteWhere(...args);
        return Promise.resolve();
      },
    })),
  };

  return {
    mockCurrentUser,
    mockPiecesFindFirst,
    mockUsersFindFirst,
    mockInsertValues,
    mockInsertReturning,
    mockUpdateSet,
    mockUpdateWhere,
    mockUpdateWhereReturning,
    mockSelectWhere,
    mockPieceVersionsInsertValues,
    mockDeleteWhere,
    mockRevalidatePath,
    mockDb,
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    currentUser: (...args: unknown[]) => mockCurrentUser(...args),
  };
});

vi.mock("@/lib/db/client", () => ({
  db: mockDb,
  pool: {},
}));

// Import after mocks
import { createDraft, updatePiece, submitForReview, deletePiece } from "@/lib/actions/pieces";

// ─── Helpers ──────────────────────────────────────────────────────────

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    clerkId: "clerk_test_1",
    role: "user",
    isWriter: true,
    username: "writer1",
    displayName: "Writer One",
    bio: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePiece(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    title: "Test Piece",
    slug: "test-piece",
    body: "<p>Hello</p>",
    authorId: "11111111-1111-4111-8111-111111111111",
    visibility: "public",
    reviewStatus: "draft",
    promptId: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("createDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockReset();
    mockPiecesFindFirst.mockReset();
    // Default: no slug collision
    mockPiecesFindFirst.mockResolvedValue(null);
  });

  it("rejects unauthenticated call", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const result = await createDraft({ title: "T", body: "<p>B</p>", visibility: "public" });

    expect(result).toEqual({
      success: false,
      error: "You must be a writer to create drafts.",
    });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("rejects non-writer", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ isWriter: false, role: "user" }));

    const result = await createDraft({ title: "T", body: "<p>B</p>", visibility: "public" });

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toMatch(/writer/);
  });

  it("rejects invalid input (empty title)", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());

    const result = await createDraft({ title: "", body: "<p>B</p>", visibility: "public" });

    expect(result.success).toBe(false);
  });

  it("happy path — creates draft", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());

    const result = await createDraft({ title: "My Title", body: "<p>Body</p>", visibility: "public" });

    expect(result).toEqual({
      success: true,
      pieceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      slug: "test-title",
    });
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/write");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
  });
});

describe("updatePiece", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockReset();
    mockPiecesFindFirst.mockReset();
    mockPiecesFindFirst.mockResolvedValue(makePiece());
  });

  it("rejects unauthenticated call", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const result = await updatePiece({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", title: "New" });

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to edit pieces.",
    });
  });

  it("rejects when piece not found", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());
    mockPiecesFindFirst.mockResolvedValue(null);

    const result = await updatePiece({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", title: "New" });

    expect(result).toEqual({ success: false, error: "Piece not found." });
  });

  it("rejects non-owner non-admin", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ id: "99999999-9999-4999-8999-999999999999" }));
    mockPiecesFindFirst.mockResolvedValue(makePiece({ authorId: "11111111-1111-4111-8111-111111111111" }));

    const result = await updatePiece({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", title: "New" });

    expect(result).toEqual({
      success: false,
      error: "You can only edit your own pieces.",
    });
  });

  it("rejects when piece is approved", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());
    mockPiecesFindFirst.mockResolvedValue(makePiece({ reviewStatus: "approved" }));

    const result = await updatePiece({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", title: "New" });

    expect(result).toEqual({
      success: false,
      error: "Approved pieces cannot be edited. Create a new version.",
    });
  });

  it("happy path — writes version and updates", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());
    mockPiecesFindFirst.mockResolvedValue(makePiece({ reviewStatus: "draft" }));

    const result = await updatePiece({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "Updated Title",
      body: "<p>New body</p>",
    });

    expect(result).toEqual({ success: true, slug: "updated-title" });
    // Version was written
    expect(mockPieceVersionsInsertValues).toHaveBeenCalled();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("admin can update others piece", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ id: "99999999-9999-4999-8999-999999999999", role: "admin" }));
    mockPiecesFindFirst.mockResolvedValue(makePiece({ authorId: "11111111-1111-4111-8111-111111111111", reviewStatus: "draft" }));

    const result = await updatePiece({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", title: "Admin Edit" });

    expect(result.success).toBe(true);
  });
});

describe("submitForReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockReset();
    mockPiecesFindFirst.mockReset();
  });

  it("rejects unauthenticated call", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const result = await submitForReview({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });

    expect(result).toEqual({
      success: false,
      error: "You must be a writer to submit for review.",
    });
  });

  it("rejects when piece not found", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());
    mockPiecesFindFirst.mockResolvedValue(null);

    const result = await submitForReview({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });

    expect(result).toEqual({ success: false, error: "Piece not found." });
  });

  it("rejects non-owner", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ id: "99999999-9999-4999-8999-999999999999" }));
    mockPiecesFindFirst.mockResolvedValue(makePiece({ authorId: "11111111-1111-4111-8111-111111111111" }));

    const result = await submitForReview({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toMatch(/own pieces/);
  });

  it("rejects when status is not draft/rejected", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());
    mockPiecesFindFirst.mockResolvedValue(makePiece({ reviewStatus: "submitted" }));

    const result = await submitForReview({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });

    expect(result).toEqual({
      success: false,
      error: "Cannot submit from status: submitted",
    });
  });

  it("happy path — draft → submitted", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());
    mockPiecesFindFirst.mockResolvedValue(makePiece({ reviewStatus: "draft" }));

    const result = await submitForReview({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });

    expect(result).toEqual({ success: true });
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/review-queue");
  });

  it("happy path — rejected → submitted", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());
    mockPiecesFindFirst.mockResolvedValue(makePiece({ reviewStatus: "rejected" }));

    const result = await submitForReview({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });

    expect(result).toEqual({ success: true });
  });
});

describe("deletePiece", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockReset();
    mockPiecesFindFirst.mockReset();
  });

  it("rejects unauthenticated call", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const result = await deletePiece({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });

    expect(result).toEqual({
      success: false,
      error: "You must be a writer to delete pieces.",
    });
  });

  it("rejects when piece not found", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());
    mockPiecesFindFirst.mockResolvedValue(null);

    const result = await deletePiece({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });

    expect(result).toEqual({ success: false, error: "Piece not found." });
  });

  it("rejects non-owner", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ id: "99999999-9999-4999-8999-999999999999" }));
    mockPiecesFindFirst.mockResolvedValue(makePiece({ authorId: "11111111-1111-4111-8111-111111111111" }));

    const result = await deletePiece({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });

    expect(result.success).toBe(false);
  });

  it("rejects approved piece", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());
    mockPiecesFindFirst.mockResolvedValue(makePiece({ reviewStatus: "approved" }));

    const result = await deletePiece({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });

    expect(result).toEqual({
      success: false,
      error: "Approved pieces cannot be deleted.",
    });
    expect(mockDb.delete).not.toHaveBeenCalled();
  });

  it("happy path — deletes draft", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());
    mockPiecesFindFirst.mockResolvedValue(makePiece({ reviewStatus: "draft" }));

    const result = await deletePiece({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });

    expect(result).toEqual({ success: true });
    expect(mockDb.delete).toHaveBeenCalled();
    expect(mockDeleteWhere).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/write");
  });
});
