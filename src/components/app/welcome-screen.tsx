"use client";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";

/**
 * The first screen a new install shows: the wordmark, the house on a coral
 * wash, the tagline and one way in. Laid out on a 390 × 780 phone screen —
 * the proportions are in dvh/px so it holds on taller and shorter phones.
 */
export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="flex h-dvh flex-col items-center bg-bg px-10 pb-[max(env(safe-area-inset-bottom),24px)] pt-[env(safe-area-inset-top)]">
      <Wordmark className="mt-[23dvh] h-[54px] text-fg animate-enter" />

      {/* The house: line art on a hand-drawn coral wash. */}
      <div className="relative mt-[7dvh] h-[154px] w-[253px] shrink-0 animate-enter">
        <svg viewBox="0 0 253 154" aria-hidden className="h-full w-full" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M6 70C-6 38 34 8 78 4C112 1 128 26 160 28C190 30 208 38 228 58C250 82 256 118 218 140C190 156 150 150 120 148C84 146 56 154 34 140C16 128 12 90 6 70Z"
            className="fill-brand-soft"
            opacity="0.7"
          />
          {/* sparks */}
          <path d="M185 2L190 18M196 28L211 19" className="stroke-fg" strokeWidth="3" fill="none" />
          {/* walls */}
          <path d="M75 68V144M180 68V144" className="stroke-fg" strokeWidth="3" fill="none" />
          <path d="M77 87H162M77 108H108M141 108H180M77 124H108M141 124H180" className="stroke-fg" strokeWidth="3" fill="none" />
          {/* roof */}
          <path d="M133 23L75 68H191Z" className="fill-brand-hover" />
          <path d="M106 44L133 67L160 44M133 23V67" className="stroke-fg" strokeWidth="2.5" fill="none" />
          <path d="M56 77L133 23L198 68H75" className="stroke-fg" strokeWidth="3.5" fill="none" />
          {/* door */}
          <path d="M109 144V97H141V144Z" className="fill-brand-hover stroke-fg" strokeWidth="3" />
          <circle cx="126" cy="122" r="2" className="fill-fg" />
          {/* bushes */}
          <g className="fill-[#8c9e80] stroke-fg" strokeWidth="2">
            <path d="M50 143C44 130 46 118 53 112C60 120 62 134 56 143Z" />
            <path d="M56 143C56 134 60 126 66 123C71 130 70 138 66 143Z" />
            <path d="M36 143C34 138 34 136 31 134C42 132 50 136 54 143Z" />
            <path d="M183 143C183 134 188 128 193 129C195 125 202 125 203 131C208 132 212 138 210 143Z" />
          </g>
          {/* ground */}
          <path d="M12 144H230" className="stroke-fg" strokeWidth="3.5" fill="none" />
        </svg>
      </div>

      <h1 className="mt-[4dvh] text-center text-[25px] font-medium leading-[35px] text-fg">
        Know where
        <br />
        your money goes.
      </h1>

      <div className="mt-auto flex w-full flex-col items-center">
        <Button size="lg" className="w-full" onClick={onStart}>
          Get Started
          <ArrowRight aria-hidden className="h-5 w-5" strokeWidth={2.5} />
        </Button>
        <p className="mt-6 text-center text-[14px] text-muted">
          Private. Offline. <span className="font-bold text-accent">Yours.</span>
        </p>
      </div>
    </main>
  );
}
