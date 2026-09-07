import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCurrentUser, mockUpdateSet, mockUpdateWhere, mockDb } = vi.hoisted(() => {
  const mockCurrentUser = vi.fn();
  const mockUpdateSet = vi.fn();
  const mockUpdateWhere = vi.fn();
  const mockDb = {
    query: { users: { findFirst: vi.fn() } },
    update: vi.fn(() => ({
      set: (...args: unknown[]) => {
        mockUpdateSet(...args);
        return {
          where: (...wArgs: unknown[]) => {
            mockUpdateWhere(...wArgs);
            return Promise.resolve();
          },
        };
      },
    })),
    insert: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
  };
  return { mockCurrentUser, mockUpdateSet, mockUpdateWhere, mockDb };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return { ...actual, currentUser: (...args: unknown[]) => mockCurrentUser(...args) };
});
vi.mock("@/lib/db/client", () => ({ db: mockDb, pool: {} }));

import { completeOnboarding, updateMailingPreferences } from "@/lib/actions/onboarding";
import { revalidatePath } from "next/cache";

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    clerkId: "clerk_test_1",
    role: "user",
    isWriter: false,
    username: "testuser",
    displayName: "Test",
    bio: null,
    image: null,
    digestEnabled: true,
    digestFrequency: "weekly" as const,
    onboardingCompletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("completeOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockReset();
    mockUpdateSet.mockReset();
    mockUpdateWhere.mockReset();
  });

  it("rejects unauthenticated call", async () => {
    mockCurrentUser.mockResolvedValue(null);
    const res = await completeOnboarding({ isWriter: false, digestEnabled: true, digestFrequency: "weekly" });
    expect(res).toEqual({ success: false, error: "You must be signed in." });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("rejects invalid frequency", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());
    const res = await completeOnboarding({ isWriter: false, digestEnabled: true, digestFrequency: "daily" as unknown as "weekly" });
    expect(res.success).toBe(false);
  });

  it("happy path reader — persists weekly and marks onboarding", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ isWriter: false }));
    const res = await completeOnboarding({ isWriter: false, digestEnabled: true, digestFrequency: "weekly" });
    expect(res).toEqual({ success: true });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ isWriter: false, digestEnabled: true, digestFrequency: "weekly", onboardingCompletedAt: expect.any(Date) }));
    expect(revalidatePath).toHaveBeenCalledWith("/onboarding");
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("happy path writer — promotes to writer", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ isWriter: false }));
    const res = await completeOnboarding({ isWriter: true, digestEnabled: true, digestFrequency: "weekly" });
    expect(res).toEqual({ success: true });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ isWriter: true }));
  });

  it("does not downgrade existing writer", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ isWriter: true }));
    const res = await completeOnboarding({ isWriter: false, digestEnabled: false, digestFrequency: "never" });
    expect(res).toEqual({ success: true });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ isWriter: true, digestEnabled: false, digestFrequency: "never" }));
  });

  it("normalizes never when digestEnabled false", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());
    const res = await completeOnboarding({ isWriter: false, digestEnabled: false, digestFrequency: "weekly" });
    expect(res).toEqual({ success: true });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ digestEnabled: false, digestFrequency: "never" }));
  });

  it("skip-like reader + never", async () => {
    mockCurrentUser.mockResolvedValue(makeUser({ isWriter: false }));
    const res = await completeOnboarding({ isWriter: false, digestEnabled: false, digestFrequency: "never" });
    expect(res).toEqual({ success: true });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ isWriter: false, digestFrequency: "never" }));
  });
});

describe("updateMailingPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockReset();
    mockUpdateSet.mockReset();
    mockUpdateWhere.mockReset();
  });

  it("rejects unauthenticated", async () => {
    mockCurrentUser.mockResolvedValue(null);
    const res = await updateMailingPreferences({ digestEnabled: true, digestFrequency: "weekly" });
    expect(res).toEqual({ success: false, error: "You must be signed in." });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("rejects invalid input", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());
    const res = await updateMailingPreferences({ digestEnabled: true, digestFrequency: "daily" as unknown as "weekly" });
    expect(res.success).toBe(false);
  });

  it("happy path weekly", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());
    const res = await updateMailingPreferences({ digestEnabled: true, digestFrequency: "weekly" });
    expect(res).toEqual({ success: true });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ digestEnabled: true, digestFrequency: "weekly" }));
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("normalizes to never when disabled", async () => {
    mockCurrentUser.mockResolvedValue(makeUser());
    const res = await updateMailingPreferences({ digestEnabled: false, digestFrequency: "weekly" });
    expect(res).toEqual({ success: true });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ digestEnabled: false, digestFrequency: "never" }));
  });
});
