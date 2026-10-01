import { prisma } from "./db";
import { DEFAULT_CATEGORIES } from "./constants";
import { DEFAULT_DASHBOARD_WIDGETS } from "./dashboard-widgets";

/**
 * The app runs on one phone for one person, so there are no accounts or
 * passwords: the device's database holds a single `User` row — the anchor
 * every other table hangs off — created with starter data on first launch.
 * (Access to the app itself is guarded by the optional fingerprint/PIN lock.)
 */

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/** Placeholder email for the local profile; the column is required and unique. */
export const LOCAL_EMAIL = "me@baaki.local";
const DEFAULT_NAME = "You";

const PROFILE = { id: true, email: true, name: true, avatarUrl: true } as const;

// Concurrent first calls (the app fires several requests at start-up) must
// share one provisioning, or each would create its own profile.
let provisioning: Promise<SessionUser> | null = null;

/** The device's profile, created with starter data on first use. */
export async function getCurrentUser(): Promise<SessionUser> {
  const existing = await prisma.user.findFirst({ select: PROFILE, orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  provisioning ??= provisionUserProfile({ email: LOCAL_EMAIL, name: DEFAULT_NAME }).finally(() => {
    provisioning = null;
  });
  return provisioning;
}

/** The profile for a local API handler. */
export async function requireUser(): Promise<SessionUser> {
  return getCurrentUser();
}

/** Kept for handlers' error mapping; there is no signed-out state on the device. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthorizedError";
  }
}

/**
 * Provision a brand-new profile with starter data: default categories, two
 * accounts, and dashboard preferences.
 */
export async function provisionUserProfile(input: { email: string; name: string }): Promise<SessionUser> {
  return prisma.$transaction(async (db) => {
    const user = await db.user.create({
      data: { email: input.email, name: input.name.trim() || DEFAULT_NAME },
      select: PROFILE,
    });

    await db.category.createMany({
      data: DEFAULT_CATEGORIES.map((c, i) => ({
        userId: user.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        kind: c.kind,
        isSystem: true,
        systemKey: c.key,
        sortOrder: i,
      })),
    });

    const bank = await db.account.create({
      data: { userId: user.id, name: "Primary Bank", type: "bank", icon: "payment", color: "#0d9488", sortOrder: 0 },
    });
    await db.account.create({
      data: { userId: user.id, name: "Cash", type: "cash", icon: "dollars", color: "#f59e0b", sortOrder: 1 },
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
