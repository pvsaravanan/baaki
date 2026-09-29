import { Inter } from "next/font/google";
import { Logo, Wordmark } from "@/components/logo";
import { FitToWidth } from "./fit-to-width";
import { formatINR } from "@/lib/money";
import { mastheadSample, type MastheadSample } from "@/lib/masthead-sample";

/**
 * The left half of the sign-in / sign-up screens: an editorial masthead on
 * graph paper. Measured from the design at 1678×937 (panel 885 wide) and laid
 * out at exactly that size, then scaled to the panel's real width (see
 * FitToWidth); the chart is drawn in the design's own pixel coordinates.
 */

// The headline alone is set in a grotesk (Inter Bold), like the design;
// everything else stays in the app's mono. Loaded only on these pages.
const display = Inter({ subsets: ["latin"], weight: ["700"], display: "swap" });

const PANEL = "#e7e7dc"; // graph-paper parchment, a touch cooler than the form side
const CORAL = "#d06a47";
const CORAL_RULE = "#cc583b";
const INK = "#1c1c1a";
const LABEL = "#56564f";


export function Masthead() {
  // Fresh illustrative numbers on every load (this layout renders per request).
  const sample = mastheadSample();
  return (
    <div
      className="relative hidden min-h-dvh flex-col overflow-hidden border-r lg:flex"
      style={{
        backgroundColor: PANEL,
        borderColor: "#484745",
        // 18px graph paper.
        backgroundImage:
          "linear-gradient(rgb(26 26 20 / 0.055) 1px, transparent 1px), linear-gradient(90deg, rgb(26 26 20 / 0.055) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    >
      <FitToWidth designWidth={885}>
        <div className="flex h-full min-h-[860px] flex-col pb-[58px] pl-[107px] pr-[64px] pt-[85px]">
          {/* Header: lockup + EST. 2026 */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-[16px]">
              <Logo size="h-[38px] w-[26px]" />
              <Wordmark className="h-[27px]" />
            </div>
            <span
              className="flex h-[35px] w-[112px] items-center justify-center border-[1.5px] text-[13px] uppercase tracking-[0.1em]"
              style={{ borderColor: "#383a37", color: LABEL }}
            >
              Est. 2026
            </span>
          </div>

          {/* Headline + chart. Pushed down so it sits where the design has it
              at full height, and stays centred on shorter screens. */}
          <div className="relative my-auto pt-[97px]">
            <div className="relative h-[555px]">
              <div className="absolute left-0 top-[12px] max-w-[380px]">
                <p className="text-[14px] uppercase leading-none tracking-[0.13em]" style={{ color: CORAL }}>
                  Personal finance, plainly
                </p>
                <h1
                  className={`${display.className} mt-[32px] text-[55px] font-bold leading-[62.5px] tracking-[-0.01em] [word-spacing:0.12em]`}
                  style={{ color: INK }}
                >
                  Know where
                  <br />
                  your money
                  <br />
                  goes<span className="ml-[0.08em]" style={{ color: CORAL }}>.</span>
                </h1>
                <p className="mt-[33px] text-[18px] leading-[26.6px]" style={{ color: "#4a4a44" }}>
                  Record a transaction in seconds.
                  <br />
                  Turn your everyday spending
                  <br />
                  into clarity.
                </p>
              </div>
              <SpendChart sample={sample} />
            </div>
          </div>

          {/* Footer: privacy note + legend */}
          <div className="flex items-end justify-between">
            <p
              className="mb-[24px] border-l-2 py-[10px] pl-[17px] text-[12px] uppercase leading-[20px] tracking-[0.08em]"
              style={{ borderColor: CORAL_RULE, color: LABEL }}
            >
              Your financial data
              <br />
              stays private to your account.
            </p>
            <dl className="grid grid-cols-[auto_auto] gap-x-[23px] text-right text-[12px] uppercase leading-[22px] tracking-[0.08em]" style={{ color: LABEL }}>
              {sample.legend.map(([label, pct]) => (
                <div key={label} className="contents">
                  <dt>{label}</dt>
                  <dd>{pct}%</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </FitToWidth>
    </div>
  );
}

/**
 * Stepped bars — Bills, Food, Travel — with dashed guides. Drawn in the
 * design's own pixel coordinates (viewBox = the chart's box in the 885-wide
 * panel), positioned against the panel's right edge. Bar heights follow the
 * amounts (on the design's scale: ₹12,400 of Travel is 298px), and each dot
 * and label keeps the design's offset from the top of its bar.
 */
const BASELINE = 723;
const PX_PER_RUPEE = 298 / 12400;

function SpendChart({ sample }: { sample: MastheadSample }) {
  const top = (rupees: number) => Math.round(BASELINE - rupees * PX_PER_RUPEE);
  const bills = top(sample.bills);
  const food = top(sample.food);
  const travel = top(sample.travel);
  const inr = (rupees: number) => formatINR(rupees * 100, { decimals: "never" });
  const guide = { stroke: "#8f8f86", strokeWidth: 1, strokeDasharray: "3 3" } as const;
  const label = { fontSize: 12, letterSpacing: "0.04em", fill: INK, fontWeight: 500 } as const;
  return (
    <svg
      viewBox="480 225 350 555"
      width={350}
      height={555}
      className="absolute right-[-9px] top-[-3px] font-mono"
      aria-hidden
    >
      <defs>
        <pattern id="mh-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="#a9ab9b" />
          <line x1="0" y1="0" x2="0" y2="5" stroke="#62655a" strokeWidth="2" />
        </pattern>
        <pattern id="mh-fine" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="4" height="4" fill="#ebe9e0" />
          <line x1="0" y1="0" x2="0" y2="4" stroke="#a9ab9b" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Axis guides with crosshairs */}
      <line x1="527" y1="240" x2="527" y2="775" {...guide} />
      <path d="M520 240h14M527 233v14" stroke="#8f8f86" strokeWidth="1.2" />
      <line x1="776" y1="233" x2="776" y2={travel} {...guide} />
      <path d="M769 233h14M776 226v14" stroke="#8f8f86" strokeWidth="1.2" />

      {/* Bars */}
      <rect x="527" y={bills} width="69" height={BASELINE - bills} fill="#9ea08f" />
      <rect x="596" y={food} width="114" height={bills - food} fill="url(#mh-hatch)" />
      <rect x="596" y={bills} width="114" height={BASELINE - bills} fill="url(#mh-fine)" />
      <rect x="710" y={travel} width="100" height={food - travel} fill="#aaad9c" />

      {/* Empty space under Travel, outlined in dots */}
      <path d={`M596 ${bills}H810M810 ${food}V${BASELINE}`} stroke="#a6a69c" strokeWidth="1" strokeDasharray="1.5 3" fill="none" />

      {/* Baseline */}
      <line x1="495" y1="723" x2="810" y2="723" stroke="#a6a69c" strokeWidth="1" strokeDasharray="3 3" />

      {/* Markers: dot + dashed drop to the baseline */}
      {[
        { x: 545, y: bills - 22, name: "BILLS", amount: inr(sample.bills), lx: 539, ly: bills - 55 },
        { x: 626, y: food - 39, name: "FOOD", amount: inr(sample.food), lx: 606, ly: food - 73 },
        { x: 755, y: travel - 42, name: "TRAVEL", amount: inr(sample.travel), lx: 752, ly: travel - 79 },
      ].map((m) => (
        <g key={m.name}>
          <line x1={m.x} y1={m.y} x2={m.x} y2="723" stroke="#4a4a44" strokeWidth="1" strokeDasharray="2 2.5" />
          <circle cx={m.x} cy={m.y} r="2.6" fill={INK} />
          <text x={m.lx} y={m.ly} {...label} dominantBaseline="middle">{m.name}</text>
          <text x={m.lx} y={m.ly + 16} {...label} dominantBaseline="middle">{m.amount}</text>
        </g>
      ))}

      {/* Period */}
      <text x="726" y="743" fontSize="12" letterSpacing="0.06em" fill="#6b6b63" dominantBaseline="middle">{sample.period}</text>
      <path d="M796 743h13M804 738l5 5-5 5" stroke="#4a4a44" strokeWidth="1.3" fill="none" />
    </svg>
  );
}
