import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (hoisted so vi.mock factories can reference them) ─────────

const {
  mockCurrentUser,
  mockFindFirst,
  mockUpdateSet,
  mockUpdateWhere,
  mockUpdateWhereReturning,
  mockInsertValues,
  mockDb,
} = vi.hoisted(() => {
  const mockCurrentUser = vi.fn();
  const mockFindFirst = vi.fn();
  const mockUpdateSet = vi.fn();
  const mockUpdateWhere = vi.fn();
  const mockUpdateWhereReturning = vi.fn();
  const mockInsertValues = vi.fn();

  const mockDb = {
    query: {
      users: { findFirst: mockFindFirst },
      pieces: { findFirst: vi.fn(), findMany: vi.fn() },
    },
    update: vi.fn(() => ({
      set: (...args: unknown[]) => {
        mockUpdateSet(...args);
        return {
          where: (...wArgs: unknown[]) => {
            mockUpdateWhere(...wArgs);
            const p = Promise.resolve(undefined) as Promise<void> & {
              returning: typeof mockUpdateWhereReturning;
            };
            (p as unknown as Record<string, unknown>).returning = mockUpdateWhereReturning;
            return p as unknown as Promise<void>;
          },
        };
      },
    })),
    insert: vi.fn(() => ({
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return {
          returning: vi.fn(() => Promise.resolve([])),
          onConflictDoNothing: vi.fn(() => Promise.resolve()),
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
    mockFindFirst,
    mockUpdateSet,
    mockUpdateWhere,
    mockUpdateWhereReturning,
    mockInsertValues,
    mockDb,
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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
import { becomeWriter, revokeWriter } from "@/lib/actions/writer";
import { revalidatePath } from "next/cache";

// ─── Helpers ──────────────────────────────────────────────────────────

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    clerkId: "clerk_test_1",
    role: "user",
    isWriter: false,
    username: "testuser",
    displayName: "Test User",
    bio: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("becomeWriter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockReset();
    mockFindFirst.mockReset();
    mockUpdateSet.mockReset();
    mockUpdateWhere.mockReset();
  });

  it("rejects unauthenticated call", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const result = await becomeWriter();

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to become a writer.",
    });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("rejects when already a writer", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ isWriter: true }));

    const result = await becomeWriter();

    expect(result).toEqual({
      success: false,
      error: "You are already a writer.",
    });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("happy path — sets isWriter true", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ isWriter: false }));

    const result = await becomeWriter();

    expect(result).toEqual({ success: true });
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ isWriter: true }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
    expect(revalidatePath).toHaveBeenCalledWith("/write");
  });
});

describe("revokeWriter", () => {
  const targetId = "22222222-2222-4222-8222-222222222222";
  const adminId = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockReset();
    mockFindFirst.mockReset();
    mockUpdateSet.mockReset();
    mockUpdateWhere.mockReset();
  });

  it("rejects unauthenticated call", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const result = await revokeWriter({ userId: targetId });

    expect(result).toEqual({
      success: false,
      error: "You must be signed in.",
    });
  });

  it("rejects invalid input (bad uuid)", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ role: "admin", isWriter: true }));

    const result = await revokeWriter({ userId: "not-a-uuid" });

    expect(result).toEqual({
      success: false,
      error: "Invalid input.",
    });
  });

  it("rejects non-admin caller", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ role: "user", isWriter: true }));

    const result = await revokeWriter({ userId: targetId });

    expect(result).toEqual({
      success: false,
      error: "Only admins can revoke writer status.",
    });
  });

  it("rejects when target not found", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ id: adminId, role: "admin" }));
    mockFindFirst.mockResolvedValue(null);

    const result = await revokeWriter({ userId: targetId });

    expect(result).toEqual({
      success: false,
      error: "User not found.",
    });
  });

  it("rejects when target is not a writer", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ id: adminId, role: "admin" }));
    mockFindFirst.mockResolvedValue(makeUser({ id: targetId, isWriter: false }));

    const result = await revokeWriter({ userId: targetId });

    expect(result).toEqual({
      success: false,
      error: "User is not a writer.",
    });
  });

  it("happy path — admin revokes writer", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ id: adminId, role: "admin" }));
    mockFindFirst.mockResolvedValue(makeUser({ id: targetId, isWriter: true }));

    const result = await revokeWriter({ userId: targetId });

    expect(result).toEqual({ success: true });
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ isWriter: false }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/write");
  });
});
