import type { NextRequest } from "@/server/request";
import { json, withUser } from "@/lib/request/api";
import { settleSplits } from "@/lib/transactions/tx-service";
import { settleSplitsSchema } from "@/lib/request/validation";

/** Mark split shares as paid back, into the chosen account. */
export const POST = withUser(async (user, req: NextRequest) => {
  const { ids, accountId } = settleSplitsSchema.parse(await req.json());
  const count = await settleSplits(user.id, ids, accountId);
  return json({ ok: true, count });
});
