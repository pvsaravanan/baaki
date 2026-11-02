import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The Android app: a native shell around the static build in `out/`
 * (`npm run build:app`). Everything — screens, calculations and the database —
 * runs on the phone; the app makes no network requests.
 */
const config: CapacitorConfig = {
  appId: "app.baaki",
  appName: "baaki",
  webDir: "out",
  android: {
    // The parchment page colour behind the WebView while it starts.
    backgroundColor: "#f4f1ea",
  },
  plugins: {
    SplashScreen: {
      // Hidden by the app itself once its data is ready (see native-app.tsx).
      launchAutoHide: false,
      // No cross-fade into the app: during one, the splash logo hangs
      // half-transparent over the welcome screen beneath it. 1 ms, not 0: at 0
      // the plugin leaves the exit to the system, whose own fade does the same.
      launchFadeOutDuration: 1,
      // As the Android splash (android/app/src/main/res/values/splash_background.xml).
      backgroundColor: "#f8f2e9",
      showSpinner: false,
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
