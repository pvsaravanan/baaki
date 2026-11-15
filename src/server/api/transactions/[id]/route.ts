import type { NextRequest } from "@/server/request";
import { json, withUser } from "@/lib/request/api";
import { softDeleteTransaction, updateTransaction } from "@/lib/transactions/tx-service";
import { transactionSchema } from "@/lib/request/validation";
import { serializeTransaction } from "@/lib/db/serialize";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withUser(async (user, req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const input = transactionSchema.parse(await req.json());
  const row = await updateTransaction(user.id, id, input);
  return json({ transaction: serializeTransaction(row) });
});

export const DELETE = withUser(async (user, _req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  await softDeleteTransaction(user.id, id);
  return json({ ok: true });
});
