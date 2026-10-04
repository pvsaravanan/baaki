import type { NextRequest } from "@/server/request";
import { z } from "zod";
import { json, withUser } from "@/lib/api";
import { assignShare, loadContacts, loadUnassignedShares } from "@/lib/contacts-service";

type Ctx = { params: Promise<{ id: string }> };

/** Name the person behind a "Someone" share. */
export const PATCH = withUser(async (user, req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { contactId } = z.object({ contactId: z.string().min(1) }).parse(await req.json());
  await assignShare(user.id, id, contactId);
  return json({ contacts: await loadContacts(user.id), someone: await loadUnassignedShares(user.id) });
});
