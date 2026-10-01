import type { NextRequest } from "@/server/request";
import { json, withUser } from "@/lib/api";
import { allocationSchema } from "@/lib/validation";
import { allocateToGoal, loadGoalsOverview } from "@/lib/goals-service";

type Ctx = { params: Promise<{ id: string }> };

/** Set money aside for a goal. Not a transaction — account balances don't change. */
export const POST = withUser(async (user, req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { amount, note } = allocationSchema.parse(await req.json());
  await allocateToGoal(user.id, id, amount, note);
  return json(await loadGoalsOverview(user.id));
});
