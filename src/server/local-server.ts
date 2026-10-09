import { requireUser } from "@/lib/auth";
import { ensureDb } from "@/lib/local-db";
import { pglite } from "@/lib/db";
import { removeStoredData } from "@/lib/db-storage";
import { localRequest, type NextRequest } from "./request";
import { PAGE_LOADERS, type PageData, type PageName } from "./pages";
import { ROUTES } from "@/generated/api-routes";

/**
 * The app's "server", running inside the app itself. Screens and forms still
 * call `/api/...` URLs (through src/lib/http.ts); instead of going over the
 * network, each call is matched here to the same route handler that used to
 * run on the server, which reads and writes the on-device database. Every
 * src/server/api/<path>/route.ts is listed automatically by
 * scripts/api-routes.mjs (`npm run generate`). Loaded
 * lazily (see src/lib/local-api.ts), so the database engine only downloads
 * once the app actually needs data.
 */

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
type RouteModule = Partial<Record<Method, Handler>>;

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
