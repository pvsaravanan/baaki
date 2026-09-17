/** @type {import('next').NextConfig} */
const nextConfig = {
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
