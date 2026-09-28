# <img src="docs/baaki-mark.svg" alt="" height="32"> baaki

**Know where your money goes.**

baaki is a personal finance app for everyday money in India. You record what comes in
and what goes out, and baaki turns it into clear answers: how much you spent this month,
where it went, how you're doing against your budget, and what's left to save.

It works in rupees from the ground up — Indian number formatting (`₹1,00,000`), UPI and
net banking as payment methods, Indian bank logos — and it's built to be used on your
phone as much as on a laptop.

## What you can do with it

### Record every rupee

- **Transactions** — log expenses, income, transfers between your own accounts, and
  refunds, with a date, payment method (UPI, cash, card, net banking), tags and notes.
- **Automatic categorization** — type "Swiggy dinner" or "Uber to office" and baaki
  picks the category for you. It's rule-based and runs instantly, with no AI service
  involved.
- **Split a transaction** across several categories or accounts, e.g. one supermarket
  bill that's part groceries, part shopping.
- **Search and filter** by date, type, category, account, payment method and tag.
  Duplicate a transaction to re-enter a similar one quickly, undo a delete right after
  making it, or select several transactions to delete them at once.

### Organize it your way

- **Accounts** — banks, cash, credit cards and wallets, each with its running balance.
  Pick your bank from a list with its logo, or add any account type of your own.
- **Categories** — start with a sensible set (Food, Groceries, Housing, Travel, Salary
  and more), then rename, add, remove or pick from 73 illustrated icons to make them
  yours.
- **Recurring** — set up rent, bills, subscriptions and salary once (daily, weekly,
  monthly, quarterly or yearly) and baaki records them when they're due.

### Stay on track

- **Budgets** — an overall monthly limit plus per-category limits, with clear warnings
  as you approach or go over them.
- **Goals** — save toward a trip, an emergency fund or a new phone. Set a target amount
  and date, link it to an account, and add contributions as you go.
- **People** — split expenses with friends, family or roommates, see who owes whom, and
  settle up (optionally recording the repayment in one of your accounts).

### Understand your money

- **Dashboard** — this month at a glance: balance, income, spending, savings rate,
  budget left, spending by category, a day-by-day spending calendar, recent
  transactions, upcoming bills and goals. Choose which widgets appear and in what order.
- **Insights** — plain-language observations drawn from your own numbers, like which
  category dominated this month, how spending compares with last month, and what your
  subscriptions cost.
- **Trends** — how your income, spending and savings move over time, which categories
  grew or shrank, and whether this month's spending is ahead of an even pace.
- **Reports** — for any month: an overview, spending by category (an interactive chart
  plus a full breakdown), balances by account, income, expenses and cash flow.

### Your data, your control

- **Import** transactions from a CSV (e.g. a bank statement): map its columns, preview
  the rows, and see exactly which ones have problems (and why) before anything is saved.
  Rows you've already imported are skipped, so re-importing a statement won't double up.
- **Export** your transactions as CSV, or a full backup of everything as JSON, at any time.
- **Personalize** — light or dark theme, a default account for new transactions, and a
  profile photo.

## How it's built

- Every amount is stored as whole **paise** (1 rupee = 100 paise), never as a floating-point
  number, so totals never drift by a paisa.
- Insights and auto-categorization are deterministic rules computed from your own data
  — your transactions are never sent to an AI service.
- Sign-in, password reset and sessions are handled by Supabase Auth; every request is
  checked so each person only ever sees their own data.

Built with Next.js 15 (App Router), TypeScript, Prisma, Supabase (Postgres) and Tailwind CSS.

## Running it yourself

```bash
npm install
cp .env.example .env   # add your Supabase connection strings
npm run setup          # generate the Prisma client and create the tables
npm run dev            # http://localhost:3000
```

Then create an account at `/register`. You start with the default categories and two
accounts (a bank account and cash), ready for your first transaction.

For database setup, schema changes, deployment, architecture and testing, see
[docs/SETUP.md](docs/SETUP.md).

## License

MIT — see [LICENSE](./LICENSE).
