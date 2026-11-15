/**
 * Decoration for the top-right of a screen's header, in the style of the
 * Categories and Recurring ones: a coral wash with line art over it. Each is
 * the same size, so the headers line up.
 */
const SURFACE = "hsl(var(--surface))";
const WASH = "hsl(var(--brand-soft))";
const CORAL = "#e0603a";
const GOLD = "#f2b84b";

function Art({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 90"
      className="h-[76px] w-[100px] shrink-0 text-fg sm:h-[90px] sm:w-[120px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 88 C4 50 32 22 72 18 H118 V88 Z" fill={WASH} stroke="none" />
      {children}
    </svg>
  );
}

/** Budget: a pie chart beside a stack of coins. */
export function BudgetArt() {
  return (
    <Art>
      <path d="M32 24 L28 17 M22 34 L15 31 M42 18 L41 10" />
      <circle cx="52" cy="50" r="26" fill={SURFACE} />
      <path d="M52 50 V24 A26 26 0 0 1 77 57 Z" fill={CORAL} />
      <path d="M52 50 L77 57 A26 26 0 0 1 61 75 Z" fill={GOLD} />
      <path d="M78 64 V74 C78 78 84 81 92 81 C100 81 106 78 106 74 V64" fill={SURFACE} />
      <ellipse cx="92" cy="64" rx="14" ry="6" fill={GOLD} />
    </Art>
  );
}

/** Accounts: a wallet with a card peeking out. */
export function AccountsArt() {
  return (
    <Art>
      <path d="M36 20 L32 13 M26 30 L19 27 M46 15 L45 8" />
      <rect x="42" y="22" width="52" height="34" rx="5" transform="rotate(-7 68 39)" fill={GOLD} />
      <rect x="26" y="38" width="68" height="42" rx="7" fill={SURFACE} />
      <path d="M26 48 H94" />
      <rect x="70" y="52" width="30" height="16" rx="6" fill={CORAL} />
      <circle cx="79" cy="60" r="2.5" fill={SURFACE} stroke="none" />
    </Art>
  );
}

/** To collect: a rupee coin with a smaller one coming back to you. */
export function ToCollectArt() {
  return (
    <Art>
      <path d="M34 22 L30 15 M24 32 L17 29 M44 16 L43 9" />
      <circle cx="56" cy="46" r="26" fill={GOLD} />
      <circle cx="56" cy="46" r="19" fill="none" />
      <text x="56" y="56" textAnchor="middle" fontSize="28" fontWeight="800" fill="currentColor" stroke="none">
        ₹
      </text>
      <circle cx="92" cy="66" r="14" fill={SURFACE} />
      <path d="M98 66 H86 M91 61 L86 66 L91 71" stroke={CORAL} strokeWidth="2.5" />
    </Art>
  );
}

/** Settings: a large gear and a small one. */
export function SettingsArt() {
  return (
    <Art>
      <path d="M30 20 L26 13 M20 30 L13 27 M40 14 L39 7" />
      <g transform="translate(58 48)">
        <rect x="-5" y="-29" width="10" height="58" rx="2" fill={SURFACE} />
        <rect x="-5" y="-29" width="10" height="58" rx="2" fill={SURFACE} transform="rotate(45)" />
        <rect x="-5" y="-29" width="10" height="58" rx="2" fill={SURFACE} transform="rotate(90)" />
        <rect x="-5" y="-29" width="10" height="58" rx="2" fill={SURFACE} transform="rotate(135)" />
        <circle r="21" fill={SURFACE} />
        <circle r="8" fill={WASH} />
      </g>
      <g transform="translate(96 68)">
        <rect x="-3.5" y="-15" width="7" height="30" rx="1.5" fill={CORAL} />
        <rect x="-3.5" y="-15" width="7" height="30" rx="1.5" fill={CORAL} transform="rotate(90)" />
        <circle r="10" fill={CORAL} />
        <circle r="3.5" fill={SURFACE} />
      </g>
    </Art>
  );
}

/** Import: a statement with an arrow bringing it in. */
export function ImportArt() {
  return (
    <Art>
      <path d="M34 20 L30 13 M24 30 L17 27 M44 14 L43 7" />
      <rect x="40" y="14" width="46" height="58" rx="6" fill={SURFACE} />
      <path d="M50 30 H76 M50 40 H76 M50 50 H66" />
      <circle cx="88" cy="66" r="17" fill={CORAL} />
      <path d="M88 57 V74 M80 67 L88 75 L96 67" stroke={SURFACE} strokeWidth="2.5" />
    </Art>
  );
}

/** Transactions: a statement with swapping arrows beside it. */
export function TransactionsArt() {
  return (
    <Art>
      <path d="M30 22 L26 15 M20 32 L13 29 M40 16 L39 9" />
      <rect x="36" y="14" width="48" height="58" rx="6" fill={SURFACE} />
      <path d="M46 28 H74 M46 38 H74 M46 48 H62" />
      <circle cx="88" cy="64" r="17" fill={CORAL} />
      <path d="M80 60 H96 M92 56 L96 60 L92 64 M96 69 H80 M84 65 L80 69 L84 73" stroke={SURFACE} strokeWidth="2.5" />
    </Art>
  );
}

/** Reports: a bar chart with a rising line. */
export function ReportsArt() {
  return (
    <Art>
      <path d="M30 22 L26 15 M20 32 L13 29 M40 16 L39 9" />
      <rect x="32" y="18" width="62" height="56" rx="6" fill={SURFACE} />
      <rect x="42" y="50" width="10" height="16" rx="2" fill={GOLD} />
      <rect x="58" y="40" width="10" height="26" rx="2" fill={CORAL} />
      <rect x="74" y="30" width="10" height="36" rx="2" fill={GOLD} />
      <path d="M40 44 L58 32 L74 38 L100 20" stroke={CORAL} strokeWidth="2.5" />
      <path d="M92 20 H100 V28" stroke={CORAL} strokeWidth="2.5" />
    </Art>
  );
}
