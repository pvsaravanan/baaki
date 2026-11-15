import type { NextRequest } from "@/server/request";
import { prisma } from "@/lib/db/db";
import { json, withUser } from "@/lib/request/api";
import { duplicateTransaction } from "@/lib/transactions/tx-service";
import { serializeTransaction, TXN_INCLUDE } from "@/lib/db/serialize";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withUser(async (user, _req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const newId = await duplicateTransaction(user.id, id);
  const row = await prisma.transaction.findUnique({
    where: { id: newId },
    include: TXN_INCLUDE,
  });
  return json({ transaction: serializeTransaction(row!) }, { status: 201 });
});
