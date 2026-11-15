import { AppShell } from "@/components/app/app-shell";
import { requireUserOrRedirect } from "@/lib/request/auth";

/**
 * Everything under (app) needs a signed-in user: a visitor without a session
 * goes to /login before any of the app is sent. (The data itself is checked
 * again, per request, by the API routes.)
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUserOrRedirect();
  return <AppShell>{children}</AppShell>;
}
