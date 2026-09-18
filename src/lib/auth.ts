import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { JwtPayload } from "@supabase/supabase-js";
import { prisma } from "./db";
import { createClient } from "./supabase/server";
import { DEFAULT_CATEGORIES, DEFAULT_DASHBOARD_WIDGETS } from "./constants";

/**
 * Identity is owned by Supabase Auth. This module bridges a Supabase auth user
 * to the local `User` profile row (the FK anchor for all app data), keyed by
 * `authId` (= auth.users.id). App code keeps using the local `User.id`.
 */

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/** The identity fields we need from a verified auth token. */
interface AuthIdentity {
  authId: string;
  email: string;
  name: string;
}

/** Normalize verified JWT claims into the identity fields the app cares about. */
function identityFromClaims(claims: JwtPayload): AuthIdentity {
  const email = (typeof claims.email === "string" ? claims.email : "").trim().toLowerCase();
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.name === "string" ? meta.name : undefined) ??
    (typeof meta.full_name === "string" ? meta.full_name : undefined) ??
    (email ? email.split("@")[0] : "there");
  return { authId: claims.sub, email, name };
}

/**
 * Resolve (and lazily provision) the local profile for a Supabase auth user.
 * - matches by authId first;
 * - otherwise links an existing row by email (e.g. an imported account whose
 *   authId hasn't been stamped yet);
 * - otherwise creates a fresh profile with starter data (first email/Google
 *   sign-in).
 */
async function resolveProfile({ authId, email, name }: AuthIdentity, emailVerified: boolean): Promise<SessionUser> {
  const byAuthId = await prisma.user.findUnique({
    where: { authId },
    select: { id: true, email: true, name: true, avatarUrl: true },
  });
  if (byAuthId) return byAuthId;

  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      if (byEmail.authId && byEmail.authId !== authId) throw new UnauthorizedError();
      if (!emailVerified) throw new UnauthorizedError();
      await prisma.user.updateMany({
        where: { id: byEmail.id, authId: null },
        data: { authId },
      });
      const linked = await prisma.user.findUnique({
        where: { authId },
        select: { id: true, email: true, name: true, avatarUrl: true },
      });
      if (!linked) throw new UnauthorizedError();
      return linked;
    }
  }

  return provisionUserProfile({ authId, email, name });
}

/**
 * Resolve the current signed-in user, or null. Wrapped in React `cache()` so a
 * single render (layout + page + any server component) shares one lookup.
 *
 * Uses `getClaims()` to verify the access-token JWT against the project's
 * signing key, then checks `getUser()` before resolving a local profile.
 * Middleware refreshes cookies, but its result alone is not authorization:
 * it may be skipped, and a signed token can outlive a deleted or banned user.
 * The Auth server's current email is used for legacy profile linking rather
 * than a potentially stale email in the token. App queries are additionally
 * scoped by userId. A forged or tampered token fails signature verification
 * here and yields null.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  const { data: current, error: userError } = await supabase.auth.getUser();
  if (userError || !current.user || current.user.id !== claims.sub) return null;
  const identity = identityFromClaims({ ...claims, email: current.user.email });
  return resolveProfile(identity, Boolean(current.user.email_confirmed_at));
});

/** Require an authenticated user in API routes; throws a tagged error otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/**
 * For protected Server Component pages: return the user, or redirect to /login.
 * Avoids the null-deref race where a page reads user.id before the layout's
 * own redirect resolves.
 */
export async function requireUserOrRedirect(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthorizedError";
  }
}

/**
 * Provision a brand-new profile with starter data: default categories, two
 * accounts, and dashboard preferences. Passwords are owned by Supabase, so no
 * passwordHash is stored here.
 */
export async function provisionUserProfile(input: {
  authId: string;
  email: string;
  name: string;
}): Promise<SessionUser> {
  return prisma.$transaction(async (db) => {
    const user = await db.user.create({
      data: { authId: input.authId, email: input.email, name: input.name.trim() || "there" },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    await db.category.createMany({
      data: DEFAULT_CATEGORIES.map((c, i) => ({
        userId: user.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        kind: c.kind,
        isSystem: true,
        sortOrder: i,
      })),
    });

    const bank = await db.account.create({
      data: { userId: user.id, name: "Primary Bank", type: "bank", icon: "landmark", color: "#0d9488", sortOrder: 0 },
    });
    await db.account.create({
      data: { userId: user.id, name: "Cash", type: "cash", icon: "wallet", color: "#f59e0b", sortOrder: 1 },
    });

    await db.userPreference.create({
      data: {
        userId: user.id,
        dashboardWidgets: JSON.stringify(DEFAULT_DASHBOARD_WIDGETS),
        defaultAccountId: bank.id,
      },
    });

    return user;
  });
}
