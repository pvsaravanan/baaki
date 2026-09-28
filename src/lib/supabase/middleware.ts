import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and forwards the updated
 * auth cookies. Must run in middleware so Server Components always see a fresh
 * session. Do not add logic between createServerClient and getClaims().
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // No-op until a real anon key is configured (the .env.example placeholder is
  // "[ANON-PUBLIC-KEY]"). Prevents failing auth calls on every request while
  // the migration is mid-setup. Don't gate on the legacy "eyJ..." JWT prefix:
  // newer Supabase projects issue "sb_publishable_..." keys, which would make
  // this skip silently and stop sessions from refreshing.
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey || anonKey.startsWith("[")) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Refresh the session token if it's expired and re-issue it via cookies.
  // getClaims() verifies the JWT locally against the project's cached signing
  // key, so unlike getUser() it costs no Auth-server round trip on every
  // request. Middleware isn't the authorization check — getCurrentUser()
  // still asks the Auth server (getUser) before any data is served.
  await supabase.auth.getClaims();

  return response;
}
