-- AddColumn
ALTER TABLE "Category" ADD COLUMN "systemKey" TEXT;

-- Backfill: give each existing built-in category its permanent key. Built-in
-- categories could not be renamed before this migration, so their name still
-- identifies them.
UPDATE "Category" AS c
SET "systemKey" = d.key
FROM (VALUES
  ('Housing', 'housing'),
  ('Food', 'food'),
  ('Groceries', 'groceries'),
  ('Transportation', 'transportation'),
  ('Education', 'education'),
  ('Healthcare', 'healthcare'),
  ('Entertainment', 'entertainment'),
  ('Shopping', 'shopping'),
  ('Subscriptions', 'subscriptions'),
  ('Bills & Utilities', 'bills-utilities'),
  ('Travel', 'travel'),
  ('Personal', 'personal'),
  ('Family', 'family'),
  ('Bank Charges', 'bank-charges'),
  ('Salary', 'salary'),
  ('Business', 'business'),
  ('Investments', 'investments'),
  ('Other Income', 'other-income'),
  ('Other', 'other')
) AS d(name, key)
WHERE c."isSystem" = true
  AND lower(c."name") = lower(d.name);

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_systemKey_key" ON "Category"("userId", "systemKey");
