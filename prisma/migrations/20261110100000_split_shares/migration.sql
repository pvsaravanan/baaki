-- Split expenses, the light version: other people's parts of an expense you
-- paid for, typed by name, and where the money went when they paid you back.
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
