import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => (await import("@/test/memory-db")).memoryDb());

import { handle, loadPage } from "@/server/local-server";
import { decryptBackup, encryptBackup, isEncryptedBackup } from "@/lib/backup-crypto";
import { sampleBackup } from "../../scripts/sample-data";

/**
 * Moving to a new phone or reinstalling: a backup made by baaki must bring
 * back exactly what was there, whether it was locked with a password or not.
 */

async function call<T = Record<string, unknown>>(method: string, url: string, body?: unknown) {
  const res = await handle(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json()) as T };
}

const MONTH = "2026-09";
const snapshot = async () => ({
  accounts: (await loadPage("accounts", {})) as unknown,
  dashboard: ((await loadPage("dashboard", { m: MONTH })) as { analytics: unknown }).analytics,
});

beforeAll(async () => {
  expect((await call("POST", "/api/backup/restore", sampleBackup())).status).toBe(200);
});

describe("restoring a backup baaki made", () => {
  it("brings back every number after the data was wiped and changed", async () => {
    const before = await snapshot();
    const exported = (await call("GET", "/api/export?format=json")).data;

    // The "new phone": different contents on the device.
    const fresh = sampleBackup();
    fresh.transactions = fresh.transactions.slice(0, 3);
    expect((await call("POST", "/api/backup/restore", fresh)).status).toBe(200);
    expect(await snapshot()).not.toEqual(before);

    expect((await call("POST", "/api/backup/restore", exported)).status).toBe(200);
    expect(await snapshot()).toEqual(before);
  });

  it("works through a password-locked file", async () => {
    const before = await snapshot();
    const exported = (await call("GET", "/api/export?format=json")).data;
    const locked = await encryptBackup(JSON.stringify(exported), "correct horse", 1000);
    expect(isEncryptedBackup(locked)).toBe(true);

    const opened = JSON.parse(await decryptBackup(locked, "correct horse"));
    expect((await call("POST", "/api/backup/restore", opened)).status).toBe(200);
    expect(await snapshot()).toEqual(before);
    await expect(decryptBackup(locked, "wrong password")).rejects.toThrow();
  });

  it("refuses a file that isn't a baaki backup, leaving the data alone", async () => {
    const before = await snapshot();
    const res = await call("POST", "/api/backup/restore", { app: "something-else", version: 2 });
    expect(res.status).toBe(400);
    expect(await snapshot()).toEqual(before);
  });
});
