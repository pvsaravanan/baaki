/**
 * The request the local API hands to a route handler: a standard `Request`
 * plus `nextUrl`, the one Next.js extra these handlers read (for query
 * strings). Keeps the handlers written exactly like Next.js route handlers.
 */
export type NextRequest = Request & { nextUrl: URL };

export function localRequest(url: URL, init: RequestInit): NextRequest {
  return Object.assign(new Request(url, init), { nextUrl: url });
}
