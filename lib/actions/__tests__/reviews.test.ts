import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (hoisted) ──────────────────────────────────────────────────

const {
  mockCurrentUser,
  mockPiecesFindFirst,
  mockRevalidatePath,
  mockDb,
  mockInsertValues,
  mockUpdateSet,
} = vi.hoisted(() => {
  const mockCurrentUser = vi.fn();
  const mockPiecesFindFirst = vi.fn();
  const mockRevalidatePath = vi.fn();
  const mockInsertValues = vi.fn();
  const mockUpdateSet = vi.fn();

  const mockDb = {
    query: {
      users: { findFirst: vi.fn() },
      pieces: { findFirst: mockPiecesFindFirst, findMany: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return Promise.resolve();
      },
    })),
    update: vi.fn(() => ({
      set: (...args: unknown[]) => {
        mockUpdateSet(...args);
        return {
          where: vi.fn(() => Promise.resolve()),
        };
      },
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  };

  return {
    mockCurrentUser,
    mockPiecesFindFirst,
    mockRevalidatePath,
    mockDb,
    mockInsertValues,
    mockUpdateSet,
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
import { approvePiece, rejectPiece } from "@/lib/actions/reviews";

// ─── Helpers ──────────────────────────────────────────────────────────

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    clerkId: "clerk_test_1",
    role: "user",
    isWriter: true,
    username: "testuser",
    displayName: "Test",
    bio: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeAdmin() {
  return makeUser({ role: "admin", isWriter: false });
}

function makePiece(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    title: "Test Piece",
    slug: "test-piece",
    body: "<p>Body</p>",
    authorId: "99999999-9999-4999-8999-999999999999",
    visibility: "public",
    reviewStatus: "submitted",
    promptId: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const validPieceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

// ─── Tests ────────────────────────────────────────────────────────────

describe("approvePiece", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockReset();
    mockPiecesFindFirst.mockReset();
  });

  it("rejects unauthenticated call", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const result = await approvePiece({ pieceId: validPieceId });

    expect(result).toEqual({
      success: false,
      error: "Only admins can approve pieces.",
    });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("rejects non-admin caller", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ role: "user" }));

    const result = await approvePiece({ pieceId: validPieceId });

    expect(result).toEqual({
      success: false,
      error: "Only admins can approve pieces.",
    });
  });

  it("rejects invalid input (bad uuid)", async () => {
    mockCurrentUser.mockResolvedValue(makeAdmin());

    const result = await approvePiece({ pieceId: "not-a-uuid" });

    expect(result.success).toBe(false);
  });

  it("rejects when piece not found", async () => {
    mockCurrentUser.mockResolvedValue(makeAdmin());
    mockPiecesFindFirst.mockResolvedValue(null);

    const result = await approvePiece({ pieceId: validPieceId });

    expect(result).toEqual({ success: false, error: "Piece not found." });
  });

  it("rejects when status is draft", async () => {
    mockCurrentUser.mockResolvedValue(makeAdmin());
    mockPiecesFindFirst.mockResolvedValue(makePiece({ reviewStatus: "draft" }));

    const result = await approvePiece({ pieceId: validPieceId });

    expect(result).toEqual({
      success: false,
      error: "Cannot approve from status: draft",
    });
  });

  it("rejects when status is already approved", async () => {
    mockCurrentUser.mockResolvedValue(makeAdmin());
    mockPiecesFindFirst.mockResolvedValue(makePiece({ reviewStatus: "approved" }));

    const result = await approvePiece({ pieceId: validPieceId });

    expect(result.success).toBe(false);
  });

  it("happy path — submitted → approved with publishedAt and review row", async () => {
    mockCurrentUser.mockResolvedValue(makeAdmin());
    mockPiecesFindFirst.mockResolvedValue(makePiece({ reviewStatus: "submitted" }));

    const result = await approvePiece({ pieceId: validPieceId, notes: "Looks good" });

    expect(result).toEqual({ success: true });
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved", notes: "Looks good" }),
    );
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ reviewStatus: "approved" }),
    );
    // publishedAt should be set
    const setArg = (mockUpdateSet.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(setArg.publishedAt).toBeInstanceOf(Date);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/review-queue");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
  });

  it("happy path — in_review → approved", async () => {
    mockCurrentUser.mockResolvedValue(makeAdmin());
    mockPiecesFindFirst.mockResolvedValue(makePiece({ reviewStatus: "in_review" }));

    const result = await approvePiece({ pieceId: validPieceId });

    expect(result).toEqual({ success: true });
  });
});

describe("rejectPiece", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockReset();
    mockPiecesFindFirst.mockReset();
  });

  it("rejects unauthenticated call", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const result = await rejectPiece({ pieceId: validPieceId });

    expect(result).toEqual({
      success: false,
      error: "Only admins can reject pieces.",
    });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("rejects non-admin caller", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ role: "user" }));

    const result = await rejectPiece({ pieceId: validPieceId });

    expect(result).toEqual({
      success: false,
      error: "Only admins can reject pieces.",
    });
  });

  it("rejects when piece not found", async () => {
    mockCurrentUser.mockResolvedValue(makeAdmin());
    mockPiecesFindFirst.mockResolvedValue(null);

    const result = await rejectPiece({ pieceId: validPieceId });

    expect(result).toEqual({ success: false, error: "Piece not found." });
  });

  it("rejects when status is draft", async () => {
    mockCurrentUser.mockResolvedValue(makeAdmin());
    mockPiecesFindFirst.mockResolvedValue(makePiece({ reviewStatus: "draft" }));

    const result = await rejectPiece({ pieceId: validPieceId });

    expect(result).toEqual({
      success: false,
      error: "Cannot reject from status: draft",
    });
  });

  it("happy path — submitted → rejected with review row", async () => {
    mockCurrentUser.mockResolvedValue(makeAdmin());
    mockPiecesFindFirst.mockResolvedValue(makePiece({ reviewStatus: "submitted" }));

    const result = await rejectPiece({ pieceId: validPieceId, notes: "Needs work" });

    expect(result).toEqual({ success: true });
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ status: "rejected", notes: "Needs work" }),
    );
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ reviewStatus: "rejected" }),
    );
    // publishedAt should NOT be set on reject
    const setArg = (mockUpdateSet.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(setArg).not.toHaveProperty("publishedAt");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/review-queue");
  });

  it("happy path — in_review → rejected", async () => {
    mockCurrentUser.mockResolvedValue(makeAdmin());
    mockPiecesFindFirst.mockResolvedValue(makePiece({ reviewStatus: "in_review" }));

    const result = await rejectPiece({ pieceId: validPieceId });

    expect(result).toEqual({ success: true });
  });
});
