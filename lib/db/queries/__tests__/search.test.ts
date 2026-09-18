import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => {
  const chain = (): Record<string, ReturnType<typeof vi.fn>> => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    c.innerJoin = vi.fn(() => c);
    c.where = vi.fn(() => c);
    c.orderBy = vi.fn(() => c);
    c.limit = vi.fn(() => c);
    c.offset = vi.fn(() => Promise.resolve([]));
    c.from = vi.fn(() => c);
    c.select = vi.fn(() => c);
    return c;
  };
  const selectChain = chain();
  const selectFn = vi.fn(() => selectChain);
  return {
    mockDb: {
      select: selectFn,
      __selectChain: selectChain,
      __selectFn: selectFn,
      query: { pieces: { findMany: vi.fn() } },
    },
  };
});

const { mockGetViewerGroupIds } = vi.hoisted(() => ({
  mockGetViewerGroupIds: vi.fn(async () => [] as string[]),
}));

vi.mock("@/lib/db/client", () => ({ db: mockDb, pool: {} }));
vi.mock("@/lib/db/queries/shared", () => ({
  getViewerGroupIds: mockGetViewerGroupIds,
}));

import { searchPieces, searchPiecesCount } from "@/lib/db/queries/search";

function makeViewer(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    clerkId: "clerk_1",
    role: "user",
    isWriter: false,
    username: "testuser",
    displayName: "Test",
    ...overrides,
  } as unknown as Parameters<typeof searchPieces>[1];
}

describe("searchPieces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetViewerGroupIds.mockResolvedValue([]);
    mockDb.__selectChain.offset.mockResolvedValue([]);
  });

  it("returns [] without DB hit for empty query", async () => {
    const res = await searchPieces("", null);
    expect(res).toEqual([]);
    expect(mockDb.__selectFn).not.toHaveBeenCalled();
  });

  it("returns [] for short query (<2 chars)", async () => {
    const res = await searchPieces("a", null);
    expect(res).toEqual([]);
    expect(mockDb.__selectFn).not.toHaveBeenCalled();
  });

  it("trims query and still short-circuits whitespace", async () => {
    const res = await searchPieces("  ", null);
    expect(res).toEqual([]);
    expect(mockDb.__selectFn).not.toHaveBeenCalled();
  });

  it("queries with ts_vector match and rank ordering for anon", async () => {
    mockDb.__selectChain.offset.mockResolvedValue([]);
    await searchPieces("poetry", null, { limit: 5, offset: 10 });
    expect(mockDb.__selectFn).toHaveBeenCalled();
    expect(mockDb.__selectChain.innerJoin).toHaveBeenCalled();
    expect(mockDb.__selectChain.where).toHaveBeenCalledWith(expect.anything());
    expect(mockDb.__selectChain.orderBy).toHaveBeenCalled();
    expect(mockDb.__selectChain.limit).toHaveBeenCalledWith(5);
    expect(mockDb.__selectChain.offset).toHaveBeenCalledWith(10);
    expect(mockGetViewerGroupIds).toHaveBeenCalledWith(null);
  });

  it("includes author bypass OR branch when viewer is present", async () => {
    const viewer = makeViewer();
    mockGetViewerGroupIds.mockResolvedValue([]);
    mockDb.__selectChain.offset.mockResolvedValue([]);
    await searchPieces("fiction", viewer);
    expect(mockDb.__selectChain.where).toHaveBeenCalled();
    expect(mockGetViewerGroupIds).toHaveBeenCalledWith(viewer);
  });

  it("fetches group ids and allows group visibility when member", async () => {
    const viewer = makeViewer({ id: "viewer-1" });
    mockGetViewerGroupIds.mockResolvedValue(["g1"]);
    mockDb.__selectChain.offset.mockResolvedValue([]);
    await searchPieces("sunset", viewer);
    expect(mockGetViewerGroupIds).toHaveBeenCalledWith(viewer);
    expect(mockDb.__selectChain.where).toHaveBeenCalled();
  });

  it("admin bypass still queries (visibility not filtered)", async () => {
    const admin = makeViewer({ role: "admin" });
    mockGetViewerGroupIds.mockResolvedValue([]);
    mockDb.__selectChain.offset.mockResolvedValue([]);
    await searchPieces("admin query", admin);
    expect(mockDb.__selectFn).toHaveBeenCalled();
    expect(mockDb.__selectChain.where).toHaveBeenCalled();
  });

  it("uses default pagination when no opts", async () => {
    mockDb.__selectChain.offset.mockResolvedValue([]);
    await searchPieces("hello", null);
    expect(mockDb.__selectChain.limit).toHaveBeenCalledWith(20);
    expect(mockDb.__selectChain.offset).toHaveBeenCalledWith(0);
  });

  it("maps rows to SearchResult with author/rank/headline", async () => {
    const fakeRow = {
      piece: { id: "p1", title: "T", body: "B", authorId: "u1" },
      author: { id: "u1", username: "author" },
      rank: 0.5,
      headline: "<mark>poetry</mark> snippet",
    };
    mockDb.__selectChain.offset.mockResolvedValue([fakeRow]);
    mockGetViewerGroupIds.mockResolvedValue([]);
    const res = await searchPieces("poetry", null);
    expect(res[0]).toMatchObject({
      id: "p1",
      author: { username: "author" },
      rank: 0.5,
      headline: "<mark>poetry</mark> snippet",
    });
  });
});

describe("searchPiecesCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetViewerGroupIds.mockResolvedValue([]);
    // searchPiecesCount uses .where -> no orderBy/limit/offset, ends with awaiting rows.length on the chain
    // Our chain's offset resolves, but searchPiecesCount doesn't call offset — it awaits the chain directly via `from().where()` which returns chain; we need to make `where` resolve to array for count path.
    // In search.ts, searchPiecesCount does: await db.select(...).from(...).innerJoin(...).where(whereClause) -> rows
    // That final chain object is then `.length` — so we need `where` to resolve to array.
    // Adjust: where returns promise resolving to array for count tests
  });

  it("returns 0 for empty query without DB hit", async () => {
    const c = await searchPiecesCount("", null);
    expect(c).toBe(0);
    expect(mockDb.__selectFn).not.toHaveBeenCalled();
  });

  it("counts via select+where for valid query", async () => {
    mockDb.__selectChain.where.mockResolvedValue([{ piece: {}, author: {} }, { piece: {}, author: {} }]);
    const c = await searchPiecesCount("poetry", null);
    expect(c).toBe(2);
    expect(mockDb.__selectFn).toHaveBeenCalled();
  });
});
