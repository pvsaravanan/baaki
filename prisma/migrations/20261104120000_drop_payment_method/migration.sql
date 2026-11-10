-- Payment method was removed from transactions and recurring rules.
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS "paymentMethod";
ALTER TABLE "RecurringTransaction" DROP COLUMN IF EXISTS "paymentMethod";
