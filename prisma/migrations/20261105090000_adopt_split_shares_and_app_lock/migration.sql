-- Adopts the data model of the on-device app (main) without dropping anything.
--
-- Added:   UserPreference.appLock, the SplitShare table (people's parts of a
--          split expense, by name), and the data conversions below.
-- Kept:    Contact, ExpenseShare, FinancialGoal, GoalContribution,
--          RateLimitBucket, Transaction.paymentMethod and the User login
--          columns (authId, passwordHash). The app no longer reads or writes
--          the people/goals tables, but the data in them is untouched, so this
--          migration can be undone by hand and nothing is lost.
--
-- Take a database backup before running `prisma migrate deploy`.

-- The native app's fingerprint / screen lock preference (unused on the web).
ALTER TABLE "UserPreference" ADD COLUMN "appLock" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SplitShare" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "settledAt" TIMESTAMP(3),
    "settledAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SplitShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SplitShare_transactionId_idx" ON "SplitShare"("transactionId");

-- CreateIndex
CREATE INDEX "SplitShare_settledAccountId_idx" ON "SplitShare"("settledAccountId");

-- AddForeignKey
ALTER TABLE "SplitShare" ADD CONSTRAINT "SplitShare_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitShare" ADD CONSTRAINT "SplitShare_settledAccountId_fkey" FOREIGN KEY ("settledAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- People you split with are now typed by name. Carry every share somebody
-- still owes you, or has paid, over to the new table. A share nobody was named
-- for becomes "Someone". Standalone "you owe" entries have no transaction to
-- hang off and stay in ExpenseShare.
INSERT INTO "SplitShare" ("id", "transactionId", "name", "amount", "settledAt", "createdAt")
SELECT es."id",
       es."transactionId",
       COALESCE(NULLIF(BTRIM(c."name"), ''), 'Someone'),
       es."amount",
       CASE WHEN es."settled" THEN COALESCE(es."settledAt", es."createdAt") END,
       es."createdAt"
FROM "ExpenseShare" es
LEFT JOIN "Contact" c ON c."id" = es."contactId"
WHERE es."direction" = 'owed_to_you'
  AND es."transactionId" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

-- A repayment (someone paying you back) is plain income now: account balances
-- are unchanged. The ids are kept in LegacyRepaymentTransaction so it can be
-- reversed: UPDATE "Transaction" SET "type" = 'repayment'
--           WHERE "id" IN (SELECT "id" FROM "LegacyRepaymentTransaction");
CREATE TABLE "LegacyRepaymentTransaction" (
    "id" TEXT NOT NULL,
    CONSTRAINT "LegacyRepaymentTransaction_pkey" PRIMARY KEY ("id")
);
INSERT INTO "LegacyRepaymentTransaction" ("id")
SELECT "id" FROM "Transaction" WHERE "type" = 'repayment';
UPDATE "Transaction" SET "type" = 'income' WHERE "type" = 'repayment';

-- The dashboard was redesigned with a shorter default layout. A profile that still
-- has the old "everything on" default (never customised) moves to the new default;
-- an empty list means "use the default".
UPDATE "UserPreference"
SET "dashboardWidgets" = '[]'
WHERE "dashboardWidgets" IN (
  '["balance","income","expenses","net_savings","savings_rate","budget_left","income_vs_expenses","spending_calendar","recent_transactions","spending_categories","budget_progress","upcoming_recurring","financial_goals","insights"]',
  '["balance","income","expenses","net_savings","savings_rate","budget_left","income_vs_expenses","spending_calendar","recent_transactions","spending_categories","budget_progress","upcoming_recurring","insights"]',
  '["balance","income","expenses","net_savings","savings_rate","budget_left","income_vs_expenses","spending_calendar","recent_transactions","spending_categories","budget_progress","upcoming_recurring"]'
);
