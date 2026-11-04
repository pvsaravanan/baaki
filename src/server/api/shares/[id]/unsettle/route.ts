import type { NextRequest } from "@/server/request";
import { json, withUser } from "@/lib/api";
import { unsettleShare } from "@/lib/contacts-service";

type Ctx = { params: Promise<{ id: string }> };

/** Undo a settlement: the share is owed again, and any money entry recorded for it is taken back. */
export const POST = withUser(async (user, _req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  await unsettleShare(user.id, id);
  return json({ ok: true });
});
