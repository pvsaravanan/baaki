import { NextRequest } from "next/server";
import { z } from "zod";
import { json, withUser } from "@/lib/api";
import { bulkSoftDeleteTransactions } from "@/lib/tx-service";

// Matches the max `take` a client can page through in one GET /api/transactions
// request (see query.ts), with headroom — a selection can never legitimately
// exceed what's loadable, so an unbounded array here is just abuse surface.
const bulkDeleteSchema = z.object({ ids: z.array(z.string()).min(1).max(1000) });

export const POST = withUser(async (user, req: NextRequest) => {
  const { ids } = bulkDeleteSchema.parse(await req.json());
  const count = await bulkSoftDeleteTransactions(user.id, ids);
  return json({ ok: true, count });
});
