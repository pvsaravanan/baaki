"use client";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { preloadAvatars } from "./preload-avatars";

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
      <text x="145" y="162" textAnchor="middle" fontSize="32" fontWeight="800" className="fill-fg" fontFamily="var(--font-sans)">
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

function BudgetIllustration() {
  return (
    <svg viewBox="0 0 245 202" aria-hidden className="h-full w-[245px] overflow-visible" strokeLinecap="round" strokeLinejoin="round">
      <path d={WASH} className="fill-brand-soft" opacity="0.7" />
      {/* sparks */}
      <path d="M190 4L182 27M222 28L199 39M206 62L231 62" className="stroke-fg" strokeWidth="3" fill="none" />
      {/* jar */}
      <path d="M84 50H160V64C176 74 182 92 182 112V170C182 182 174 190 162 190H82C70 190 62 182 62 170V112C62 92 68 74 84 64Z" className="fill-bg stroke-fg" strokeWidth="4" />
      {/* coins, filling up to the limit */}
      <g className="stroke-fg" strokeWidth="3">
        <path d="M66 150H178V170C178 180 172 186 162 186H82C72 186 66 180 66 170Z" className="fill-brand" />
        <path d="M66 128H178V150H66Z" className="fill-[#dccdae]" />
        <path d="M68 108H176V128H66Z" className="fill-brand-hover" />
      </g>
      {/* the limit */}
      <path d="M48 96H196" className="stroke-fg" strokeWidth="3" strokeDasharray="8 7" fill="none" />
      <path d="M196 96V72L214 79L196 86" className="fill-[#4a6e4c] stroke-fg" strokeWidth="3" />
      {/* lid */}
      <path d="M78 36H166V50H78Z" className="fill-brand-hover stroke-fg" strokeWidth="4" />
    </svg>
  );
}

function BillsIllustration() {
  return (
    <svg viewBox="0 0 245 202" aria-hidden className="h-full w-[245px] overflow-visible" strokeLinecap="round" strokeLinejoin="round">
      <path d={WASH} className="fill-brand-soft" opacity="0.7" />
      {/* sparks */}
      <path d="M20 30L36 46M8 66H30M30 4L40 26" className="stroke-fg" strokeWidth="3" fill="none" />
      {/* calendar */}
      <path d="M56 40H186V176H56Z" className="fill-bg stroke-fg" strokeWidth="4" />
      <path d="M58 42H184V70H58Z" className="fill-brand-hover stroke-fg" strokeWidth="3" />
      <path d="M86 28V52M156 28V52" className="stroke-fg" strokeWidth="5" fill="none" />
      {/* days */}
      <g className="fill-fg">
        <circle cx="82" cy="94" r="4" />
        <circle cx="108" cy="94" r="4" />
        <circle cx="134" cy="94" r="4" />
        <circle cx="160" cy="94" r="4" />
        <circle cx="82" cy="120" r="4" />
        <circle cx="134" cy="120" r="4" />
        <circle cx="160" cy="120" r="4" />
        <circle cx="82" cy="146" r="4" />
        <circle cx="108" cy="146" r="4" />
      </g>
      {/* the bill's day, ringed */}
      <circle cx="108" cy="120" r="13" className="fill-brand stroke-fg" strokeWidth="3" />
      {/* repeats every month */}
      <circle cx="186" cy="164" r="30" className="fill-[#4a6e4c] stroke-fg" strokeWidth="4" />
      <path d="M172 158A15 15 0 0 1 199 154M200 170A15 15 0 0 1 173 174" className="stroke-bg" strokeWidth="4" fill="none" />
      <path d="M200 145L200 155L190 155M172 183L172 173L182 173" className="stroke-bg" strokeWidth="4" fill="none" />
    </svg>
  );
}

function PrivateIllustration() {
  return (
    <svg viewBox="0 0 245 202" aria-hidden className="h-full w-[245px] overflow-visible" strokeLinecap="round" strokeLinejoin="round">
      <path d={WASH} className="fill-brand-soft" opacity="0.7" />
      {/* sparks */}
      <path d="M196 20L186 42M226 46L203 54M214 82L238 86" className="stroke-fg" strokeWidth="3" fill="none" />
      {/* phone */}
      <path d="M78 10H166C174 10 180 16 180 24V180C180 188 174 194 166 194H78C70 194 64 188 64 180V24C64 16 70 10 78 10Z" className="fill-bg stroke-fg" strokeWidth="4" />
      <path d="M104 22H140" className="stroke-fg" strokeWidth="4" fill="none" />
      {/* padlock */}
      <path d="M100 104V86C100 72 110 64 122 64C134 64 144 72 144 86V104" className="stroke-fg" strokeWidth="6" fill="none" />
      <path d="M88 102H156V160H88Z" className="fill-brand-hover stroke-fg" strokeWidth="4" />
      <path d="M122 122V140" className="stroke-fg" strokeWidth="6" fill="none" />
      <circle cx="122" cy="122" r="7" className="fill-fg" />
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
        Get clear reports and
        <br />
        beautiful analytics.
      </>
    ),
  },
  {
    illustration: <BudgetIllustration />,
    title: (
      <>
        Set budgets
        <br />
        that stick
      </>
    ),
    body: (
      <>
        Give each month a limit and
        <br />
        see what&apos;s left at a glance.
      </>
    ),
  },
  {
    illustration: <BillsIllustration />,
    title: (
      <>
        Never miss
        <br />a bill
      </>
    ),
    body: (
      <>
        Rent, salary, subscriptions:
        <br />
        set them once, baaki remembers.
      </>
    ),
  },
  {
    illustration: <PrivateIllustration />,
    title: (
      <>
        Your money
        <br />
        stays private
      </>
    ),
    body: (
      <>
        No account, no cloud: it all
        <br />
        stays on this phone.
      </>
    ),
  },
];

/** How long a page takes to fade away before the next one arrives. */
const FADE_OUT_MS = 450;

/**
 * The pages after the welcome screen, one idea each: a picture, a headline,
 * a line of explanation, progress dots and a button to the next page (the
 * last one opens the app). Sized for a 390 × 780 phone screen.
 */
/** `fromEnd` opens on the last slide, when coming back from the next step. */
export function OnboardingScreen({ onDone, fromEnd = false }: { onDone: () => void; fromEnd?: boolean }) {
  const [index, setIndex] = useState(fromEnd ? SLIDES.length - 1 : 0);
  // The profile picture page comes next: get its pictures ready meanwhile.
  useEffect(preloadAvatars, []);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  // A slow hand-over: the page fades away, then the next one drifts in.
  const [leaving, setLeaving] = useState(false);
  const next = () => {
    if (leaving) return;
    if (last) return onDone();
    setLeaving(true);
    setTimeout(() => {
      setIndex((i) => i + 1);
      setLeaving(false);
    }, FADE_OUT_MS);
  };

  return (
    <main className="flex h-dvh flex-col items-center bg-bg px-10 pb-[max(env(safe-area-inset-bottom),8dvh)] pt-[env(safe-area-inset-top)]">
      <div
        key={index}
        className="flex animate-slow-enter flex-col items-center motion-reduce:animate-none"
        style={{
          opacity: leaving ? 0 : undefined,
          transition: `opacity ${FADE_OUT_MS}ms ease-in`,
        }}
      >
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
          onClick={next}
        >
          <ArrowRight aria-hidden className="h-6 w-6 shrink-0" strokeWidth={2.5} />
        </Button>
      </div>
    </main>
  );
}
