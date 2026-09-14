import { NextRequest } from "next/server";
import { json, withUser } from "@/lib/api";
import { restoreSplitGroup } from "@/lib/tx-service";

type Ctx = { params: Promise<{ groupId: string }> };

export const POST = withUser(async (user, _req: NextRequest, ctx: Ctx) => {
  const { groupId } = await ctx.params;
  await restoreSplitGroup(user.id, groupId);
  return json({ ok: true });
});
