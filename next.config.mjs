/**
 * baaki ships as a static site inside the Android app (Capacitor serves the
 * `out/` folder from the phone). There is no server: every screen renders on
 * the device and reads the on-device database (see src/lib/local-api.ts).
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: "export",
  // Names this build's cached screens (see src/lib/local-api.ts).
  env: { NEXT_PUBLIC_BUILD_ID: String(Date.now()) },
  // Each route becomes <route>/index.html, which the app's WebView serves directly.
  trailingSlash: true,
  // No image optimisation server; icons are shipped at their real sizes.
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  // Silences webpack's PackFileCacheStrategy "Serializing big strings"
  // notice — a benign perf note about the dev persistent cache, not an
  // error — without hiding real build warnings/errors.
  webpack: (config) => {
    config.infrastructureLogging = { level: "error" };
    return config;
  },
};

export default nextConfig;
