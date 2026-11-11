/** "GOOD AFTERNOON," over the first name, and a line about the month shown. */
export function DashboardGreeting({ greeting, name, monthName }: { greeting: string; name: string; monthName: string }) {
  return (
    <div data-tour="greeting" className="min-w-0">
      <p className="text-label-md uppercase tracking-[0.06em] text-fg md:text-label-lg">{greeting},</p>
      <h1 className="truncate text-[28px] font-bold leading-[32px] tracking-tight text-fg md:text-[40px] md:leading-[46px]">{name}</h1>
      <p className="mt-1 text-[12px] leading-4 text-muted md:mt-2 md:text-body-sm [@media(max-height:740px)_and_(max-width:767px)]:hidden">Here&apos;s your money story for {monthName}.</p>
    </div>
  );
}
