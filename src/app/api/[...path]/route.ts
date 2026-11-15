import type { NextRequest } from "next/server";
import { dispatch } from "@/server/router";
import { UnauthorizedError } from "@/lib/request/auth";

/**
 * Every `/api/...` call the screens make lands here and is answered by the
 * matching handler in src/server/api, run as the signed-in user (the handlers
 * ask for it themselves). Next.js's own /api/page/<name> route (screen data)
 * is more specific, so it wins over this one.
 */
export const dynamic = "force-dynamic";

async function handler(req: NextRequest): Promise<Response> {
  try {
    return await dispatch(req);
  } catch (err) {
    if (err instanceof UnauthorizedError) return Response.json({ error: "Not authenticated" }, { status: 401 });
    throw err;
  }
}

export { handler as GET, handler as POST, handler as PATCH, handler as PUT, handler as DELETE };
