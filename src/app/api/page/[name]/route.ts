import type { NextRequest } from "next/server";
import { PAGE_LOADERS, type PageName } from "@/server/pages";
import { loadPage } from "@/server/router";
import { UnauthorizedError } from "@/lib/request/auth";
import { encodeWire } from "@/lib/request/wire";

/**
 * One screen's data as the signed-in user (see src/server/pages.ts for what
 * each screen needs). Dates are tagged so the client gets real Dates back
 * (src/lib/request/wire.ts).
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!Object.hasOwn(PAGE_LOADERS, name)) return Response.json({ error: "Not found" }, { status: 404 });
  const params = Object.fromEntries(req.nextUrl.searchParams) as Record<string, string>;
  try {
    const data = await loadPage(name as PageName, params);
    return new Response(encodeWire(data), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof UnauthorizedError) return Response.json({ error: "Not authenticated" }, { status: 401 });
    throw err;
  }
}
