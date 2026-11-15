import type { NextRequest } from "@/server/request";
import { json, withUser } from "@/lib/request/api";
import { restoreTransaction } from "@/lib/transactions/tx-service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withUser(async (user, _req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  await restoreTransaction(user.id, id);
  return json({ ok: true });
});
