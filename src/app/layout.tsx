import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
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
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
