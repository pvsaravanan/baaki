import type { NextRequest } from "@/server/request";
import { json, withUser } from "@/lib/api";
import { unsettleSplits } from "@/lib/tx-service";
import { unsettleSplitsSchema } from "@/lib/validation";

/** Undo settling: the shares are to collect again. */
export const POST = withUser(async (user, req: NextRequest) => {
  const { ids } = unsettleSplitsSchema.parse(await req.json());
  const count = await unsettleSplits(user.id, ids);
  return json({ ok: true, count });
});
