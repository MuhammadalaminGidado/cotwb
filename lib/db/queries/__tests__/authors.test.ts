import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    query: {
      users: { findFirst: vi.fn() },
      pieces: { findMany: vi.fn() },
    },
  },
}));

vi.mock("@/lib/db/client", () => ({ db: mockDb, pool: {} }));

import {
  getUserByUsername,
  getPublishedPiecesByAuthor,
} from "@/lib/db/queries/authors";

function makeAuthor(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    clerkId: "clerk_1",
    username: "ada",
    displayName: "Ada",
    bio: "writes",
    image: null,
    role: "user",
    isWriter: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("getUserByUsername", () => {
  beforeEach(() => vi.clearAllMocks());

  it("looks up by exact username", async () => {
    const author = makeAuthor();
    mockDb.query.users.findFirst.mockResolvedValue(author);
    const result = await getUserByUsername("ada");
    expect(result).toEqual(author);
    expect(mockDb.query.users.findFirst).toHaveBeenCalledWith({
      where: expect.anything(),
    });
  });

  it("returns null when no user matches", async () => {
    mockDb.query.users.findFirst.mockResolvedValue(undefined);
    const result = await getUserByUsername("ghost");
    expect(result).toBeNull();
  });
});

describe("getPublishedPiecesByAuthor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns pieces with author relation joined", async () => {
    const rows = [{ id: "p1", title: "T", author: makeAuthor() }];
    mockDb.query.pieces.findMany.mockResolvedValue(rows);
    const result = await getPublishedPiecesByAuthor("11111111-1111-4111-8111-111111111111");
    expect(result).toEqual(rows);
    expect(mockDb.query.pieces.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        with: { author: true },
        where: expect.anything(),
        orderBy: expect.anything(),
      }),
    );
  });

  it("applies pagination options", async () => {
    mockDb.query.pieces.findMany.mockResolvedValue([]);
    await getPublishedPiecesByAuthor("11111111-1111-4111-8111-111111111111", {
      limit: 5,
      offset: 10,
    });
    expect(mockDb.query.pieces.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 10 }),
    );
  });
});
