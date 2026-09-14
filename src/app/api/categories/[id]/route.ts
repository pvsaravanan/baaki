import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { BadRequestError, ConflictError, json, NotFoundError, withUser } from "@/lib/api";
import { assertCategoriesOwned } from "@/lib/ownership";
import { categorySchema } from "@/lib/validation";
import { loadCategories } from "@/lib/queries";

type Ctx = { params: Promise<{ id: string }> };

async function owned(userId: string, id: string) {
  const cat = await prisma.category.findFirst({ where: { id, userId } });
  if (!cat) throw new NotFoundError("Category not found");
  return cat;
}

export const PATCH = withUser(async (user, req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const cat = await owned(user.id, id);
  const input = categorySchema.partial().parse(await req.json());
  // System categories back deterministic logic (e.g. "Subscriptions" insights,
  // default income category). The UI marks them protected; enforce that here by
  // rejecting identity changes (rename / re-kind) while still allowing cosmetic
  // edits (icon, color, budget, active).
  if (cat.isSystem) {
    if (input.name !== undefined && input.name !== cat.name) {
      throw new ConflictError("System categories can't be renamed");
    }
    if (input.kind !== undefined && input.kind !== cat.kind) {
      throw new ConflictError("System categories can't change type");
    }
  }
  // The name-clash check + update must run in one Serializable transaction —
  // same case-insensitive-clash-vs-case-sensitive-unique-constraint race as
  // the POST handler — or two concurrent renames onto names that only
  // differ by case can both pass the check.
  await prisma.$transaction(
    async (db) => {
      if (input.name !== undefined) {
        const clash = await db.category.findFirst({
          where: { userId: user.id, id: { not: id }, name: { equals: input.name, mode: "insensitive" } },
          select: { id: true },
        });
        if (clash) throw new ConflictError("A category with this name already exists");
      }
      if (input.parentId !== undefined && input.parentId !== null) {
        if (input.parentId === id) throw new BadRequestError("A category can't be its own parent");
        // SECURITY: a new parent must belong to this user.
        await assertCategoriesOwned(user.id, [input.parentId]);
        // Walk up from the proposed parent; if this category's own id shows
        // up, the new parent is one of its descendants and the move would
        // create a cycle (and silently orphan that branch from the root).
        let cursor: string | null = input.parentId;
        let depth = 0;
        while (cursor && depth < 50) {
          if (cursor === id) throw new BadRequestError("Can't move a category under one of its own subcategories");
          const next: { parentId: string | null } | null = await db.category.findUnique({
            where: { id: cursor },
            select: { parentId: true },
          });
          cursor = next?.parentId ?? null;
          depth++;
        }
      }
      await db.category.update({
        where: { id },
        data: {
          name: input.name,
          icon: input.icon,
          color: input.color,
          kind: input.kind,
          monthlyBudget: input.monthlyBudget === undefined ? undefined : input.monthlyBudget,
          parentId: input.parentId,
          isActive: input.isActive,
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
  return json({ categories: await loadCategories(user.id) });
});

export const DELETE = withUser(async (user, _req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const cat = await owned(user.id, id);
  // System categories are protected (see the PATCH guard) — never delete them.
  if (cat.isSystem) throw new ConflictError("System categories can't be deleted");

  // Any reference means we deactivate + detach rather than hard-delete, so a
  // SET NULL / cascade doesn't silently rewrite data the user still relies on:
  //  - transactions / budget limits (existing history);
  //  - recurring rules (categoryId is SET NULL, so a hard delete would leave
  //    every future auto-posted transaction uncategorized with no warning);
  //  - child categories (parentId is SET NULL, so a hard delete would silently
  //    promote all children to top-level and lose the grouping).
  const [usedByTxn, usedByBudget, usedByRecurring, childCount] = await Promise.all([
    prisma.transaction.count({ where: { userId: user.id, categoryId: id } }),
    prisma.budgetCategory.count({ where: { categoryId: id } }),
    prisma.recurringTransaction.count({ where: { userId: user.id, categoryId: id } }),
    prisma.category.count({ where: { userId: user.id, parentId: id } }),
  ]);
  const used = usedByTxn + usedByBudget + usedByRecurring + childCount;
  if (used > 0) {
    // Keep transactions intact but detach + deactivate the category.
    await prisma.$transaction([
      prisma.transaction.updateMany({ where: { userId: user.id, categoryId: id }, data: { categoryId: null } }),
      prisma.category.update({ where: { id }, data: { isActive: false } }),
    ]);
    return json({ detached: true, categories: await loadCategories(user.id) });
  }

  await prisma.category.delete({ where: { id } });
  return json({ detached: false, categories: await loadCategories(user.id) });
});
