import { NextRequest } from "next/server";
import { json, withUser } from "@/lib/api";
import { goalSchema } from "@/lib/validation";
import { createGoal, loadGoalsOverview } from "@/lib/goals-service";

export const GET = withUser(async (user) => {
  return json(await loadGoalsOverview(user.id));
});

export const POST = withUser(async (user, req: NextRequest) => {
  const input = goalSchema.parse(await req.json());
  const id = await createGoal(user.id, input);
  return json({ id, ...(await loadGoalsOverview(user.id)) }, { status: 201 });
});
