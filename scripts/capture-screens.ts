/**
 * Screenshots the app into UI/: phone-framed/ (390×844 at 2×, in a phone
 * frame), mobile/ (390 wide at 2×, full length) and desktop/ (1440 wide, full
 * length). The list is SCREENS below; UI/README.md links them all.
 *
 *   npm run build && npx tsx scripts/capture-screens.ts            every screen
 *   npm run build && npx tsx scripts/capture-screens.ts budgets 16  just some
 *   npx tsx scripts/capture-screens.ts showcase                     only the showcases
 *
 * The app runs from the static build in out/, in headless Google Chrome (set
 * CHROME to its path if it isn't in /Applications), with the sample data in
 * scripts/sample-data.ts restored through Settings and the clock held at
 * 24 September 2026, 2:30 pm in India, so every run draws the same screens.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { sampleBackup, TODAY } from "./sample-data";

const root = join(__dirname, "..");
const OUT = join(root, "out");
const UI = join(root, "UI");
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

interface Screen {
  file: string;
  /** Page to open; first-run screens are reached from the welcome screen instead. */
  path?: string;
  /** Text that shows the screen has its data (case-insensitive). */
  wait: string;
  /** Something to open on the page first: a button's aria-label or text. */
  open?: string;
  /** What it opens sits over the page: shoot one screen, not the page behind. */
  overlay?: boolean;
  /** Phone-only screens (the bottom bar's add button and menu). */
  phoneOnly?: boolean;
  firstRun?: boolean;
}

const SCREENS: Screen[] = [
  { file: "01-dashboard", path: "/dashboard", wait: "Good afternoon" },
  { file: "02-transactions", path: "/transactions", wait: "Team dinner" },
  { file: "03-accounts", path: "/accounts", wait: "SBI Savings" },
  { file: "04-budgets", path: "/budgets", wait: "Groceries" },
  { file: "05-goals", path: "/goals", wait: "Goa trip" },
  { file: "06-goal-detail", path: "/goals/detail?id=goal-emergency", wait: "Emergency fund" },
  { file: "07-people", path: "/people", wait: "Arjun" },
  { file: "08-recurring", path: "/recurring", wait: "Airtel Fiber" },
  { file: "09-reports", path: "/reports", wait: "Income vs expenses" },
  { file: "10-trends", path: "/trends", wait: "Spending pace" },
  { file: "11-insights", path: "/insights", wait: "What your numbers are telling you" },
  { file: "12-categories", path: "/categories", wait: "Organize spending", open: "Expense (14)" },
  { file: "13-category-detail", path: "/categories/detail?id=cat-food", wait: "Monthly spend" },
  { file: "14-import", path: "/import", wait: "Bring in transactions" },
  { file: "15-settings", path: "/settings", wait: "Data & backup" },
  { file: "16-add-transaction", path: "/dashboard", wait: "Good afternoon", open: "Add transaction", overlay: true, phoneOnly: true },
  { file: "17-more-menu", path: "/dashboard", wait: "Good afternoon", open: "More", overlay: true, phoneOnly: true },
  { file: "18-welcome", wait: "Get Started", firstRun: true },
  { file: "19-onboarding-expenses", wait: "Track every expense easily", firstRun: true },
  { file: "20-onboarding-spending", wait: "Understand your spending", firstRun: true },
  { file: "21-onboarding-goals", wait: "Set goals for a better you", firstRun: true },
  { file: "22-choose-avatar", wait: "Choose a profile picture", firstRun: true },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ the app

const TYPES: Record<string, string> = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".wasm": "application/wasm",
  ".json": "application/json",
};

function serve(): Promise<{ url: string; close: () => void }> {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    for (const candidate of [path, `${path}.html`, join(path, "index.html")]) {
      const file = join(OUT, candidate);
      if (file.startsWith(OUT) && existsSync(file) && statSync(file).isFile()) {
        res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
        res.end(readFileSync(file));
        return;
      }
    }
    res.writeHead(404).end();
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      resolve({ url: `http://127.0.0.1:${port}`, close: () => server.close() });
    }),
  );
}

/** Holds the page's clock at TODAY (still ticking, so animations run) in India's time zone. */
const FIXED_CLOCK = `(() => {
  const RealDate = Date, offset = RealDate.parse(${JSON.stringify(TODAY)}) - RealDate.now();
  class FixedDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : [RealDate.now() + offset])); }
    static now() { return RealDate.now() + offset; }
  }
  globalThis.Date = FixedDate;
})();`;

