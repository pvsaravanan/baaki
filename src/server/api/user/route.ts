import type { NextRequest } from "@/server/request";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { json, withUser } from "@/lib/api";
import { AVATAR_IDS, avatarUrlFor } from "@/lib/avatars";

const userUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80, "Name is too long").optional(),
    /** One of the profile pictures, or null for none. */
    avatar: z.enum(AVATAR_IDS, { message: "Choose one of the pictures" }).nullable().optional(),
  })
  .refine((v) => v.name !== undefined || v.avatar !== undefined, { message: "Nothing to update" });

/** Update the current user's display name and/or profile picture. */
export const PATCH = withUser(async (user, req: NextRequest) => {
  const { name, avatar } = userUpdateSchema.parse(await req.json());
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(avatar !== undefined && { avatarUrl: avatar && avatarUrlFor(avatar) }),
    },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  return json({ user: updated });
});
