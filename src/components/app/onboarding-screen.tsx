"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Hand-drawn coral wash behind every illustration (245 × 202). */
const WASH =
  "M60 24C90 -2 130 6 160 26C180 40 190 62 215 78C255 100 250 150 215 172C185 192 150 208 100 190C70 180 40 190 28 150C22 120 -10 100 6 60C14 40 40 36 60 24Z";

function ExpenseIllustration() {
  return (
    <svg viewBox="0 0 245 202" aria-hidden className="h-full w-[245px] overflow-visible" strokeLinecap="round" strokeLinejoin="round">
      <path d={WASH} className="fill-brand-soft" opacity="0.7" />
      {/* sparks */}
      <path d="M184 -1L178 24M217 21L194 35M198 54L225 58" className="stroke-fg" strokeWidth="3" fill="none" />
      {/* receipt */}
      <path
        d="M57 44H173V191L158.5 176L144 191L129.5 176L115 191L100.5 176L86 191L71.5 176L57 191Z"
        className="fill-bg stroke-fg"
        strokeWidth="4"
      />
      <path d="M59 46H171V68H59Z" className="fill-brand-hover stroke-fg" strokeWidth="3" />
      <path d="M76 90H155M76 112H155M76 135H117" className="stroke-fg" strokeWidth="3.5" fill="none" />
      <text x="145" y="162" textAnchor="middle" fontSize="32" fontWeight="700" className="fill-fg" fontFamily="var(--font-mono)">
        ₹
      </text>
    </svg>
  );
}

function SpendingIllustration() {
  return (
    <svg viewBox="0 0 261 202" aria-hidden className="h-full w-full overflow-visible" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M62 40C92 18 125 24 150 42C172 58 185 78 215 90C255 108 262 150 232 178C205 200 170 204 135 190C110 178 80 190 40 160C10 138 -5 100 12 78C22 62 45 55 62 40Z"
        className="fill-brand-soft"
        opacity="0.7"
      />
      {/* sparks */}
      <path d="M215 8L202 31M238 29L215 42M243 63L217 59" className="stroke-fg" strokeWidth="3" fill="none" />
      {/* bars */}
      <g className="stroke-fg" strokeWidth="3.5">
        <path d="M65 177V145H88V177Z" className="fill-[#dccdae]" />
        <path d="M100 177V115H123V177Z" className="fill-brand" />
        <path d="M135 177V87H157V177Z" className="fill-[#4a6e4c]" />
        <path d="M169 177V49H195V177Z" className="fill-brand-hover" />
      </g>
      {/* axes */}
      <path d="M48 86V177H215" className="stroke-fg" strokeWidth="4" fill="none" />
    </svg>
  );
}

function GoalIllustration() {
  return (
    <svg viewBox="0 0 261 202" aria-hidden className="h-full w-full overflow-visible" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M62 52C95 30 135 34 160 56C185 78 195 92 225 108C260 130 262 175 232 200C205 220 170 222 135 208C110 196 80 210 45 180C12 152 -4 120 14 98C26 80 45 66 62 52Z"
        className="fill-brand-soft"
        opacity="0.7"
      />
      {/* sparks */}
      <path d="M66 13L77 37M37 37L62 51M33 76L55 70" className="stroke-fg" strokeWidth="3" fill="none" />
      {/* target */}
      <circle cx="128.5" cy="133" r="67" className="fill-[#f3eee3] stroke-fg" strokeWidth="4" />
      <circle cx="128.5" cy="133" r="43" className="fill-brand-hover stroke-fg" strokeWidth="4" />
      {/* arrow */}
      <path d="M128.5 133L182 80" className="stroke-fg" strokeWidth="4.5" fill="none" />
      <circle cx="128.5" cy="133" r="6" className="fill-fg" />
      <path d="M177 68L199 42L201 57L221 59L199 83L180 80Z" className="fill-[#5b7f5b] stroke-fg" strokeWidth="3" />
    </svg>
  );
}

const SLIDES: { illustration: React.ReactNode; title: React.ReactNode; body: React.ReactNode }[] = [
  {
    illustration: <ExpenseIllustration />,
    title: (
      <>
        Track every
        <br />
        expense easily
      </>
    ),
    body: (
      <>
        Log your daily expenses in
        <br />
        seconds and stay in control.
      </>
    ),
  },
  {
    illustration: <SpendingIllustration />,
    title: (
      <>
        Understand
        <br />
        your spending
      </>
    ),
    body: (
      <>
        Get clear insights and
        <br />
        beautiful analytics.
      </>
    ),
  },
  {
    illustration: <GoalIllustration />,
    title: (
      <>
        Set goals
        <br />
        for a better you
      </>
    ),
    body: (
      <>
        Plan, save and achieve
        <br />
        what matters.
      </>
    ),
  },
];

/**
 * The pages after the welcome screen, one idea each: a picture, a headline,
 * a line of explanation, progress dots and a button to the next page (the
 * last one opens the app). Sized for a 390 × 780 phone screen.
 */
/** `fromEnd` opens on the last slide, when coming back from the next step. */
export function OnboardingScreen({ onDone, fromEnd = false }: { onDone: () => void; fromEnd?: boolean }) {
  const [index, setIndex] = useState(fromEnd ? SLIDES.length - 1 : 0);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  return (
    <main className="flex h-dvh flex-col items-center bg-bg px-10 pb-[max(env(safe-area-inset-bottom),8dvh)] pt-[env(safe-area-inset-top)]">
      <div key={index} className="flex flex-col items-center animate-enter">
        <div className="mt-[23dvh] flex h-[202px] w-[261px] shrink-0 justify-center">{slide.illustration}</div>
        <h1 className="mt-[28px] text-center text-[28px] font-bold leading-[42px] text-fg">{slide.title}</h1>
        <p className="mt-3 text-center text-[14px] leading-[27px] text-muted">{slide.body}</p>
      </div>

      <div className="relative mt-auto flex h-14 w-full items-center justify-end">
        <div className="absolute inset-x-0 flex justify-center gap-[13px]" role="presentation">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={cn("h-[11px] w-[11px] rounded-full", i === index ? "bg-brand-hover" : "bg-[#d3d1cb]")}
            />
          ))}
        </div>
        <Button
          aria-label="Next"
          size="icon"
          // `cn` can't resolve conflicting utilities, so the size and the round shape are set directly.
          style={{ width: 56, height: 56, borderRadius: "50%" }}
          className="relative"
          onClick={() => (last ? onDone() : setIndex(index + 1))}
        >
          <ArrowRight aria-hidden className="h-6 w-6 shrink-0" strokeWidth={2.5} />
        </Button>
      </div>
    </main>
  );
}
