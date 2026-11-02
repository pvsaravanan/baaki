"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePageData } from "@/lib/local-api";
import { NativeApp } from "@/components/app/native-app";
import { splashGone } from "@/components/app/splash-handoff";
import { ChooseAvatarScreen } from "@/components/app/choose-avatar-screen";
import { OnboardingScreen } from "@/components/app/onboarding-screen";
import { WelcomeScreen } from "@/components/app/welcome-screen";

const WELCOMED_KEY = "baaki.welcomed";

function hasBeenWelcomed() {
  try {
    return localStorage.getItem(WELCOMED_KEY) === "1";
  } catch {
    return true; // storage unavailable: never trap anyone on the welcome screen
  }
}

/**
 * The app opens here. A new install sees the welcome screen, the onboarding
 * pages and a profile picture to choose once; after that (and in a browser
 * reload) it goes straight to the dashboard.
 *
 * The Android app's local server answers every page address with this page
 * (it treats the app as a single-page site), so if the WebView reloads while
 * on, say, /settings/, this page is what arrives. In that case, fetch the
 * screen the address actually names instead of redirecting.
 */
/** Opens the on-device database, by loading what the app frame shows. */
function OpenDatabase() {
  usePageData("shell");
  return null;
}

export default function Home() {
  const router = useRouter();
  // Open the on-device database during the welcome screen (it takes a while on
  // a first run) rather than after onboarding: the app frame reads this same
  // cached result, so the dashboard appears straight away. Not before the
  // splash has gone, though: opening it keeps the phone busy for a few seconds,
  // and the splash's exit would stutter.
  const [openDatabase, setOpenDatabase] = useState(false);
  useEffect(() => void splashGone.then(() => setOpenDatabase(true)), []);
  const [stage, setStage] = useState<"loading" | "welcome" | "onboarding" | "back-to-onboarding" | "avatar">("loading");
  useEffect(() => {
    if (window.location.pathname !== "/") router.refresh();
    else if (hasBeenWelcomed()) router.replace("/dashboard");
    else setStage("welcome");
  }, [router]);

  function finish() {
    try {
      localStorage.setItem(WELCOMED_KEY, "1");
    } catch {}
    router.replace("/dashboard");
  }

  // NativeApp hides the native splash. It is only mounted for the welcome and
  // onboarding pages: for a returning person the splash stays up while this
  // page redirects and the dashboard's data loads (AppShell hides it once
  // that's ready), so there's no second loading screen in between.
  return (
    <>
      {stage !== "loading" && <NativeApp />}
      {openDatabase && <OpenDatabase />}
      {stage === "welcome" && <WelcomeScreen onStart={() => setStage("onboarding")} />}
      {(stage === "onboarding" || stage === "back-to-onboarding") && (
        <OnboardingScreen fromEnd={stage === "back-to-onboarding"} onDone={() => setStage("avatar")} />
      )}
      {stage === "avatar" && <ChooseAvatarScreen onBack={() => setStage("back-to-onboarding")} onDone={finish} />}
      {stage === "loading" && <div className="h-dvh bg-bg" />}
    </>
  );
}
