import { NextRequest } from "next/server";
import { json, withUser } from "@/lib/api";
import { goalUpdateSchema } from "@/lib/validation";
import { deleteGoal, loadGoalsOverview, updateGoal } from "@/lib/goals-service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withUser(async (user, req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  await updateGoal(user.id, id, goalUpdateSchema.parse(await req.json()));
  return json(await loadGoalsOverview(user.id));
});

export const DELETE = withUser(async (user, _req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  await deleteGoal(user.id, id);
  return json(await loadGoalsOverview(user.id));
});
