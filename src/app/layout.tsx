import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";

/**
 * Plus Jakarta Sans is the whole system typeface: the unmodified variable
 * font (weights 200–800), bundled with the app, so no request at runtime.
 * SIL Open Font License, see fonts/PlusJakartaSans-OFL.txt. The weight names
 * are mapped heavier in tailwind.config.ts.
 */
const plusJakartaSans = localFont({
  src: "./fonts/PlusJakartaSans.ttf",
  weight: "200 800",
  style: "normal",
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "baaki — Know where your money goes",
  description:
    "A personal finance and expense tracker: record transactions, track budgets and savings, and understand where your money goes.",
  applicationName: "baaki",
};

export const viewport: Viewport = {
  // Light theme only — the parchment page colour, even in system dark mode.
  themeColor: "#f4f1ea",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  // An app, not a web page: no pinch-zoom or double-tap zoom.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

/**
 * baaki is offline by design: everything is stored and computed on the
 * phone. This policy makes that a guarantee rather than a promise — the app
 * can load only its own files, and can't connect anywhere else.
 * ('wasm-unsafe-eval' lets the on-device database's WebAssembly run.) Left
 * out of `next dev`, whose hot reloading needs eval.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <head>
        {process.env.NODE_ENV === "production" && (
          <meta httpEquiv="Content-Security-Policy" content={CONTENT_SECURITY_POLICY} />
        )}
      </head>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
