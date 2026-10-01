# Building and running baaki

How to run baaki, build the Android app, change its database schema, and verify changes.
For what baaki is and what it does, see the [README](../README.md).

## Quick start

```bash
npm install            # also generates the on-device database client
npm run dev            # http://localhost:3000 — the app in a browser
```

Nothing to configure: there's no server, account or API key. In a browser the data is
kept in that browser's storage (IndexedDB) for that site, so each browser profile gets its
own separate copy, starting with the default categories and two accounts.

## The Android app

baaki ships as an Android app built with [Capacitor](https://capacitorjs.com): a native
shell around the static build of the web app, which it serves from the phone itself.

### One-time setup

- **Android Studio** (includes the Android SDK and an emulator), or the command-line tools
  plus `platform-tools`, `platforms;android-36` and `build-tools`. Set `ANDROID_HOME`.
- **JDK 21** (Capacitor 8 builds with Java 21; Android Studio bundles one).
- **Node 22** or later.

### Build and run

| Command | What it does |
| --- | --- |
| `npm run build:app` | Static build to `out/`, then copies it into `android/` (`cap sync`) |
| `npm run android` | `build:app`, then installs and starts it on a phone or emulator |
| `npm run android:open` | Opens `android/` in Android Studio (to build, sign, profile) |
| `cd android && ./gradlew assembleDebug` | A debug APK at `android/app/build/outputs/apk/debug/` |

CI (`.github/workflows/ci.yml`) also builds a debug APK on every push to `main` or
`mobile-app`. Download it from the run's **Artifacts** and install it on a phone (allow
"install unknown apps" for your browser or file manager).

A Play Store release needs a signed bundle: create an upload key once
(`keytool -genkey -v -keystore baaki-upload.jks -alias baaki -keyalg RSA -keysize 2048 -validity 10000`),
keep it and its passwords **out of git**, and use **Build → Generate Signed Bundle** in
Android Studio. Losing the key means you can't publish updates.

### Icons and splash screen

`node scripts/make-app-icons.mjs` redraws the launcher icons (standard, round and
adaptive) and splash screens from `src/assets/baaki_logo.svg` on the app's parchment
colour. Re-run it after changing the logo.

## How it works offline

Everything that used to run on a server now runs inside the app:

```
screen ──usePageData / apiGet / apiPost──▶ local API ──▶ route handler ──▶ Prisma ──▶ PGlite (IndexedDB)
          src/lib/local-api.ts, http.ts      src/server/local-server.ts      src/lib/*-service.ts
```

- **Database.** [PGlite](https://pglite.dev) is Postgres compiled to WebAssembly. It's
  stored in the WebView's IndexedDB — the app's private storage, kept across restarts and
  updates and removed only when the app is uninstalled. `src/lib/db.ts`.
- **Prisma, unchanged.** The services use the same Prisma API as before, through a PGlite
  driver adapter and Prisma's WebAssembly query compiler (`engineType = "client"`).
  `npm run db:generate` runs `prisma generate` and then `scripts/prisma-browser.mjs`, which
  makes the generated client load in a browser and bundles the migrations.
- **Local API.** The route handlers in `src/server/api/**` are the ones the website ran on
  its server. `src/server/local-server.ts` matches each `/api/...` call to its handler, so
  forms and screens call the same URLs as before, answered on the device. Screen data
  (dashboard, reports, …) is loaded by `src/server/pages.ts` through `usePageData`.
- **One person, no login.** The database holds a single profile, created with starter
  data on first launch (`src/lib/auth.ts`). The optional app lock uses the phone's own
  fingerprint/screen lock (`src/lib/app-lock.ts`, `src/components/app/lock-gate.tsx`).
- **No network.** A content security policy (`src/app/layout.tsx`) lets the app load only
  its own files and blocks connections to anywhere else.
- **Detail screens** use a query string (`/goals/detail?id=…`), since a static build
  can't pre-render one page per record.

### Backups

Settings → Data & backup → **Full backup** writes every table to a JSON file (format
version 2, `src/lib/backup.ts`) and opens Android's share sheet. **Restore from backup**
replaces everything in one transaction; if any part of the file can't be read, nothing
changes. Restore also accepts version 1, the "Full backup" from the baaki website.

## Schema changes

The app applies `prisma/migrations/*/migration.sql` to the on-device database on start-up,
recording each in `_baaki_migrations` (`src/lib/local-db.ts`). Existing installs pick up
new migrations on their next launch, so:

1. Edit `prisma/schema.prisma`.
2. Write the migration: `npm run db:migrate` (`prisma migrate dev --create-only`, needs a
   throwaway local Postgres in `DATABASE_URL`, see `.env.example`), or write the SQL by
   hand in a new `prisma/migrations/<timestamp>_<name>/migration.sql`.
3. `npm run db:generate`, then commit the migration folder.

Never edit a migration that has shipped: phones that already ran it won't run it again.

## Money is never a float

All monetary values are stored and computed as **integer paise** (1 rupee = 100 paise).
Rupee values are only produced for display via `formatINR` / the `<Money>` component, which
uses the Indian numbering system (`₹1,00,000`).

## Architecture

- `src/lib/calculations.ts` — pure financial calculations (balance, summaries, category
  totals, budgets, savings rate, date-range filtering). Unit-tested.
- `src/lib/analytics.ts` — monthly analytics composed from the calc layer.
- `src/lib/insights.ts` — deterministic insight generation from real aggregates (no AI).
- `src/lib/categorize.ts` — rule-based auto-categorization (no AI required).
- `src/lib/csv.ts`, `src/lib/spreadsheet.ts` — statement import (CSV/Excel) and CSV export.
- `src/lib/queries.ts`, `src/lib/tx-service.ts`, `src/lib/goals-service.ts`,
  `src/lib/contacts-service.ts`, `src/lib/recurring.ts` — data loading and business logic.
- `src/lib/backup.ts` — full backup and restore.
- `src/server/**` — the local API: route handlers, the router and screen loaders.
- `src/components/**` — reusable UI kit and feature components.

## Verification

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Most service tests mock the database. `src/server/local-server.test.ts` runs the real
routes against an in-memory PGlite (`src/test/memory-db.ts`), covering routing, first-launch
setup, a backup → restore round trip, damaged backups, and importing the website's backup.
