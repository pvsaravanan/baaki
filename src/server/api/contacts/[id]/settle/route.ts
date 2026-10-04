import type { NextRequest } from "@/server/request";
import { z } from "zod";
import { json, withUser } from "@/lib/api";
import { settleContactNet } from "@/lib/contacts-service";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  // If set, the bank movements are recorded in `accountId` (see settleContactNet).
  record: z.boolean().default(false),
  accountId: z.string().optional().nullable(),
});

/** Settle every open entry with one person together. */
export const POST = withUser(async (user, req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const raw = await req.text();
  const input = bodySchema.parse(raw ? JSON.parse(raw) : {});
  return json({ settled: await settleContactNet(user.id, id, input) });
});
