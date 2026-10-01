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
      backgroundColor: "#f4f1ea",
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
