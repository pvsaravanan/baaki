/**
 * Runs once when the Next.js server boots, before any request is handled.
 *
 * All financial-period math (dates.ts, analytics.ts, the recurring
 * auto-post job) works in the server process's local time, on the
 * assumption that it matches the user's timezone (India). That assumption
 * silently breaks on hosts whose default timezone isn't IST (e.g. most
 * serverless platforms default to UTC) — "today"/"this month" boundaries
 * and recurring auto-post due-dates would land up to ~5.5 hours off
 * around IST midnight. Pin the process timezone explicitly so local-time
 * math is correct regardless of the host's default.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = process.env.TZ || "Asia/Kolkata";
  }
}
