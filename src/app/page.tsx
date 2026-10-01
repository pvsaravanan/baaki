"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

/**
 * The app opens here; go straight to the dashboard.
 *
 * The Android app's local server answers every page address with this page
 * (it treats the app as a single-page site), so if the WebView reloads while
 * on, say, /settings/, this page is what arrives. In that case, fetch the
 * screen the address actually names instead of redirecting.
 */
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (window.location.pathname === "/") router.replace("/dashboard");
    else router.refresh();
  }, [router]);
  return (
    <div className="flex h-dvh items-center justify-center bg-bg">
      <Logo size="h-12 w-9" />
    </div>
  );
}
