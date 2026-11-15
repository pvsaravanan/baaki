import { requireUser } from "@/lib/request/auth";
import { withQueryCache } from "@/lib/db/queries";
import { localRequest, type NextRequest } from "./request";
import { PAGE_LOADERS, type PageData, type PageName } from "./pages";
import { ROUTES } from "@/generated/api-routes";

/**
 * The app's API, answered by the web server. Screens and forms call `/api/...`
 * URLs (through src/lib/request/http.ts); the catch-all route
 * src/app/api/[...path]/route.ts hands each call to `dispatch`, which matches
 * it to the route handler in src/server/api and runs it as the signed-in user.
 * Every src/server/api/<path>/route.ts is listed automatically by
 * scripts/api-routes.mjs (`npm run generate`).
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

/** Answer one `/api/...` request: find its route handler and run it. */
export async function dispatch(req: NextRequest): Promise<Response> {
  const route = matchRoute(req.nextUrl.pathname);
  if (!route) return Response.json({ error: "Not found" }, { status: 404 });
  const handler = route.module[req.method.toUpperCase() as Method];
  if (!handler) return Response.json({ error: "Method not allowed" }, { status: 405 });
  // Reads within one request share a copy of the tables (see queries.ts).
  return withQueryCache(() => handler(req, { params: Promise.resolve(route.params) }));
}

/** `dispatch` for a URL and options, for tests. */
export async function handle(url: string, init: RequestInit = {}): Promise<Response> {
  const target = new URL(url, "http://baaki.local");
  const method = (init.method ?? "GET").toUpperCase();
  return dispatch(localRequest(target, { ...init, method }));
}

/** Load one screen's data (see ./pages). */
export async function loadPage<K extends PageName>(name: K, params: Record<string, string | undefined>): Promise<PageData<K>> {
  const user = await requireUser();
  const loader = PAGE_LOADERS[name] as (u: typeof user, p: typeof params) => Promise<PageData<K>>;
  return withQueryCache(() => loader(user, params));
}
