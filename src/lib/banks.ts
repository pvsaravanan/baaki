/**
 * Registry of popular banks for the account form's bank picker.
 *
 * `domain` identifies the bank's website; logos are bundled locally via
 * src/components/app/bank-logo-assets.ts. `color` is the bank's brand color,
 * used as the account color default. `monogram` is a short (<=5 char) code
 * used only as a fallback if the local logo is missing or cannot load.
 *
 * Selecting a bank stores `bank:<id>` in `Account.icon`, so logos render
 * anywhere an account icon would.
 */
export interface Bank {
  id: string;
  name: string;
  shortName: string; // used for search matching
  monogram: string; // <=5 chars, shown on the fallback badge
  domain: string;
  color: string;
}

export const BANKS: Bank[] = [
  { id: "hdfc", name: "HDFC Bank", shortName: "HDFC", monogram: "HDFC", domain: "hdfcbank.com", color: "#004c8f" },
  { id: "icici", name: "ICICI Bank", shortName: "ICICI", monogram: "ICICI", domain: "icicibank.com", color: "#b02a30" },
  { id: "sbi", name: "State Bank of India", shortName: "SBI", monogram: "SBI", domain: "sbi.co.in", color: "#22409a" },
  { id: "axis", name: "Axis Bank", shortName: "Axis", monogram: "AXIS", domain: "axisbank.com", color: "#ae275f" },
  { id: "kotak", name: "Kotak Mahindra Bank", shortName: "Kotak", monogram: "KOTAK", domain: "kotak.com", color: "#003a70" },
  { id: "pnb", name: "Punjab National Bank", shortName: "PNB", monogram: "PNB", domain: "pnbindia.in", color: "#a20e37" },
  { id: "bob", name: "Bank of Baroda", shortName: "BoB", monogram: "BOB", domain: "bankofbaroda.in", color: "#f15a22" },
  { id: "canara", name: "Canara Bank", shortName: "Canara", monogram: "CNRB", domain: "canarabank.com", color: "#005da9" },
  { id: "union", name: "Union Bank of India", shortName: "Union", monogram: "UBI", domain: "unionbankofindia.co.in", color: "#0a4d8c" },
  { id: "idfc", name: "IDFC FIRST Bank", shortName: "IDFC", monogram: "IDFC", domain: "idfcfirstbank.com", color: "#9b1d27" },
  { id: "indusind", name: "IndusInd Bank", shortName: "IndusInd", monogram: "INDUS", domain: "indusind.com", color: "#98272a" },
  { id: "yes", name: "Yes Bank", shortName: "Yes", monogram: "YES", domain: "yesbank.in", color: "#00518f" },
  { id: "federal", name: "Federal Bank", shortName: "Federal", monogram: "FED", domain: "federalbank.co.in", color: "#b78c13" },
  { id: "boi", name: "Bank of India", shortName: "BoI", monogram: "BOI", domain: "bankofindia.co.in", color: "#0b4ba0" },
  { id: "indian", name: "Indian Bank", shortName: "Indian", monogram: "INB", domain: "indianbank.in", color: "#004687" },
  { id: "central", name: "Central Bank of India", shortName: "Central", monogram: "CBI", domain: "centralbankofindia.co.in", color: "#ed1c24" },
  { id: "bom", name: "Bank of Maharashtra", shortName: "BoM", monogram: "BOM", domain: "bankofmaharashtra.in", color: "#f7941d" },
  { id: "iob", name: "Indian Overseas Bank", shortName: "IOB", monogram: "IOB", domain: "iob.in", color: "#00563f" },
  { id: "uco", name: "UCO Bank", shortName: "UCO", monogram: "UCO", domain: "ucobank.com", color: "#00693c" },
  { id: "idbi", name: "IDBI Bank", shortName: "IDBI", monogram: "IDBI", domain: "idbibank.in", color: "#1b8a3d" },
  { id: "karnataka", name: "Karnataka Bank", shortName: "KBL", monogram: "KBL", domain: "karnatakabank.com", color: "#fdb913" },
  { id: "sib", name: "South Indian Bank", shortName: "SIB", monogram: "SIB", domain: "southindianbank.com", color: "#003b71" },
  { id: "cub", name: "City Union Bank", shortName: "CUB", monogram: "CUB", domain: "cityunionbank.com", color: "#8b1e41" },
  { id: "rbl", name: "RBL Bank", shortName: "RBL", monogram: "RBL", domain: "rblbank.com", color: "#21409a" },
  { id: "hsbc", name: "HSBC India", shortName: "HSBC", monogram: "HSBC", domain: "hsbc.co.in", color: "#db0011" },
  { id: "sc", name: "Standard Chartered India", shortName: "SC", monogram: "SC", domain: "sc.com", color: "#0072aa" },
  { id: "dbs", name: "DBS Bank India", shortName: "DBS", monogram: "DBS", domain: "dbs.com", color: "#b42025" },
  { id: "jupiter", name: "Jupiter (Federal)", shortName: "Jupiter", monogram: "JUP", domain: "jupiter.money", color: "#5b21b6" },
  { id: "fi", name: "Fi Money (Federal)", shortName: "Fi", monogram: "FI", domain: "fi.money", color: "#00b9f1" },
];

export const BANK_ICON_PREFIX = "bank:";

export function getBankById(id: string): Bank | undefined {
  return BANKS.find((b) => b.id === id);
}

/** Returns the bank id if an account icon encodes one (e.g. "bank:hdfc"). */
export function bankIdFromIcon(icon: string | null | undefined): string | undefined {
  return icon?.startsWith(BANK_ICON_PREFIX) ? icon.slice(BANK_ICON_PREFIX.length) : undefined;
}

export function getBankByIcon(icon: string | null | undefined): Bank | undefined {
  const id = bankIdFromIcon(icon);
  return id ? getBankById(id) : undefined;
}
