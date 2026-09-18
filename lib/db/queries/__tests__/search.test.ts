/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// @ts-nocheck — hoisted mocks with loose typing for Algolia v5
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { mockSearchSingleIndex } = vi.hoisted(() => ({
  mockSearchSingleIndex: vi.fn(async () => ({ hits: [] } as any)),
}));

const { mockGetViewerGroupIds } = vi.hoisted(() => ({
  mockGetViewerGroupIds: vi.fn(async () => [] as string[]),
}));

const { mockHydratedFindMany } = vi.hoisted(() => ({
  mockHydratedFindMany: vi.fn(async () => []),
}));

vi.mock("algoliasearch", () => ({
  algoliasearch: vi.fn(() => ({
    searchSingleIndex: mockSearchSingleIndex,
    saveObject: vi.fn(async () => ({})),
    deleteObject: vi.fn(async () => ({})),
    setSettings: vi.fn(async () => ({})),
    replaceAllObjects: vi.fn(async () => ({})),
  })),
}));

vi.mock("@/lib/db/queries/shared", () => ({
  getViewerGroupIds: mockGetViewerGroupIds,
}));

vi.mock("@/lib/db/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/client")>("@/lib/db/client");
  return {
    ...actual,
    db: {
      ...actual.db,
      query: {
        ...actual.db.query,
        pieces: {
          ...actual.db.query.pieces,
          findMany: mockHydratedFindMany,
          findFirst: vi.fn(async () => null),
        },
      },
    },
  };
});

// Ensure algolia env for tests
process.env.ALGOLIA_APP_ID = "test-app-id";
process.env.ALGOLIA_ADMIN_API_KEY = "test-admin-key";
process.env.ALGOLIA_INDEX_NAME = "test_index";

import { searchPieces } from "@/lib/db/queries/search";

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

describe("searchPieces (Algolia)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetViewerGroupIds.mockResolvedValue([]);
    mockHydratedFindMany.mockResolvedValue([]);
    mockSearchSingleIndex.mockResolvedValue({ hits: [] });
  });

  it("returns [] without Algolia hit for empty query", async () => {
    const res = await searchPieces("", null);
    expect(res).toEqual([]);
    expect(mockSearchSingleIndex).not.toHaveBeenCalled();
  });

  it("returns [] for short query (<2 chars)", async () => {
    const res = await searchPieces("a", null);
    expect(res).toEqual([]);
    expect(mockSearchSingleIndex).not.toHaveBeenCalled();
  });

  it("trims whitespace and short-circuits", async () => {
    const res = await searchPieces("  ", null);
    expect(res).toEqual([]);
    expect(mockSearchSingleIndex).not.toHaveBeenCalled();
  });

  it("queries Algolia with anon filters (approved+public)", async () => {
    await searchPieces("poetry", null, { limit: 5, offset: 10 });
    expect(mockSearchSingleIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        searchParams: expect.objectContaining({
          query: "poetry",
          filters: "reviewStatus:approved AND visibility:public",
          hitsPerPage: 5,
          page: 2, // offset 10 / limit 5 = page 2
        }),
      }),
    );
    expect(mockGetViewerGroupIds).toHaveBeenCalledWith(null);
  });

  it("includes author bypass OR branch when viewer present (no groups)", async () => {
    const viewer = makeViewer() as NonNullable<ReturnType<typeof makeViewer>>;
    mockGetViewerGroupIds.mockResolvedValue([]);
    await searchPieces("fiction", viewer);
    expect(mockSearchSingleIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        searchParams: expect.objectContaining({
          filters: expect.stringContaining(`authorId:${(viewer as any).id}`),
        }),
      }),
    );
  });

  it("allows group visibility when member", async () => {
    const viewer = makeViewer({ id: "viewer-1" }) as NonNullable<ReturnType<typeof makeViewer>>;
    mockGetViewerGroupIds.mockResolvedValue(["g1"]);
    await searchPieces("sunset", viewer);
    expect(mockGetViewerGroupIds).toHaveBeenCalledWith(viewer);
    expect(mockSearchSingleIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        searchParams: expect.objectContaining({
          filters: expect.stringContaining("visibility:group"),
        }),
      }),
    );
  });

  it("admin bypass has no filters", async () => {
    const admin = makeViewer({ role: "admin" }) as NonNullable<ReturnType<typeof makeViewer>>;
    await searchPieces("admin query", admin as any);
    expect(mockSearchSingleIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        searchParams: expect.objectContaining({
          filters: undefined,
        }),
      }),
    );
  });

  it("uses default pagination when no opts", async () => {
    await searchPieces("hello", null);
    expect(mockSearchSingleIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        searchParams: expect.objectContaining({ hitsPerPage: 20, page: 0 }),
      }),
    );
  });

  it("hydrates hits via DB and attaches headline", async () => {
    const fakeHits = [
      {
        objectID: "p1",
        title: "T",
        slug: "t",
        _highlightResult: { body: { value: "<mark>poetry</mark> snippet" } },
      },
    ] as any;
    mockSearchSingleIndex.mockResolvedValue({ hits: fakeHits } as any);
    mockHydratedFindMany.mockResolvedValue([
      {
        id: "p1",
        title: "T",
        slug: "t",
        body: "<p>B</p>",
        authorId: "u1",
        author: { id: "u1", username: "author", displayName: "Author" },
        visibility: "public",
        reviewStatus: "approved",
        publishedAt: new Date(),
        createdAt: new Date(),
      },
    ] as any);

    const res = await searchPieces("poetry", null);
    expect(res[0]).toMatchObject({
      id: "p1",
      author: { username: "author" },
      headline: "<mark>poetry</mark> snippet",
    });
    expect(typeof res[0].rank).toBe("number");
  });
});
