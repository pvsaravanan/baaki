-- CreateTable
CREATE TABLE "BudgetAccount" (
    "budgetId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,

    CONSTRAINT "BudgetAccount_pkey" PRIMARY KEY ("budgetId","accountId")
);

-- CreateIndex
CREATE INDEX "BudgetAccount_accountId_idx" ON "BudgetAccount"("accountId");

-- AddForeignKey
ALTER TABLE "BudgetAccount" ADD CONSTRAINT "BudgetAccount_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAccount" ADD CONSTRAINT "BudgetAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
