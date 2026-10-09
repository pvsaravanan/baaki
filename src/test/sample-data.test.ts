import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => (await import("@/test/memory-db")).memoryDb());

import { handle, loadPage } from "@/server/local-server";
import { sampleBackup } from "../../scripts/sample-data";

/** The screenshots' sample data (scripts/sample-data.ts) must stay a backup the app restores. */
describe("the screenshot sample data", () => {
  it("restores in full", async () => {
    const backup = sampleBackup();
    const res = await handle("/api/backup/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backup),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ accounts: 3, transactions: backup.transactions.length });

    const shell = await loadPage("shell", {});
    expect(shell.user.name).toBe("Saravanan");
    expect(shell.accounts.map((a) => a.name)).toEqual(["HDFC Bank", "SBI Savings", "Cash"]);
    // Every account stays in credit, so no screen shows a warning by accident.
    for (const account of shell.accounts) expect(account.balance).toBeGreaterThan(0);
  });

  it("is the same every time", () => {
    expect(JSON.stringify(sampleBackup())).toBe(JSON.stringify(sampleBackup()));
  });
});
