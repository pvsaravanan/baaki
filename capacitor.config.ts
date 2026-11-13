import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The Android and iOS apps: native shells around the static build in `out/`
 * (`npm run build:app`, `npm run build:ios`). Everything — screens,
 * calculations and the database — runs on the phone; the app makes no network
 * requests.
 */
const config: CapacitorConfig = {
  appId: "app.baaki",
  appName: "baaki",
  webDir: "out",
  android: {
    // The parchment page colour behind the WebView while it starts.
    backgroundColor: "#f4f1ea",
  },
  ios: {
    backgroundColor: "#f4f1ea",
    // The page pads itself with env(safe-area-inset-*) (top bar, bottom
    // navigation), so the WebView fills the screen with no insets of its own.
    contentInset: "never",
    // Long-pressing a link would otherwise open a preview of the page.
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      // Not used at launch: the launch animation (LaunchVideo.java on Android,
      // LaunchCover.swift on iOS) covers the
      // app while it loads, and the app dismisses it once its data is ready.
      launchShowDuration: 0,
      // No cross-fade into the app: during one, the splash logo hangs
      // half-transparent over the welcome screen beneath it. 1 ms, not 0: at 0
      // the plugin leaves the exit to the system, whose own fade does the same.
      launchFadeOutDuration: 1,
      // As the Android splash (android/app/src/main/res/values/splash_background.xml).
      backgroundColor: "#f8f2e9",
      showSpinner: false,
    },
    // iOS: the keyboard shrinks the WebView, as Android does on its own, rather
    // than sliding the whole page up (which pushed open sheets' headers under
    // the status bar). Sheets and forms lay themselves out in what's left.
    Keyboard: {
      resize: "native",
    },
    // Edge-to-edge (Android 15+): the app draws behind the status and
    // navigation bars and pads itself with env(safe-area-inset-*), as the
    // top bar and bottom navigation already do. ("native": older WebViews
    // without those values get padding around the WebView instead.)
    SystemBars: {
      insetsHandling: "native",
      initialViewportFitValueHint: "cover",
      style: "LIGHT", // dark icons, for the light parchment background
    },
  },
};

export default config;
