import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("./db", () => ({ prisma: {
  user: { findFirst: mocks.findFirst },
  $transaction: mocks.transaction,
} }));

import { getCurrentUser, LOCAL_EMAIL } from "./auth";

const profile = { id: "profile", email: LOCAL_EMAIL, name: "You", avatarUrl: null };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("local profile", () => {
  it("returns the device's existing profile", async () => {
    mocks.findFirst.mockResolvedValue(profile);
    await expect(getCurrentUser()).resolves.toEqual(profile);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("creates the profile once, even when several requests arrive together on first launch", async () => {
    mocks.findFirst.mockResolvedValue(null);
    let release!: () => void;
    mocks.transaction.mockImplementation(() => new Promise((resolve) => { release = () => resolve(profile); }));
    const calls = [getCurrentUser(), getCurrentUser(), getCurrentUser()];
    await vi.waitFor(() => expect(mocks.transaction).toHaveBeenCalled());
    release();
    await expect(Promise.all(calls)).resolves.toEqual([profile, profile, profile]);
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });
});
