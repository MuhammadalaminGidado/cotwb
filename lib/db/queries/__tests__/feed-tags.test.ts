import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => {
  const chain = () => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    c.innerJoin = vi.fn(() => c);
    c.where = vi.fn(() => c);
    c.orderBy = vi.fn(() => c);
    c.groupBy = vi.fn(() => c);
    c.limit = vi.fn(() => c);
    c.offset = vi.fn(() => Promise.resolve([]));
    c.from = vi.fn(() => c);
    c.select = vi.fn(() => c);
    return c;
  };
  const selectChain = chain();
  return {
    mockDb: {
      query: { pieces: { findMany: vi.fn() } },
      select: selectChain.select,
      __selectChain: selectChain,
    },
  };
});

vi.mock("@/lib/db/client", () => ({ db: mockDb, pool: {} }));

import { getPublishedPieces, getFeedTagCounts } from "@/lib/db/queries/pieces";

describe("getPublishedPieces with tagSlug", () => {
  beforeEach(() => vi.clearAllMocks());

  it("routes through the joined select when tagSlug is set", async () => {
    await getPublishedPieces({ tagSlug: "poetry", limit: 5, offset: 10 });
    expect(mockDb.__selectChain.innerJoin).toHaveBeenCalledTimes(3);
    expect(mockDb.__selectChain.where).toHaveBeenCalledWith(expect.anything());
    expect(mockDb.__selectChain.limit).toHaveBeenCalledWith(5);
    expect(mockDb.__selectChain.offset).toHaveBeenCalledWith(10);
  });

  it("uses the relational path when no tagSlug", async () => {
    mockDb.query.pieces.findMany.mockResolvedValue([]);
    await getPublishedPieces({ limit: 3 });
    expect(mockDb.query.pieces.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 3, with: { author: true } }),
    );
    expect(mockDb.__selectChain.innerJoin).not.toHaveBeenCalled();
  });
});

describe("getFeedTagCounts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("joins tags through piece_tags to approved public pieces", async () => {
    await getFeedTagCounts();
    // two joins: piece_tags and pieces
    expect(mockDb.__selectChain.innerJoin).toHaveBeenCalledTimes(2);
    expect(mockDb.__selectChain.groupBy).toHaveBeenCalled();
    expect(mockDb.__selectChain.orderBy).toHaveBeenCalled();
  });
});
