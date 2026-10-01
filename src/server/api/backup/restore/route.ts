import type { NextRequest } from "@/server/request";
import { json, withUser } from "@/lib/api";
import { restoreBackup } from "@/lib/backup";

/** Replace everything on the device with a backup file's contents. */
export const POST = withUser(async (user, req: NextRequest) => {
  const summary = await restoreBackup(user.id, await req.json());
  return json(summary);
});
