"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * A short walkthrough of the app's main controls: the screen dims, one control
 * is lit at a time, and a card says what it does. A new install gets it once,
 * right after choosing a picture; Settings can replay it.
 *
 * "Pending" is what links the two: finishing onboarding marks the tour as
 * pending, and the app frame starts it on the dashboard. An existing install
 * never had that mark, so an update doesn't spring it on anyone.
 */
const PENDING_KEY = "baaki.tourPending";
const START_EVENT = "baaki:start-tour";

/** Onboarding is finished: show the tour when the dashboard opens. */
export function queueAppTour() {
  try {
    localStorage.setItem(PENDING_KEY, "1");
  } catch {
    /* no storage: no tour, rather than one every launch */
  }
}

/** Replay from Settings. */
export function startAppTour() {
  window.dispatchEvent(new Event(START_EVENT));
}

/** Tells the bottom bar to open or close its More menu: {detail: {open}}. */
export const TOUR_MENU_EVENT = "baaki:tour-menu";
/** The menu slides up in about this long: wait for it before measuring its tiles. */
const MENU_SETTLE_MS = 340;

interface Step {
  /** A CSS selector for what to light; missing, the card sits in the middle. */
  target?: string;
  /** The target lives in the More menu, which the tour opens for it (on a phone). */
  menu?: boolean;
  title: string;
  body: string;
}

/** A menu entry: a tile in the phone's More menu, or its row in the sidebar. */
const menuItem = (path: string) => `[data-tour="menu"] a[href^="${path}"], nav[data-tour="more"] a[href^="${path}"]`;

// Each selector can match a phone control and a desktop one; the visible one is used.
const STEPS: Step[] = [
  {
    title: "Welcome to baaki",
    body: "Here's a quick look at what you can do. It takes under a minute, and you can skip it any time.",
  },
  {
    target: '[data-tour="month"] > *',
    title: "Pick a month",
    body: "Use the arrows, or tap the month to jump. Home, Budget, Categories, Reports and Transactions all follow the month you choose.",
  },
  {
    target: '[data-tour="add"]',
    title: "Add a transaction",
    body: "Record an expense, income, or a transfer between your accounts. Turn on Split to note what friends owe you.",
  },
  {
    target: 'nav a[href^="/transactions"]',
    title: "Every transaction",
    body: "Search, and filter by date, category, account or amount. Open one to edit or delete it.",
  },
  {
    target: 'nav a[href^="/reports"]',
    title: "Reports",
    body: "See where your money goes: spending by category, income against expenses, and how it changes over time.",
  },
  {
    target: '[data-tour="more"]',
    title: "More",
    body: "Everything else in baaki is in here. Let's look at each part.",
  },
  {
    target: menuItem("/budgets"),
    menu: true,
    title: "Budgets",
    body: "Set a monthly limit for the whole month and for each category, and see how much is left. It follows the month you pick.",
  },
  {
    target: menuItem("/accounts"),
    menu: true,
    title: "Accounts",
    body: "Add your banks, cash and cards with their starting balances. Every transaction belongs to an account, and balances update on their own.",
  },
  {
    target: menuItem("/categories"),
    menu: true,
    title: "Categories",
    body: "Group your spending and income your way, with your own icon and colour. Open one to see its trend and top merchants.",
  },
  {
    target: menuItem("/recurring"),
    menu: true,
    title: "Recurring",
    body: "Set up rent, bills, subscriptions or salary once. baaki adds them when they're due, or reminds you to add them with one tap.",
  },
  {
    target: menuItem("/splits"),
    menu: true,
    title: "To collect",
    body: "When you split an expense, what friends owe you is listed here. Mark it paid back and it lands in the account you choose.",
  },
  {
    target: menuItem("/import"),
    menu: true,
    title: "Import",
    body: "Bring in a bank statement as a CSV or Excel file. Match the columns, preview the rows, then import them all at once.",
  },
  {
    target: '[data-tour="profile"]',
    title: "Your profile and settings",
    body: "Change your picture, set an app lock, tidy the dashboard, or back up your data. It all stays on this phone.",
  },
  {
    title: "You're all set",
    body: "Start by adding your first transaction. You can replay this tour from Settings whenever you like.",
  },
];

const PAD = 6; // space around a lit control
const GAP = 12; // between the control and the card
const EDGE = 12; // the card's distance from the screen edge
const FADE_MS = 280; // the words crossfading, and the progress dots
const CLOSE_MS = 240;
/** Short hops are quick and long ones take longer, so every move feels the same speed. */
const moveMs = (distance: number) => Math.min(640, Math.max(380, 300 + distance * 0.32));

type Rect = { top: number; left: number; width: number; height: number };

/** Where the light and the card are (or are heading), in screen pixels. */
interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
  /** The outline's opacity: 0 when a step lights nothing. */
  ring: number;
  cx: number;
  cy: number;
}

/** The first matching element that is actually on screen (a phone and a desktop control can share a selector). */
function findTarget(selector: string): Rect | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return { top: r.top, left: r.left, width: r.width, height: r.height };
  }
  return null;
}

