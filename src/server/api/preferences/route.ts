import type { NextRequest } from "@/server/request";
import { prisma } from "@/lib/db/db";
import { json, withUser } from "@/lib/request/api";
import { assertAccountsOwned } from "@/lib/request/ownership";
import { preferenceSchema } from "@/lib/request/validation";

export const PATCH = withUser(async (user, req: NextRequest) => {
  const input = preferenceSchema.parse(await req.json());
  // SECURITY: never store a pointer to another user's account.
  await assertAccountsOwned(user.id, [input.defaultAccountId]);
  const data: Record<string, unknown> = {};
  if (input.dashboardWidgets !== undefined) data.dashboardWidgets = JSON.stringify(input.dashboardWidgets);
  if (input.defaultAccountId !== undefined) data.defaultAccountId = input.defaultAccountId;
  if (input.appLock !== undefined) data.appLock = input.appLock;

  await prisma.userPreference.upsert({
    where: { userId: user.id },
    update: data,
    create: {
      userId: user.id,
      dashboardWidgets: JSON.stringify(input.dashboardWidgets ?? []),
      defaultAccountId: input.defaultAccountId ?? null,
      appLock: input.appLock ?? false,
    },
  });
  return json({ ok: true });
});
