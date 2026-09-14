import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ConflictError, json, withUser } from "@/lib/api";
import { accountSchema } from "@/lib/validation";
import { loadAccounts } from "@/lib/queries";

export const GET = withUser(async (user) => {
  return json({ accounts: await loadAccounts(user.id) });
});

export const POST = withUser(async (user, req: NextRequest) => {
  const input = accountSchema.parse(await req.json());
  // The DB @@unique([userId, name]) is case-SENSITIVE, so also reject
  // case-insensitive collisions here (e.g. CSV import resolves account names to
  // ids via a Map keyed by lowercased name; a collision would attach
  // transactions to the wrong one). The check and the create must happen in
  // one Serializable transaction, or two concurrent creates of names that
  // only differ by case (e.g. "Wallet" / "wallet") can each pass the
  // case-insensitive check before the other commits and both succeed —
  // Serializable makes Postgres detect that and abort one side instead.
  await prisma.$transaction(
    async (db) => {
      const clash = await db.account.findFirst({
        where: { userId: user.id, name: { equals: input.name, mode: "insensitive" } },
        select: { id: true },
      });
      if (clash) throw new ConflictError("An account with this name already exists");
      const count = await db.account.count({ where: { userId: user.id } });
      await db.account.create({
        data: {
          userId: user.id,
          name: input.name,
          type: input.type,
          openingBalance: input.openingBalance,
          color: input.color,
          icon: input.icon,
          sortOrder: count,
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
  return json({ accounts: await loadAccounts(user.id) }, { status: 201 });
});
