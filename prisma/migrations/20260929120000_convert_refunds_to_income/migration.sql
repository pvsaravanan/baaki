-- The Refund transaction type was removed. A refund is money coming back in,
-- so existing refunds become Income — account balances stay exactly the same.
-- They move to the user's built-in "Other Income" category (a refund's old
-- category is an expense one, which income can't use); if that category is
-- missing, the original category is kept.
UPDATE "Transaction" AS t
SET "type" = 'income',
    "categoryId" = COALESCE(
      (SELECT c."id" FROM "Category" AS c WHERE c."userId" = t."userId" AND c."systemKey" = 'other-income' LIMIT 1),
      t."categoryId"
    )
WHERE t."type" = 'refund';

UPDATE "RecurringTransaction" AS r
SET "type" = 'income',
    "categoryId" = COALESCE(
      (SELECT c."id" FROM "Category" AS c WHERE c."userId" = r."userId" AND c."systemKey" = 'other-income' LIMIT 1),
      r."categoryId"
    )
WHERE r."type" = 'refund';
