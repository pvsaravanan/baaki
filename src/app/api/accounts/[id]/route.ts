import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ConflictError, json, NotFoundError, withUser } from "@/lib/api";
import { accountSchema } from "@/lib/validation";
import { loadAccounts } from "@/lib/queries";

type Ctx = { params: Promise<{ id: string }> };

async function owned(userId: string, id: string) {
  const acc = await prisma.account.findFirst({ where: { id, userId } });
  if (!acc) throw new NotFoundError("Account not found");
  return acc;
}

export const PATCH = withUser(async (user, req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  await owned(user.id, id);
  const input = accountSchema.partial().parse(await req.json());
  // Same case-insensitive-clash-vs-case-sensitive-unique-constraint race as
  // the POST handler: check + update must run in one Serializable
  // transaction so two concurrent renames onto names that only differ by
  // case can't both pass the check.
  await prisma.$transaction(
    async (db) => {
      if (input.name !== undefined) {
        const clash = await db.account.findFirst({
          where: { userId: user.id, id: { not: id }, name: { equals: input.name, mode: "insensitive" } },
          select: { id: true },
        });
        if (clash) throw new ConflictError("An account with this name already exists");
      }
      await db.account.update({
        where: { id },
        data: {
          name: input.name,
          type: input.type,
          openingBalance: input.openingBalance,
          color: input.color,
          icon: input.icon,
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
  return json({ accounts: await loadAccounts(user.id) });
});

export const DELETE = withUser(async (user, _req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  await owned(user.id, id);

  // The "is this account used" check and the hard-delete must happen inside
  // one transaction. Without that, a transaction/recurring-post/goal write
  // that references this account and lands between the check and the delete
  // would get silently destroyed by the cascade below once the delete runs
  // (see onDelete: Cascade on Transaction.account). Postgres's default READ
  // COMMITTED isolation doesn't actually close that race on its own (a
  // concurrent insert referencing this account can still land between the
  // count and the delete and get cascaded away) — Serializable makes
  // Postgres detect that write skew and abort one side instead.
  const archived = await prisma.$transaction(
    async (db) => {
      // Count references from ANY user, not just this one. Scoping this to
      // `userId` would hide foreign rows and let the hard-delete below cascade
      // through them.
      const [usedByTxn, usedByRecurring, usedByGoal] = await Promise.all([
        db.transaction.count({ where: { OR: [{ accountId: id }, { transferAccountId: id }] } }),
        db.recurringTransaction.count({ where: { OR: [{ accountId: id }, { transferAccountId: id }] } }),
        db.financialGoal.count({ where: { accountId: id } }),
      ]);
      const used = usedByTxn + usedByRecurring + usedByGoal;

      if (used > 0) {
        // Preserve history: archive instead of deleting.
        await db.account.update({ where: { id }, data: { isArchived: true } });
        return true;
      }

      await db.userPreference.updateMany({
        where: { userId: user.id, defaultAccountId: id },
        data: { defaultAccountId: null },
      });
      await db.account.delete({ where: { id } });
      return false;
    },
    { isolationLevel: "Serializable" },
  );

  return json({ archived, accounts: await loadAccounts(user.id) });
});
