/** Decoration only: a calendar with a repeat sign. */
export function RepeatCalendar() {
  return (
    <svg aria-hidden viewBox="0 0 110 86" className="h-[72px] w-[92px] shrink-0 text-fg sm:h-[86px] sm:w-[110px]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 84 C6 52 28 32 58 32 C86 32 106 52 108 84 Z" fill="hsl(var(--brand-soft))" stroke="none" />
      <path d="M26 12 L21 7 M17 22 L10 19 M35 8 L33 2" />
      <rect x="38" y="18" width="62" height="60" rx="7" fill="hsl(var(--surface))" />
      <path d="M38 34 H100 M38 25 C38 21 41 18 45 18 H93 C97 18 100 21 100 25 V34 H38 Z" fill="hsl(var(--brand-soft))" />
      <path d="M52 12 V24 M86 12 V24" />
      <path d="M81 52 A12 12 0 0 0 59 49 M59 43 V49 H65 M58 60 A12 12 0 0 0 80 63 M80 69 V63 H74" />
    </svg>
  );
}
