import { json, withUser } from "@/lib/api";
import { loadGoalsOverview, resolveShortfall } from "@/lib/goals-service";

/** Take the over-allocated amount off the goals so allocations fit the balance again. */
export const POST = withUser(async (user) => {
  const removed = await resolveShortfall(user.id);
  return json({ removed, ...(await loadGoalsOverview(user.id)) });
});
