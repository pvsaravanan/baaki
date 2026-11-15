/**
 * Writes a baaki backup of demo data that ends today: the last three months
 * of transactions, a budget for this month, and a few recurring items, all on
 * the same accounts and categories as the screenshots' sample data
 * (scripts/sample-data.ts). Restore it in the app under Settings → Backup & Data.
 *
 *   npx vite-node scripts/demo-backup.ts [file]     (default: baaki-demo.json)
 */
import { writeFileSync } from "node:fs";
import { sampleBackup } from "./sample-data";

/** Now, in the local time zone, as the backup's own timestamps are written. */
function localNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const offset = -d.getTimezoneOffset();
  const sign = offset < 0 ? "-" : "+";
  const zone = `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${zone}`;
}

const file = process.argv[2] ?? "baaki-demo.json";
const backup = sampleBackup(localNow());
writeFileSync(file, JSON.stringify(backup));
console.log(`${file}: ${backup.transactions.length} transactions, ${backup.accounts.length} accounts, ${backup.recurring.length} recurring, up to ${backup.exportedAt.slice(0, 10)}`);
