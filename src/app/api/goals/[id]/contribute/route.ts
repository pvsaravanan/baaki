import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { json, BadRequestError, NotFoundError, withUser } from "@/lib/api";
import { contributionSchema } from "@/lib/validation";
import { loadGoals } from "@/lib/queries";
import { fromISODate } from "@/lib/dates";

type Ctx = { params: Promise<{ id: string }> };

/** Add a contribution (or withdrawal, via a negative amount) to a goal. */
export const POST = withUser(async (user, req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const input = contributionSchema.parse(await req.json());

  // Read the prior total, reject a withdrawal that would push it negative,
  // then create and recompute the achieved/active flag — all inside one
  // Serializable transaction so two concurrent withdrawals on the same goal
  // can't each read the same prior total, both pass the check, and together
  // still drive it negative (Postgres aborts the loser with a serialization
  // error instead).
  await prisma.$transaction(
    async (db) => {
      const goal = await db.financialGoal.findFirst({
        where: { id, userId: user.id },
        select: { targetAmount: true, status: true },
      });
      if (!goal) throw new NotFoundError("Goal not found");

      const agg = await db.goalContribution.aggregate({ where: { goalId: id }, _sum: { amount: true } });
      const priorTotal = agg._sum.amount ?? 0;
      const total = priorTotal + input.amount;
      if (total < 0) throw new BadRequestError("Can't withdraw more than the amount saved");

      await db.goalContribution.create({
        data: {
          goalId: id,
          amount: input.amount,
          date: input.date ? fromISODate(input.date) ?? new Date() : new Date(),
          note: input.note ?? null,
        },
      });

      if (total >= goal.targetAmount && goal.status === "active") {
        await db.financialGoal.update({ where: { id }, data: { status: "achieved" } });
      } else if (total < goal.targetAmount && goal.status === "achieved") {
        await db.financialGoal.update({ where: { id }, data: { status: "active" } });
      }
    },
    { isolationLevel: "Serializable" },
  );

  return json({ goals: await loadGoals(user.id) });
});
