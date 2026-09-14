import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { BadRequestError, json, withUser } from "@/lib/api";
import { assertAccountsOwned } from "@/lib/ownership";
import { goalSchema } from "@/lib/validation";
import { loadGoals } from "@/lib/queries";
import { fromISODate, toISODate } from "@/lib/dates";

export const GET = withUser(async (user) => {
  return json({ goals: await loadGoals(user.id) });
});

export const POST = withUser(async (user, req: NextRequest) => {
  const input = goalSchema.parse(await req.json());
  // SECURITY: a goal may link to an account — verify it is this user's.
  await assertAccountsOwned(user.id, [input.accountId]);
  // Match the contribute endpoint's achieved-flip: a goal created with a
  // starting amount that already meets (or exceeds) its target shouldn't sit
  // at "active" and >100% until the next contribution happens to trigger it.
  const status =
    input.status === "active" && input.initialAmount >= input.targetAmount ? "achieved" : input.status;
  // Only for a still-active goal — a retroactively logged achieved/archived
  // goal can legitimately have a target date in the past.
  if (status === "active" && input.targetDate && input.targetDate < toISODate(new Date())) {
    throw new BadRequestError("Target date can't be in the past");
  }
  await prisma.financialGoal.create({
    data: {
      userId: user.id,
      name: input.name,
      icon: input.icon,
      color: input.color,
      targetAmount: input.targetAmount,
      targetDate: input.targetDate ? fromISODate(input.targetDate) : null,
      accountId: input.accountId ?? null,
      status,
      contributions:
        input.initialAmount > 0
          ? { create: { amount: input.initialAmount, note: "Starting amount" } }
          : undefined,
    },
  });
  return json({ goals: await loadGoals(user.id) }, { status: 201 });
});
