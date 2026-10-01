import { json, withUser } from "@/lib/api";
import { postDueRecurring } from "@/lib/recurring";

/**
 * Post any due auto-post recurring rules for the current user. Called by the
 * app when it opens and whenever it comes back to the foreground;
 * `postOccurrence` holds an optimistic lock, so overlapping calls never
 * duplicate a transaction.
 */
export const POST = withUser(async (user) => {
  const posted = await postDueRecurring(user.id, new Date());
  return json({ posted });
});
