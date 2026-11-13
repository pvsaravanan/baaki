"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { apiPatch, ApiError } from "@/lib/http";
import { useAppData } from "@/components/app/app-data";
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

interface Step {
  /** A CSS selector for what to light; missing, the card sits in the middle. */
  target?: string;
  /** The target lives in the More menu, which the tour opens for it (on a phone). */
  menu?: boolean;
  /**
   * Asks for the person's name and can't be passed without one. The card holds
   * the field; the dashboard behind lights the greeting the name appears in.
   */
  name?: boolean;
  title: string;
  body: string;
}

/** A menu entry: a tile in the phone's More menu, or its row in the sidebar. */
const menuItem = (path: string) => `[data-tour="menu"] a[href^="${path}"], nav[data-tour="more"] a[href^="${path}"]`;

// Each selector can match a phone control and a desktop one; the visible one is used.
const STEPS: Step[] = [
  {
    title: "Welcome to baaki",
    body: "Here's a quick look at what you can do. It takes under a minute.",
  },
  {
    target: '[data-tour="greeting"]',
    name: true,
    title: "What should we call you?",
    body: "It appears in your dashboard greeting.",
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
/** How long to wait for a control that hasn't appeared before centring the card instead. */
const HOLD_MS = 800;
/** The lit hole's corner radius (rounded-xl). */
const CORNER = 12;
/** Where each corner piece's arc is centred: the opposite corner of its own box. */
const CORNER_AT = ["100% 100%", "0 100%", "100% 0", "0 0"];
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
function findElement(selector: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/**
 * Where the control is on screen. A control inside the scrolling page is cut
 * to what that page actually shows, so the light never outlines a part that is
 * scrolled out of sight.
 */
function findTarget(selector: string): Rect | null {
  const el = findElement(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const view = el.closest("main")?.getBoundingClientRect();
  const top = view ? Math.max(r.top, view.top) : r.top;
  const bottom = view ? Math.min(r.bottom, view.bottom) : r.bottom;
  if (bottom <= top) return null;
  return { top, left: r.left, width: r.width, height: bottom - top };
}

/**
 * Scrolls the page so a control inside it is fully in view, with a little room
 * around it. The keyboard opening or closing can leave the page scrolled a few
 * pixels, which would hide the top of what the step is pointing at.
 */
function reveal(selector: string) {
  const el = findElement(selector);
  const main = el?.closest("main");
  if (!el || !main) return;
  const r = el.getBoundingClientRect();
  const m = main.getBoundingClientRect();
  const room = 16;
  if (r.top < m.top + room) main.scrollTop -= m.top + room - r.top;
  else if (r.bottom > m.bottom - room) main.scrollTop += r.bottom - (m.bottom - room);
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
  const { user, refresh } = useAppData();
  // Read when the tour starts (begin is created once), so a replay can leave the name step out.
  const hasNameRef = useRef(false);
  hasNameRef.current = user.name.trim() !== "" && user.name.trim() !== "You";
  const [nameDraft, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  /** The dimming: four edge panels (0-3) and four rounded corner pieces (4-7) around the lit control. */
  const dimRefs = useRef<(HTMLDivElement | null)[]>([]);
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
      // Someone who already has a name (a replay) isn't asked again.
      setSteps(
        STEPS.filter((s) =>
          s.name ? !hasNameRef.current : !s.target || (s.menu && hasMoreButton) || findTarget(s.target),
        ),
      );
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

  // A name is required until the person has set one of their own ("You" is what an install starts with).
  const hasName = user.name.trim() !== "" && user.name.trim() !== "You";
  const nameIndex = steps.findIndex((s) => s.name);
  const nameStep = step?.name === true;
  const draftOk = nameDraft.trim().length > 0;
  // Until the name is set, nothing past its step can be reached.
  const lockedAt = !hasName && nameIndex >= 0 ? nameIndex : steps.length;
  const goTo = useCallback(
    (i: number) => setIndex(() => Math.max(0, Math.min(i, lockedAt))),
    [lockedAt],
  );
  /** Skip: finishes, unless a name is still needed, in which case it jumps to asking for it. */
  const skip = useCallback(() => (lockedAt < steps.length ? goTo(lockedAt) : finish()), [lockedAt, steps.length, goTo, finish]);

  // Arriving at the name step: the field starts with the current name, if there is one.
  useEffect(() => {
    if (!nameStep) return;
    setNameDraft(hasName ? user.name : "");
    setNameError("");
    // Only when the step is entered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameStep]);

  // Past the name step (a Back, or the closing card) the tour belongs on the dashboard again.
  useEffect(() => {
    if (index === null || nameStep) return;
    if (pathname.replace(/\/$/, "") === "/settings") router.push("/dashboard");
  }, [index, nameStep, pathname, router]);

  async function saveName() {
    const name = nameDraft.trim();
    if (!name) return false;
    if (name === user.name) return true;
    setSaving(true);
    setNameError("");
    try {
      await apiPatch("/api/user", { name });
      refresh();
      return true;
    } catch (e) {
      setNameError(e instanceof ApiError ? e.message : "Could not save your name");
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Where this step's light and card belong, measured from the page as it is now.
  // With `fallback` off, a target that hasn't appeared yet (the menu is sliding
  // up, a screen is opening) returns null, so the card waits instead of detouring.
  const measure = useCallback((fallback: boolean): Frame | null => {
    const card = cardRef.current;
    if (!step || !card) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardW = card.offsetWidth;
    const cardH = card.offsetHeight;
    const rect = step.target ? findTarget(step.target) : null;
    if (!rect) {
      if (step.target && !fallback) return null;
      // Nothing to light: the hole closes to a point in the middle.
      return { x: vw / 2, y: vh / 2, w: 0, h: 0, ring: 0, cx: (vw - cardW) / 2, cy: Math.max(EDGE, (vh - cardH) / 2) };
    }
    // The name step opens the keyboard, which would cover a card below the field: keep it at the top, when it fits there.
    const atTop = step.name && EDGE + cardH + GAP <= rect.top - PAD;
    const below = !atTop && vh - (rect.top + rect.height) >= rect.top;
    const cy = atTop ? EDGE : below ? rect.top + rect.height + PAD + GAP : Math.max(EDGE, rect.top - PAD - GAP - cardH);
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

  // Straight to the DOM, with transforms only: no React render per frame, and
  // nothing here repaints a large area, so the glide stays smooth on a busy phone.
  const paint = useCallback((f: Frame) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const hx = f.x;
    const hy = f.y;
    const hw = Math.max(0, f.w);
    const hh = Math.max(0, f.h);
    const move = (el: HTMLElement | null, x: number, y: number, k = 1) => {
      if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0)${k === 1 ? "" : ` scale(${Math.max(k, 0.0001)})`}`;
    };
    const d = dimRefs.current;
    // Four screen-sized solid panels, only ever slid (never stretched: a stretched
    // layer is smoothed by the GPU and bleeds into the hole). They overlap, and
    // the group is dimmed as a whole, so no seams show.
    move(d[0], 0, hy - vh);
    move(d[1], 0, hy + hh);
    move(d[2], hx - vw, 0);
    move(d[3], hx + hw, 0);
    const r = Math.max(0, Math.min(CORNER, hw / 2, hh / 2));
    const k = r / CORNER;
    move(d[4], hx, hy, k);
    move(d[5], hx + hw - r, hy, k);
    move(d[6], hx, hy + hh - r, k);
    move(d[7], hx + hw - r, hy + hh - r, k);
    const ring = ringRef.current;
    if (ring) {
      ring.style.width = `${hw}px`;
      ring.style.height = `${hh}px`;
      ring.style.transform = `translate3d(${hx}px, ${hy}px, 0)`;
      ring.style.opacity = String(f.ring);
    }
    const card = cardRef.current;
    if (card) card.style.transform = `translate3d(${f.cx}px, ${f.cy}px, 0)`;
  }, []);

  /**
   * Carries the light and the card to this step's control. The control is
   * re-measured every frame, so a menu still sliding up or a screen still
   * opening is chased rather than waited for; if it lands somewhere new after
   * the glide has finished, a fresh glide takes over from where things are.
   */
  const follow = useCallback(() => {
    cancelAnimationFrame(raf.current);
    const distance = (a: Frame, b: Frame) =>
      Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.w - b.w) + Math.abs(a.h - b.h) + Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy);
    const calm = reducedMotion();
    let began: number | null = null;
    let moved = 0;
    let gliding = false;
    let start = 0;
    let duration = 0;
    let from: Frame | null = null;
    const tick = (now: number) => {
      if (began === null) {
        began = now;
        moved = now;
      }
      const cur = current.current;
      // The page may still be settling (a keyboard opening, a screen appearing): keep the control in view.
      if (step?.target && now - began < 1500) reveal(step.target);
      const to = measure(now - began > HOLD_MS);
      if (to) {
        let f = to;
        if (cur && !calm) {
          if (!gliding && distance(cur, to) > 3) {
            gliding = true;
            from = cur;
            start = now;
            duration = moveMs(Math.hypot(to.cx - cur.cx, to.cy - cur.cy) + Math.hypot(to.x - cur.x, to.y - cur.y) / 2);
          }
          if (gliding && from) {
            const t = Math.max(0, Math.min(1, (now - start) / duration));
            const e = ease(t);
            f = {
              x: lerp(from.x, to.x, e),
              y: lerp(from.y, to.y, e),
              w: lerp(from.w, to.w, e),
              h: lerp(from.h, to.h, e),
              ring: lerp(from.ring, to.ring, e),
              cx: lerp(from.cx, to.cx, e),
              cy: lerp(from.cy, to.cy, e),
            };
            if (t >= 1) gliding = false;
          }
        }
        if (!cur || distance(cur, f) > 0.5) moved = now;
        current.current = f;
        paint(f);
      }
      // Keep following until things have been still for a moment.
      if (gliding || now - moved < 250 || !to) {
        if (now - began < 3000) raf.current = requestAnimationFrame(tick);
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, [measure, paint, step]);

  // A new step: the card already shows its text (this runs before the browser
  // paints), and the glide starts right away from wherever the last one left things.
  useLayoutEffect(() => {
    if (!step) return;
    setMenu(Boolean(step.menu));
    follow();
    return () => cancelAnimationFrame(raf.current);
  }, [step, follow, setMenu]);

  // A rotated or resized screen: snap to where things now belong.
  useEffect(() => {
    if (index === null) return;
    const onResize = () => {
      if (step?.target) reveal(step.target);
      const to = measure(true);
      if (!to) return;
      cancelAnimationFrame(raf.current);
      current.current = to;
      paint(to);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [index, measure, paint, step]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const open = index !== null;
  useEffect(() => {
    if (open) nextRef.current?.focus({ preventScroll: true });
  }, [open]);

  // On the name step the cursor belongs in the field, not on Next.
  useEffect(() => {
    if (!nameStep) return;
    const t = setTimeout(() => document.querySelector<HTMLInputElement>('input[aria-label="Your name"]:not([tabindex="-1"])')?.focus({ preventScroll: true }), 450);
    return () => clearTimeout(t);
  }, [nameStep]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      // Not from the name field: there the arrows move the caret.
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") setIndex((i) => (i === null ? i : Math.min(i + 1, lockedAt, steps.length - 1)));
      if (e.key === "ArrowLeft") setIndex((i) => (i === null ? i : Math.max(i - 1, 0)));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, steps.length, lockedAt, skip]);

  if (index === null || !step || typeof document === "undefined") return null;

  const last = index === steps.length - 1;
  // No Skip until the name is set: not on the welcome card, nor on the name step itself.
  const needsName = !hasName && nameIndex >= 0 && index <= nameIndex;
  async function next() {
    if (nameStep && !(await saveName())) return;
    if (last) finish();
    else setIndex(index! + 1);
  }
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

      {/* The dimming, with a hole where the control is lit: four solid edge
          panels and four rounded corner pieces, all moved by transform alone, so
          nothing large is repainted while it glides. The group is dimmed as a
          whole, which keeps the overlaps from showing. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity: 0.6 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            ref={(el) => {
              dimRefs.current[i] = el;
            }}
            className="absolute left-0 top-0"
            style={{
              width: i < 4 ? "100%" : CORNER,
              height: i < 4 ? "100%" : CORNER,
              transformOrigin: "0 0",
              // Starts fully dim (the first frame paints before anything is measured).
              transform: i === 0 ? "translate3d(0, 0, 0)" : i < 4 ? "translate3d(0, 9999px, 0)" : "scale(0.0001)",
              willChange: "transform",
              background: i < 4 ? "hsl(var(--overlay))" : `radial-gradient(circle at ${CORNER_AT[i - 4]}, transparent ${CORNER - 0.5}px, hsl(var(--overlay)) ${CORNER}px)`,
            }}
          />
        ))}
      </div>
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 rounded-xl border-2 border-brand"
        style={{ width: 0, height: 0, opacity: 0, willChange: "transform, width, height" }}
      />

      <div
        ref={cardRef}
        className="absolute left-0 top-0"
        style={{
          width: cardWidth,
          transform: "translate3d(0, 0, 0)",
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
                {/* A save error takes the place of the line (no extra row), so the card keeps its height. */}
                <p className={cn("mt-1.5 text-body-sm", st.name && i === index && nameError ? "text-expense" : "text-muted")}>
                  {st.name && i === index && nameError ? nameError : st.body}
                </p>
                {st.name && (
                  // Always laid out (hidden when not shown) so the card keeps one height.
                  <div className={cn("pointer-events-auto mt-2.5", i !== index && "invisible")}>
                    <Input
                      aria-label="Your name"
                      placeholder="Your name"
                      value={nameDraft}
                      maxLength={80}
                      tabIndex={i === index ? 0 : -1}
                      autoComplete="given-name"
                      invalid={Boolean(nameError)}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && draftOk && !saving) next();
                      }}
                    />
                  </div>
                )}
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
              onClick={skip}
              tabIndex={last || needsName ? -1 : 0}
              className={cn("h-10 px-2 text-sm font-bold text-muted hover:text-fg", (last || needsName) && "invisible")}
            >
              Skip
            </button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => goTo(index - 1)}
              tabIndex={index === 0 ? -1 : 0}
              className={cn(index === 0 && "invisible")}
            >
              Back
            </Button>
            <Button ref={nextRef} size="sm" onClick={next} loading={saving} disabled={nameStep && !draftOk}>
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
