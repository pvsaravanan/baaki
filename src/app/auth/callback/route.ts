import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / email-confirmation / password-recovery callback. Supabase redirects
 * here with a `code` which we exchange for a session (cookies set via the SSR
 * client). The local profile is provisioned lazily on the next render by
 * getCurrentUser. `next` lets recovery links continue to /reset.
 */
// Only ever follow `next` to a same-origin path. A bare "/" prefix is not
// enough — "//evil.com" and "/\evil.com" both parse as protocol-relative
// URLs that a browser will follow off-site.
function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) return next;
  return "/dashboard";
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
