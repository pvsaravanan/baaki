import type { Metadata, Viewport } from "next";
import { Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

/**
 * Run the server functions in Singapore, next to the Supabase database
 * (ap-southeast-1). Each page render makes several server->DB round trips but
 * only one browser->server trip, so co-locating compute with the DB removes the
 * cross-region latency that dominated page loads. Set at the root so it is
 * inherited by every page and API route handler. Only affects Vercel.
 */
export const preferredRegion = "sin1";

/**
 * Roboto Mono is the whole system typeface. Self-hosted by next/font at build
 * time — no external request at runtime. Variable weight covers 400–800.
 */
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "baaki — Know where your money goes",
  description:
    "A personal finance and expense tracker: record transactions, track budgets, savings and goals, and understand where your money goes.",
  applicationName: "baaki",
};

export const viewport: Viewport = {
  // Light theme only — the parchment page colour, even in system dark mode.
  themeColor: "#f4f1ea",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={robotoMono.variable}>
      <body className="min-h-dvh bg-bg font-mono text-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