// ------------------------------------------------------------------- Chrome

type Send = ((method: string, params?: object) => Promise<Record<string, unknown>>) & {
  /** The page's console errors and uncaught exceptions so far. */
  errors?: string[];
};

async function startChrome() {
  // Port 0: Chrome picks a free port and writes it, with its endpoint, to
  // DevToolsActivePort in the profile, so this never talks to another Chrome.
  const profile = mkdtempSync(join(tmpdir(), "baaki-shots-"));
  const chrome = spawn(CHROME, [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank",
  ], { stdio: "ignore" });

  let ws: WebSocket | undefined;
  for (let i = 0; i < 100 && !ws; i++) {
    try {
      const [port, path] = readFileSync(join(profile, "DevToolsActivePort"), "utf8").trim().split("\n");
      const socket = new WebSocket(`ws://127.0.0.1:${port}${path}`);
      await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej; });
      ws = socket;
    } catch {
      await sleep(200);
    }
  }

  const stop = async () => {
    ws?.close();
    if (chrome.exitCode === null) {
      chrome.kill();
      await new Promise((r) => chrome.once("exit", r));
    }
    rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  };
  if (!ws) {
    await stop();
    throw new Error("Couldn't connect to Chrome.");
  }

  let nextId = 0;
  const pending = new Map<number, { res: (v: Record<string, unknown>) => void; rej: (e: Error) => void }>();
  const errors = new Map<string, string[]>(); // per tab, for timeout messages
  ws.onmessage = (m) => {
    const msg = JSON.parse(String(m.data));
    if (msg.method === "Runtime.exceptionThrown") {
      const { exceptionDetails: d } = msg.params;
      errors.get(msg.sessionId)?.push(d.exception?.description ?? d.text);
    } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      errors.get(msg.sessionId)?.push(msg.params.args.map((a: { value?: unknown; description?: string }) => a.value ?? a.description).join(" "));
    }
    const call = msg.id && pending.get(msg.id);
    if (!call) return;
    pending.delete(msg.id);
    if (msg.error) call.rej(new Error(JSON.stringify(msg.error)));
    else call.res(msg.result);
  };
  const send = (method: string, params: object = {}, sessionId?: string) =>
    new Promise<Record<string, unknown>>((res, rej) => {
      const id = ++nextId;
      pending.set(id, { res, rej });
      ws!.send(JSON.stringify({ id, method, params, sessionId }));
    });

  /** A tab in its own browser context: empty storage, like a new install. */
  async function newPage(width: number, height: number, scale: number) {
    const { browserContextId } = await send("Target.createBrowserContext");
    const { targetId } = await send("Target.createTarget", { url: "about:blank", browserContextId });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const s: Send = (method, params) => send(method, params, sessionId as string);
    errors.set(sessionId as string, []);
    s.errors = errors.get(sessionId as string)!;
    await s("Page.enable");
    await s("Runtime.enable");
    await s("Emulation.setTimezoneOverride", { timezoneId: "Asia/Kolkata" });
    await s("Page.addScriptToEvaluateOnNewDocument", { source: FIXED_CLOCK });
    await s("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: width < 600 });
    if (width < 600) await s("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    return { s, close: () => send("Target.disposeBrowserContext", { browserContextId }) };
  }

  return { newPage, stop };
}

// -------------------------------------------------------------- on the page

async function evaluate<T>(s: Send, expression: string): Promise<T> {
  const { result } = await s("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  return (result as { value: T }).value;
}

/** The app's own "couldn't be loaded" screen. */
class LoadFailed extends Error {}

/** Wait for the text, with no loading skeletons left, then let animations finish. */
async function waitFor(s: Send, text: string) {
  const needle = JSON.stringify(text.toLowerCase());
  const ready = `(document.body?.innerText ?? "").replace(/\\s+/g, " ").toLowerCase().includes(${needle})
    && !document.querySelector(".animate-pulse")`;
  for (const end = Date.now() + 90_000; Date.now() < end; await sleep(250)) {
    if (await evaluate<boolean>(s, ready)) return sleep(1500);
    if (await evaluate<boolean>(s, `(document.body?.innerText ?? "").includes("couldn't be loaded")`)) {
      throw new LoadFailed(`The app couldn't load the page (${s.errors?.slice(-3).join("; ") || "no page errors"}).`);
    }
  }
  const seen = await evaluate<string>(s, `(document.body?.innerText ?? "").replace(/\\s+/g, " ").slice(0, 300)`);
  const loading = await evaluate<boolean>(s, `!!document.querySelector(".animate-pulse")`);
  const errors = s.errors?.length ? `\nPage errors:\n  ${s.errors.slice(-5).join("\n  ")}` : "";
  throw new Error(`Timed out waiting for "${text}"${loading ? " (still loading)" : ""}. The page shows: ${seen}${errors}`);
}

/** Click the button whose aria-label or text is `name`. */
async function press(s: Send, name: string) {
  const clicked = await evaluate<boolean>(s, `(() => {
    const want = ${JSON.stringify(name.toLowerCase())};
    const el = [...document.querySelectorAll("button, a")].find((b) =>
      (b.getAttribute("aria-label") ?? "").toLowerCase() === want || b.innerText.trim().toLowerCase() === want);
    if (!el) return false;
    el.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`No "${name}" button to press.`);
}

async function shot(s: Send) {
  const { data } = await s("Page.captureScreenshot", { format: "png" });
  return Buffer.from(data as string, "base64");
}

/**
 * The whole screen, top to bottom. The app scrolls inside <main>, not the
 * page, so grow the viewport by whatever <main> (or the page) hides, shoot,
 * and put it back.
 */
async function fullShot(s: Send, width: number, height: number, scale: number) {
  const hidden = await evaluate<number>(s, `(() => {
    const main = document.querySelector("main");
    const inMain = main ? main.scrollHeight - main.clientHeight : 0;
    const inPage = document.documentElement.scrollHeight - innerHeight;
    return Math.max(0, inMain, inPage);
  })()`);
  const metrics = { width, deviceScaleFactor: scale, mobile: width < 600 };
  await s("Emulation.setDeviceMetricsOverride", { ...metrics, height: height + hidden });
  await sleep(800);
  const png = await shot(s);
  await s("Emulation.setDeviceMetricsOverride", { ...metrics, height });
  await sleep(300);
  return png;
}

/** Restore the sample data through Settings → Restore from backup. */
async function loadSampleData(s: Send, app: string) {
  const file = join(mkdtempSync(join(tmpdir(), "baaki-sample-")), "baaki-sample.json");
  writeFileSync(file, JSON.stringify(sampleBackup()));
  try {
    await open(s, `${app}/settings`, "Restore from backup");
    const { root: doc } = await s("DOM.getDocument", { depth: 0 });
    const { nodeId } = await s("DOM.querySelector", {
      nodeId: (doc as { nodeId: number }).nodeId,
      selector: 'input[type="file"][accept*="json"]',
    });
    await s("DOM.setFileInputFiles", { nodeId, files: [file] });
    await waitFor(s, "Restore this backup?");
    await press(s, "Restore");
    await waitFor(s, "Restored");
  } finally {
    rmSync(join(file, ".."), { recursive: true, force: true });
  }
}

/**
 * Open a page and wait for it. Each page is a fresh load of the app, which can
 * start while the last one still holds the on-device database; the app then
 * shows its "couldn't be loaded" screen, so try again.
 */
async function open(s: Send, url: string, wait: string) {
  for (let attempt = 1; ; attempt++) {
    await s("Page.navigate", { url });
    try {
      return await waitFor(s, wait);
    } catch (err) {
      if (!(err instanceof LoadFailed) || attempt === 3) throw err;
      console.log(`  ${new URL(url).pathname} didn't load, trying again`);
      await sleep(1000 * attempt);
    }
  }
}

// ------------------------------------------------------------------ capture

/** UI/showcase-*.png: five framed phones side by side, as in the README. */
const SHOWCASES: Record<string, string[]> = {
  "showcase-1": ["01-dashboard", "02-transactions", "04-budgets", "05-goals", "09-reports"],
  "showcase-2": ["16-add-transaction", "07-people", "08-recurring", "11-insights", "15-settings"],
};

/** Matched to the showcases made before this script. */
const SHOWCASE_SHADOW = "0 20px 26px rgba(60,50,30,0.17)";

const showcase = (files: string[]) => `<!doctype html><body style="margin:0;background:#f4f1ea">
  <div style="display:flex;gap:80px;padding:112px">
    ${files.map((f) => `<img src="data:image/png;base64,${readFileSync(join(UI, "phone-framed", `${f}.png`)).toString("base64")}"
      style="width:828px;height:1736px;display:block;filter:drop-shadow(${SHOWCASE_SHADOW})">`).join("")}
  </div></body>`;

const PHONE = { width: 390, height: 844, scale: 2 };
const DESKTOP = { width: 1440, height: 900, scale: 1 };

/** The phone frame of UI/phone-framed: 24 px of #1c1c1a with a fine highlight ring. */
const framed = (png: Buffer) => `<!doctype html><body style="margin:0;background:transparent">
  <div style="position:relative;width:828px;height:1736px;border-radius:92px;background:#1c1c1a;overflow:hidden">
    <div style="position:absolute;inset:7px;border-radius:85px;border:2px solid #3a3a36;box-sizing:border-box"></div>
    <img src="data:image/png;base64,${png.toString("base64")}"
         style="position:absolute;left:24px;top:24px;width:780px;height:1688px;border-radius:68px;display:block">
  </div></body>`;

async function main() {
  if (!existsSync(join(OUT, "index.html"))) throw new Error("No build in out/: run `npm run build` first.");
  if (!existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME}: set CHROME to its path.`);

  const only = process.argv.slice(2);
  const showcasesOnly = only.length === 1 && only[0] === "showcase";
  const screens = showcasesOnly ? [] : only.length
    ? SCREENS.filter((sc) => only.some((o) => sc.file.startsWith(o) || sc.file.includes(`-${o}`)))
    : SCREENS;
  if (!screens.length && !showcasesOnly) throw new Error(`No screen matches ${only.join(", ")}.`);

  const app = await serve();
  const chrome = await startChrome();
  const phoneShots = new Map<string, Buffer>();
  try {
    for (const size of [PHONE, DESKTOP]) {
      const phone = size === PHONE;
      const forSize = screens.filter((sc) => phone || !sc.phoneOnly);
      const take = async (s: Send, sc: Screen) => {
        if (phone) phoneShots.set(sc.file, await shot(s));
        const dir = phone ? "mobile" : "desktop";
        const png = sc.overlay ? await shot(s) : await fullShot(s, size.width, size.height, size.scale);
        writeFileSync(join(UI, dir, `${sc.file}.png`), png);
        console.log(`  ${dir}/${sc.file}.png`);
      };

      // Screens with data: one install, the sample restored once, then each page.
      const withData = forSize.filter((sc) => !sc.firstRun);
      if (withData.length) {
        const { s, close } = await chrome.newPage(size.width, size.height, size.scale);
        await s("Page.addScriptToEvaluateOnNewDocument", { source: `localStorage.setItem("baaki.welcomed", "1")` });
        await loadSampleData(s, app.url);
        for (const sc of withData) {
          await open(s, app.url + sc.path, sc.wait);
          if (sc.open) {
            await press(s, sc.open);
            await sleep(1200);
          }
          await take(s, sc);
        }
        await close();
      }

      // First-run screens: a new install, walked from the welcome screen.
      const firstRun = SCREENS.filter((sc) => sc.firstRun);
      if (forSize.some((sc) => sc.firstRun)) {
        const { s, close } = await chrome.newPage(size.width, size.height, size.scale);
        await s("Page.navigate", { url: `${app.url}/` });
        for (const [i, sc] of firstRun.entries()) {
          await waitFor(s, sc.wait);
          if (forSize.includes(sc)) await take(s, sc);
          if (i < firstRun.length - 1) await press(s, i === 0 ? "Get Started" : "Next");
        }
        await close();
      }
    }

    // Frame the phone shots.
    const { s, close } = await chrome.newPage(828, 1736, 1);
    await s("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    for (const [file, png] of phoneShots) {
      await s("Page.navigate", { url: `data:text/html;base64,${Buffer.from(framed(png)).toString("base64")}` });
      await sleep(700);
      writeFileSync(join(UI, "phone-framed", `${file}.png`), await shot(s));
      console.log(`  phone-framed/${file}.png`);
    }
    await close();

    // The showcases, from the framed shots on disk (new or not).
    {
      const { s, close } = await chrome.newPage(4684, 1960, 1);
      for (const [name, files] of Object.entries(SHOWCASES)) {
        await s("Page.navigate", { url: `data:text/html;base64,${Buffer.from(showcase(files)).toString("base64")}` });
        await sleep(1000);
        writeFileSync(join(UI, `${name}.png`), await shot(s));
        console.log(`  ${name}.png`);
      }
      await close();
    }
  } finally {
    await chrome.stop();
    app.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
