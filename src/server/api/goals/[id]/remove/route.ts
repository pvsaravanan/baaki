import type { NextRequest } from "@/server/request";
import { json, withUser } from "@/lib/api";
import { allocationSchema } from "@/lib/validation";
import { loadGoalsOverview, removeFromGoal } from "@/lib/goals-service";

type Ctx = { params: Promise<{ id: string }> };

/** Take money off a goal, making it available again. Not a transaction. */
export const POST = withUser(async (user, req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { amount, note } = allocationSchema.parse(await req.json());
  await removeFromGoal(user.id, id, amount, note);
  return json(await loadGoalsOverview(user.id));
});
