import { json, withUser } from "@/lib/api";
import { loadUnassignedShares } from "@/lib/contacts-service";

export const GET = withUser(async (user) => {
  return json({ shares: await loadUnassignedShares(user.id) });
});
