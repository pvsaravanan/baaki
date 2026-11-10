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
