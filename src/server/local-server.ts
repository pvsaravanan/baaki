import { requireUser } from "@/lib/auth";
import { ensureDb } from "@/lib/local-db";
import { pglite } from "@/lib/db";
import { removeStoredData } from "@/lib/db-storage";
import { localRequest, type NextRequest } from "./request";
import { PAGE_LOADERS, type PageData, type PageName } from "./pages";
import * as r_accounts_id from "./api/accounts/[id]/route";
import * as r_accounts from "./api/accounts/route";
import * as r_backup_restore from "./api/backup/restore/route";
import * as r_budgets from "./api/budgets/route";
import * as r_categories_id from "./api/categories/[id]/route";
import * as r_categories from "./api/categories/route";
import * as r_categorize from "./api/categorize/route";
import * as r_contacts_id from "./api/contacts/[id]/route";
import * as r_contacts_id_shares from "./api/contacts/[id]/shares/route";
import * as r_contacts from "./api/contacts/route";
import * as r_export from "./api/export/route";
import * as r_goals_id_allocate from "./api/goals/[id]/allocate/route";
import * as r_goals_id_remove from "./api/goals/[id]/remove/route";
import * as r_goals_id from "./api/goals/[id]/route";
import * as r_goals_resolve_shortfall from "./api/goals/resolve-shortfall/route";
import * as r_goals from "./api/goals/route";
import * as r_import from "./api/import/route";
import * as r_preferences from "./api/preferences/route";
import * as r_recurring_id_post from "./api/recurring/[id]/post/route";
import * as r_recurring_id from "./api/recurring/[id]/route";
import * as r_recurring_id_skip from "./api/recurring/[id]/skip/route";
import * as r_recurring from "./api/recurring/route";
import * as r_recurring_run_due from "./api/recurring/run-due/route";
import * as r_shares_id_settle from "./api/shares/[id]/settle/route";
import * as r_transactions_id_duplicate from "./api/transactions/[id]/duplicate/route";
import * as r_transactions_id_restore from "./api/transactions/[id]/restore/route";
import * as r_transactions_id from "./api/transactions/[id]/route";
import * as r_transactions_bulk_delete from "./api/transactions/bulk-delete/route";
import * as r_transactions from "./api/transactions/route";
import * as r_user_avatar from "./api/user/avatar/route";
import * as r_user from "./api/user/route";

/**
 * The app's "server", running inside the app itself. Screens and forms still
 * call `/api/...` URLs (through src/lib/http.ts); instead of going over the
 * network, each call is matched here to the same route handler that used to
 * run on the server, which reads and writes the on-device database. Loaded
 * lazily (see src/lib/local-api.ts), so the database engine only downloads
 * once the app actually needs data.
 */

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
type RouteModule = Partial<Record<Method, Handler>>;

// Each entry: URL pattern → that route file's exported GET/POST/… handlers.
const ROUTES: [string, object][] = [
  ["/api/accounts/:id", r_accounts_id],
  ["/api/accounts", r_accounts],
  ["/api/backup/restore", r_backup_restore],
  ["/api/budgets", r_budgets],
  ["/api/categories/:id", r_categories_id],
  ["/api/categories", r_categories],
  ["/api/categorize", r_categorize],
  ["/api/contacts/:id", r_contacts_id],
  ["/api/contacts/:id/shares", r_contacts_id_shares],
  ["/api/contacts", r_contacts],
  ["/api/export", r_export],
  ["/api/goals/:id/allocate", r_goals_id_allocate],
  ["/api/goals/:id/remove", r_goals_id_remove],
  ["/api/goals/:id", r_goals_id],
  ["/api/goals/resolve-shortfall", r_goals_resolve_shortfall],
  ["/api/goals", r_goals],
  ["/api/import", r_import],
  ["/api/preferences", r_preferences],
  ["/api/recurring/:id/post", r_recurring_id_post],
  ["/api/recurring/:id", r_recurring_id],
  ["/api/recurring/:id/skip", r_recurring_id_skip],
  ["/api/recurring", r_recurring],
  ["/api/recurring/run-due", r_recurring_run_due],
  ["/api/shares/:id/settle", r_shares_id_settle],
  ["/api/transactions/:id/duplicate", r_transactions_id_duplicate],
  ["/api/transactions/:id/restore", r_transactions_id_restore],
  ["/api/transactions/:id", r_transactions_id],
  ["/api/transactions/bulk-delete", r_transactions_bulk_delete],
  ["/api/transactions", r_transactions],
  ["/api/user/avatar", r_user_avatar],
  ["/api/user", r_user],
];

interface CompiledRoute {
  segments: string[];
  module: RouteModule;
  /** Static routes win over parameterised ones (…/bulk-delete before …/:id). */
  params: number;
}

const COMPILED: CompiledRoute[] = ROUTES.map(([pattern, module]) => {
  const segments = pattern.split("/").filter(Boolean);
  return { segments, module: module as unknown as RouteModule, params: segments.filter((s) => s.startsWith(":")).length };
}).sort((a, b) => a.params - b.params);

/** Find the route for a path, with its `:param` values. Exported for tests. */
export function matchRoute(pathname: string): { module: RouteModule; params: Record<string, string> } | null {
  const parts = pathname.split("/").filter(Boolean);
  for (const route of COMPILED) {
    if (route.segments.length !== parts.length) continue;
    const params: Record<string, string> = {};
    const ok = route.segments.every((seg, i) => {
      if (seg.startsWith(":")) {
        params[seg.slice(1)] = decodeURIComponent(parts[i]);
        return true;
      }
      return seg === parts[i];
    });
    if (ok) return { module: route.module, params };
  }
  return null;
}

/** Answer one `/api/...` request, the way the server used to. */
export async function handle(url: string, init: RequestInit = {}): Promise<Response> {
  await ensureDb();
  const target = new URL(url, "http://baaki.local");
  const route = matchRoute(target.pathname);
  if (!route) return Response.json({ error: "Not found" }, { status: 404 });
  const method = (init.method ?? "GET").toUpperCase() as Method;
  const handler = route.module[method];
  if (!handler) return Response.json({ error: "Method not allowed" }, { status: 405 });
  return handler(localRequest(target, { ...init, method }), { params: Promise.resolve(route.params) });
}

/** Load one screen's data (see ./pages). */
export async function loadPage<K extends PageName>(name: K, params: Record<string, string | undefined>): Promise<PageData<K>> {
  await ensureDb();
  const user = await requireUser();
  const loader = PAGE_LOADERS[name] as (u: typeof user, p: typeof params) => Promise<PageData<K>>;
  return loader(user, params);
}

/**
 * Last resort when the database can't be opened: close it and delete its
 * files, so the app starts over with a fresh one (a backup file can then be
 * restored from Settings). The caller reloads the app afterwards.
 */
export async function eraseEverything(): Promise<void> {
  await pglite.close().catch(() => undefined);
  await removeStoredData();
}
