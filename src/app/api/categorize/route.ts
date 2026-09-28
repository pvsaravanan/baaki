import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { json, withUser } from "@/lib/api";
import { suggestCategoryKey } from "@/lib/categorize";

/** Suggest one of the user's categories for a free-text description (rule-based). */
export const POST = withUser(async (user, req: NextRequest) => {
  const { description } = (await req.json()) as { description?: string };
  const key = suggestCategoryKey(description ?? "");
  if (!key) return json({ suggestion: null });

  const category = await prisma.category.findFirst({
    where: { userId: user.id, systemKey: key, isActive: true },
    select: { id: true, name: true },
  });
  return json({ suggestion: category ? { id: category.id, name: category.name } : null });
});
