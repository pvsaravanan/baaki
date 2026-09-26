# baaki

**Know where your money goes.** A personal finance and expense tracker — record income,
expenses, transfers and refunds; track budgets, savings and goals; and turn raw transactions
into answers like *"where did my money go this month?"*

Built with Next.js 15 (App Router) · TypeScript · Prisma · Supabase (Postgres) · Tailwind CSS.

## Quick start

```bash
npm install
cp .env.example .env   # then paste your Supabase connection strings (see below)
npm run setup          # generate Prisma client, apply migrations to Postgres (empty)
npm run dev            # http://localhost:3000
```

### Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com) and set a database password.
2. In the dashboard, open **Connect → ORM** (Prisma) and copy the two strings into `.env`:
   - `DATABASE_URL` — Transaction pooler (port `6543`), ends with `?pgbouncer=true`.
   - `DIRECT_URL` — Session pooler / direct (port `5432`), used by Prisma Migrate.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your project's API settings. Set `SUPABASE_SERVICE_ROLE_KEY` on the server for avatar storage administration; never expose it to the browser.
4. Configure Supabase Auth's site URL and allowed redirect URLs for your deployment, including `/auth/callback` and `/reset`.
5. Run `npm run setup` to create the tables.

### Schema changes (Prisma Migrate)

Schema changes go through migration files in `prisma/migrations/`, not `prisma db push` —
a push has no history and no safe way to roll a production schema forward or back.

- **Local dev:** edit `prisma/schema.prisma`, then run `npm run db:migrate` to generate and
  apply a new migration against your dev database. `migrate dev` creates a disposable shadow
  database to compute the diff; if your Postgres role can't create databases (some managed
  Supabase roles can't), add a `shadowDatabaseUrl` to the `datasource` block pointing at a
  separate, empty database, or generate the SQL by hand with
  `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`.
- **Production:** run `npm run db:deploy` (`prisma migrate deploy`) against the target
  project's connection strings. It only applies migrations not yet recorded as applied —
  never diffs or auto-generates SQL — so it's safe to run in CI/CD on every deploy.
- Commit every migration folder under `prisma/migrations/` to git; it's the only record of
  how the schema got here.

The database starts empty. Create an account at `/register` — you begin with a set of
default categories and two starter accounts (a bank account and cash), ready to record
your first transaction.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (`prisma generate` + `next build`) |
| `npm run start` | Run the production build |
| `npm run test` | Run the financial-logic test suite (Vitest) |
| `npm run db:migrate` | Create and apply a new migration from schema changes (dev) |
| `npm run db:deploy` | Apply pending migrations only, no diffing (production) |
| `npm run db:reset` | Drop and rebuild the dev DB from migration history |
| `npm run setup` | generate + apply migrations (empty DB) in one step |

## Deploying

The app is a standard Next.js server and can run on any Node host (Vercel, Fly, a
container, etc.). The database is Supabase (hosted Postgres) — see [Database](#database-supabase).

**1. Set environment variables on the host.** `.env` is gitignored, so it is *not*
shipped with the code — configure these in your host's environment settings:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Supabase **transaction pooler** (port `6543`), ending in `?pgbouncer=true`. Used by the app at runtime. |
| `DIRECT_URL` | Supabase **session pooler / direct** (port `5432`). Used only by Prisma Migrate. |
| `NEXT_PUBLIC_SUPABASE_URL` | Project API URL, used by Supabase Auth and Storage. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase API key for browser/server auth clients. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged key for avatar storage. Never expose it in client code. |

**2. Build.** `npm run build` runs `prisma generate` then `next build`.

**3. Apply pending migrations** as its own deploy step, before traffic hits the new build,
against the target project's connection strings:

```bash
npm run db:deploy
```

This only applies migration files already committed under `prisma/migrations/` that aren't
yet recorded as applied — it never diffs `schema.prisma` or generates SQL on the fly, so it's
safe to run unattended on every deploy. Author and test new migrations locally first with
`npm run db:migrate`, commit the generated `prisma/migrations/<timestamp>_<name>/` folder,
then let this step apply it in each environment.

Notes:

- On serverless (e.g. Vercel), always use the **pooled** `DATABASE_URL` (`6543`) so
  functions don't exhaust direct connections. `DIRECT_URL` is only for Prisma Migrate.
- Supabase Auth owns passwords, sessions, email delivery and password recovery.
  The legacy `AUTH_SECRET`, `RESEND_API_KEY` and `EMAIL_FROM` entries in `.env.example`
  are not used by the current application.
- Never commit real secrets. Keep them in the host's env config and in your local
  gitignored `.env`; `.env.example` documents the shape with placeholders.

## Money is never a float

All monetary values are stored and computed as **integer paise** (1 rupee = 100 paise).
Rupee values are only produced for display via `formatINR` / the `<Money>` component, which
uses the Indian numbering system (`₹1,00,000`).

## Architecture

Clean separation of concerns:

- `src/lib/calculations.ts` — pure, dependency-free financial calculations (balance, summaries,
  category totals, budgets, savings rate, date-range filtering). Unit-tested.
- `src/lib/analytics.ts` — server-side monthly analytics composed from the calc layer.
- `src/lib/insights.ts` — deterministic insight generation from real aggregates (no AI).
- `src/lib/categorize.ts` — rule-based auto-categorization (no AI required).
- `src/lib/csv.ts` — CSV export + import validation/mapping (pure, tested).
- `src/lib/queries.ts` — server data loaders; `src/lib/tx-service.ts` — transaction business logic.
- `src/lib/auth.ts` — verified Supabase identity mapped to the local user profile.
- `src/lib/account-form.ts` — account form validation, optional bank nicknames and bank-icon selection.
- `src/app/api/**` — REST route handlers with authentication and per-user ownership checks.
- `src/components/**` — reusable UI kit and feature components.

## Verification

```bash
npm test
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

Tests cover financial calculations, CSV validation, account form behavior, profile linking,
API errors and shared-expense guards. Database and auth interactions in service tests are
mocked; these tests do not modify a live database or replace integration testing.

`npm run lint` runs ESLint via `eslint-config-next` (see `eslint.config.mjs`); CI
(`.github/workflows/ci.yml`) runs the same four commands above on every push and PR against
`main`, with placeholder env vars — it never touches a real database.
Do not run `setup`, `db:migrate`, `db:deploy` or `db:reset` as verification: they change the database.
On Windows, Prisma generation can fail with `EPERM` when replacing its query-engine DLL.
Close any running app process holding that DLL before retrying `npm run build`.
`npx next build` can check application compilation with an existing generated Prisma client,
but does not verify the Prisma generation step.

## Security notes

- API handlers require a valid Supabase identity and scope data access to the local user.
- Profile linking requires a confirmed email and cannot overwrite another auth identity.
- Passwords and session lifecycle are managed by Supabase Auth, not local bcrypt sessions.
- Keep the service-role key server-only and configure Supabase Auth redirect URLs for each deployment.

## License

MIT — see [LICENSE](./LICENSE).
