-- The people / split-expenses feature was removed: drop its tables.
DROP TABLE IF EXISTS "ExpenseShare";
DROP TABLE IF EXISTS "Contact";
-- Repayments existed only to record a settled split. They still raised an
-- account's balance, so keep that money as income rather than losing it.
UPDATE "Transaction" SET "type" = 'income' WHERE "type" = 'repayment';