/** Slow in at the start, long soft landing: reads as one continuous glide. */
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function AppTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [index, setIndex] = useState<number | null>(null);
  const [steps, setSteps] = useState<Step[]>(STEPS);
  const [closing, setClosing] = useState(false);

  const lightRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  /** Where things are right now, so a tap on Next mid-glide carries on from there. */
  const current = useRef<Frame | null>(null);
  const raf = useRef(0);
  const menuOpen = useRef(false);

  const begin = useCallback(() => {
    // Wait for the screen to draw its controls (a slow phone takes a moment),
    // then skip any step whose control isn't in this layout.
    let tries = 0;
    const attempt = () => {
      const ready = Boolean(findTarget('[data-tour="add"]')) || tries >= 30;
      if (!ready) {
        tries += 1;
        setTimeout(attempt, 200);
        return;
      }
      current.current = null;
      menuOpen.current = false;
      setClosing(false);
      // The menu's tiles only exist once the menu is open, so a phone keeps
      // those steps whenever it has the More button to open it with.
      const hasMoreButton = Boolean(findTarget('button[data-tour="more"]'));
      setSteps(STEPS.filter((s) => !s.target || (s.menu && hasMoreButton) || findTarget(s.target)));
      setIndex(0);
    };
    attempt();
  }, []);

  // A new install: the dashboard has just opened, so give it a moment to draw.
  useEffect(() => {
    let pending = false;
    try {
      pending = localStorage.getItem(PENDING_KEY) === "1";
    } catch {}
    // The static build serves pages with a trailing slash ("/dashboard/").
    if (!pending || pathname.replace(/\/$/, "") !== "/dashboard") return;
    const t = setTimeout(begin, 600);
    return () => clearTimeout(t);
  }, [pathname, begin]);

  // Replay from Settings: go home first, so the controls are where the steps expect.
  useEffect(() => {
    const onStart = () => {
      router.push("/dashboard");
      setTimeout(begin, 600);
    };
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, [router, begin]);

  /** Opens or closes the phone's More menu (a no-op where there isn't one). Returns whether it changed. */
  const setMenu = useCallback((open: boolean): boolean => {
    if (menuOpen.current === open) return false;
    if (open && !findTarget('button[data-tour="more"]')) return false;
    menuOpen.current = open;
    window.dispatchEvent(new CustomEvent(TOUR_MENU_EVENT, { detail: { open } }));
    return true;
  }, []);

  const finish = useCallback(() => {
    try {
      localStorage.removeItem(PENDING_KEY);
    } catch {}
    setMenu(false);
    // Fade out, then go: it never just vanishes.
    setClosing(true);
    setTimeout(
      () => {
        cancelAnimationFrame(raf.current);
        current.current = null;
        setIndex(null);
        setClosing(false);
      },
      reducedMotion() ? 0 : CLOSE_MS,
    );
  }, [setMenu]);

  const step = index === null ? null : steps[index];

  // Where this step's light and card belong, measured from the page as it is now.
  const measure = useCallback((): Frame | null => {
    const card = cardRef.current;
    if (!step || !card) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardW = card.offsetWidth;
    const cardH = card.offsetHeight;
    const rect = step.target ? findTarget(step.target) : null;
    if (!rect) {
      // Nothing to light: the hole closes to a point in the middle.
      return { x: vw / 2, y: vh / 2, w: 1, h: 1, ring: 0, cx: (vw - cardW) / 2, cy: Math.max(EDGE, (vh - cardH) / 2) };
    }
    const below = vh - (rect.top + rect.height) >= rect.top;
    const cy = below ? rect.top + rect.height + PAD + GAP : Math.max(EDGE, rect.top - PAD - GAP - cardH);
    const cx = Math.min(Math.max(EDGE, rect.left + rect.width / 2 - cardW / 2), vw - cardW - EDGE);
    return {
      x: rect.left - PAD,
      y: rect.top - PAD,
      w: rect.width + PAD * 2,
      h: rect.height + PAD * 2,
      ring: 1,
      cx,
      cy,
    };
  }, [step]);

  // Straight to the DOM, with transforms: no React render per frame, and the
  // card moves on the compositor, so the glide stays smooth on a busy phone.
  const paint = useCallback((f: Frame) => {
    const light = lightRef.current;
    const ring = ringRef.current;
    const card = cardRef.current;
    if (light) {
      light.style.width = `${f.w}px`;
      light.style.height = `${f.h}px`;
      light.style.transform = `translate3d(${f.x}px, ${f.y}px, 0)`;
    }
    if (ring) ring.style.opacity = String(f.ring);
    if (card) card.style.transform = `translate3d(${f.cx}px, ${f.cy}px, 0)`;
  }, []);

  const glideTo = useCallback(
    (to: Frame, animate: boolean) => {
      cancelAnimationFrame(raf.current);
      const from = current.current;
      if (!from || !animate || reducedMotion()) {
        current.current = to;
        paint(to);
        return;
      }
      const duration = moveMs(Math.hypot(to.cx - from.cx, to.cy - from.cy) + Math.hypot(to.x - from.x, to.y - from.y) / 2);
      // The clock starts on the first frame, not now: the first frame's own
      // timestamp can be earlier than "now", which made it twitch.
      let start: number | null = null;
      const tick = (now: number) => {
        if (start === null) start = now;
        const t = Math.max(0, Math.min(1, (now - start) / duration));
        const e = ease(t);
        const f: Frame = {
          x: lerp(from.x, to.x, e),
          y: lerp(from.y, to.y, e),
          w: lerp(from.w, to.w, e),
          h: lerp(from.h, to.h, e),
          ring: lerp(from.ring, to.ring, e),
          cx: lerp(from.cx, to.cx, e),
          cy: lerp(from.cy, to.cy, e),
        };
        current.current = f;
        paint(f);
        if (t < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    },
    [paint],
  );

  // A new step: the card already shows its text (this runs before the browser
  // paints), so it is measured at its true size and the glide starts from the
  // last position.
  useLayoutEffect(() => {
    if (!step) return;
    const go = () => {
      const to = measure();
      if (to) glideTo(to, current.current !== null);
    };
    if (step.menu) {
      // The menu has to be open, and finished sliding up, before its tiles can be lit.
      if (setMenu(true)) {
        const t = setTimeout(go, MENU_SETTLE_MS);
        return () => clearTimeout(t);
      }
    } else {
      setMenu(false);
    }
    go();
  }, [step, measure, glideTo, setMenu]);

  // A rotated or resized screen: snap to where things now belong.
  useEffect(() => {
    if (index === null) return;
    const onResize = () => {
      const to = measure();
      if (to) glideTo(to, false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [index, measure, glideTo]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const open = index !== null;
  useEffect(() => {
    if (open) nextRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setIndex((i) => (i === null ? i : Math.min(i + 1, steps.length - 1)));
      if (e.key === "ArrowLeft") setIndex((i) => (i === null ? i : Math.max(i - 1, 0)));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, steps.length, finish]);

  if (index === null || !step || typeof document === "undefined") return null;

  const last = index === steps.length - 1;
  const cardWidth = Math.min(340, window.innerWidth - EDGE * 2);

  return createPortal(
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-label="App tour"
      style={{
        opacity: closing ? 0 : 1,
        transition: `opacity ${CLOSE_MS}ms ease-out`,
        animation: closing ? undefined : "fade-in 320ms ease-out both",
      }}
    >
      {/* Blocks taps on the app underneath while the tour is up. */}
      <div className="absolute inset-0" aria-hidden />

      {/* The light: a hole in the dimming, which is its shadow. It only ever
          moves by transform, and resizes, and never touches layout around it. */}
      <div
        ref={lightRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 rounded-xl"
        style={{
          width: 1,
          height: 1,
          transform: `translate3d(${window.innerWidth / 2}px, ${window.innerHeight / 2}px, 0)`,
          boxShadow: "0 0 0 9999px hsl(var(--overlay) / 0.6)",
          willChange: "transform, width, height",
        }}
      >
        <div ref={ringRef} className="absolute inset-0 rounded-xl border-2 border-brand" style={{ opacity: 0 }} />
      </div>

      <div
        ref={cardRef}
        className="absolute left-0 top-0"
        style={{
          width: cardWidth,
          transform: `translate3d(${(window.innerWidth - cardWidth) / 2}px, ${window.innerHeight / 2}px, 0)`,
          willChange: "transform",
        }}
      >
        <div className="animate-enter rounded-2xl border border-border/25 bg-surface p-4 shadow-lg">
          {/* Every step's words sit on top of each other, so the card is always as
              tall as the longest one and never changes size between steps; the
              current one crossfades in as the card arrives. */}
          <div className="grid">
            {steps.map((st, i) => (
              <div
                key={st.title}
                aria-hidden={i !== index}
                className="pointer-events-none col-start-1 row-start-1"
                style={{ opacity: i === index ? 1 : 0, transition: `opacity ${FADE_MS}ms ease-out` }}
              >
                <p className="text-label-sm text-faint">
                  {i + 1} of {steps.length}
                </p>
                <h2 className="mt-1 text-base font-bold tracking-normal text-fg">{st.title}</h2>
                <p className="mt-1.5 text-body-sm text-muted">{st.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-1.5" aria-hidden>
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-[width,background-color] ease-out",
                  i === index ? "w-5 bg-brand" : "w-1.5 bg-border/30",
                )}
                style={{ transitionDuration: `${FADE_MS}ms` }}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={finish}
              tabIndex={last ? -1 : 0}
              className={cn("h-10 px-2 text-sm font-bold text-muted hover:text-fg", last && "invisible")}
            >
              Skip
            </button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIndex(index - 1)}
              tabIndex={index === 0 ? -1 : 0}
              className={cn(index === 0 && "invisible")}
            >
              Back
            </Button>
            <Button ref={nextRef} size="sm" onClick={() => (last ? finish() : setIndex(index + 1))}>
              {last ? "Get started" : "Next"}
              {!last && <ArrowRight aria-hidden className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
