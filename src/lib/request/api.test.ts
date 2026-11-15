import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ requireUser: vi.fn() }));
vi.mock("./auth", () => ({ ...auth, UnauthorizedError: class extends Error {} }));
import { withUser } from "./api";

beforeEach(() => {
  vi.resetAllMocks();
  auth.requireUser.mockResolvedValue({ id: "user" });
});

describe("API error responses", () => {
  it("returns a client error for malformed JSON", async () => {
    const handler = withUser(async (_user, req: Request) => Response.json(await req.json()));
    const response = await handler(new Request("http://localhost/api/test", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
  });

  it("returns a retryable conflict for serializable transaction failures", async () => {
    const handler = withUser(async () => { throw { code: "P2034" }; });
    expect((await handler()).status).toBe(409);
  });

  it("keeps unexpected failures private", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withUser(async () => { throw new Error("private database details"); });
    const response = await handler();
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private database details");
    log.mockRestore();
  });
});
