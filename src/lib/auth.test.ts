import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getUser: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("./supabase/server", () => ({ createClient: async () => ({ auth: mocks }) }));
vi.mock("./db", () => ({ prisma: {
  user: { findUnique: mocks.findUnique, update: mocks.update, updateMany: mocks.updateMany },
  $transaction: mocks.transaction,
} }));

import { getCurrentUser, UnauthorizedError } from "./auth";

const profile = { id: "profile", email: "person@example.com", name: "Person", avatarUrl: null };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getClaims.mockResolvedValue({ data: { claims: {
    sub: "identity", email: profile.email, user_metadata: { name: "Person" },
  } }, error: null });
  mocks.getUser.mockResolvedValue({ data: { user: {
    id: "identity", email: profile.email, email_confirmed_at: "2026-01-01",
  } }, error: null });
  mocks.findUnique.mockResolvedValue(profile);
});

describe("profile authentication", () => {
  it("returns the profile for a currently valid identity", async () => {
    await expect(getCurrentUser()).resolves.toEqual(profile);
    expect(mocks.getUser).toHaveBeenCalledOnce();
  });

  it("rejects a signed token when the auth server rejects its user", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error("User unavailable") });
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("does not overwrite a profile linked to another identity", async () => {
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...profile, authId: "another-identity" });
    await expect(getCurrentUser()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("does not link a legacy profile using an unconfirmed email", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "identity", email: profile.email } }, error: null });
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...profile, authId: null });
    await expect(getCurrentUser()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("links a legacy profile only if its identity is still unset", async () => {
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...profile, authId: null }).mockResolvedValueOnce(profile);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    await expect(getCurrentUser()).resolves.toEqual(profile);
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: profile.id, authId: null }, data: { authId: "identity" } });
  });

  it("rejects a legacy link if another identity claims the row concurrently", async () => {
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...profile, authId: null }).mockResolvedValueOnce(null);
    mocks.updateMany.mockResolvedValue({ count: 0 });
    await expect(getCurrentUser()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("uses the auth server's current email rather than a stale token email", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "identity", email: "new@example.com", email_confirmed_at: "2026-01-01" } }, error: null });
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...profile, authId: "other" });
    await expect(getCurrentUser()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(mocks.findUnique).toHaveBeenNthCalledWith(2, { where: { email: "new@example.com" } });
  });
});
