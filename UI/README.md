# baaki — screens

Screenshots of every screen of the app, taken from the real app with sample data
(three months of transactions, a September budget and five
recurring items, from `scripts/sample-data.ts`) on 24 September 2026.

- `showcase-1.png`, `showcase-2.png` — five phone screens side by side
- `phone-framed/` — one phone screen each, in a phone frame
- `mobile/` — phone, 390 px wide (at 2×), the full length of each screen
- `desktop/` — desktop, 1440 px wide, the full length of each screen

To take them again after changing the app (needs Google Chrome):

```bash
npm run build && npx tsx scripts/capture-screens.ts            # every screen
npm run build && npx tsx scripts/capture-screens.ts budgets 16  # just some
npx tsx scripts/capture-screens.ts showcase                     # only the showcases
```

Every run also rebuilds the showcases from the phone screens. The walkthrough video isn't
made by the script.

| # | Screen | Phone screen | Phone, full length | Desktop |
| --- | --- | --- | --- | --- |
| 01 | Dashboard | [phone](phone-framed/01-dashboard.png) | [mobile](mobile/01-dashboard.png) | [desktop](desktop/01-dashboard.png) |
| 02 | Transactions | [phone](phone-framed/02-transactions.png) | [mobile](mobile/02-transactions.png) | [desktop](desktop/02-transactions.png) |
| 03 | Accounts | [phone](phone-framed/03-accounts.png) | [mobile](mobile/03-accounts.png) | [desktop](desktop/03-accounts.png) |
| 04 | Budgets | [phone](phone-framed/04-budgets.png) | [mobile](mobile/04-budgets.png) | [desktop](desktop/04-budgets.png) |
| 08 | Recurring | [phone](phone-framed/08-recurring.png) | [mobile](mobile/08-recurring.png) | [desktop](desktop/08-recurring.png) |
| 09 | Reports | [phone](phone-framed/09-reports.png) | [mobile](mobile/09-reports.png) | [desktop](desktop/09-reports.png) |
| 12 | Categories | [phone](phone-framed/12-categories.png) | [mobile](mobile/12-categories.png) | [desktop](desktop/12-categories.png) |
| 13 | Category detail | [phone](phone-framed/13-category-detail.png) | [mobile](mobile/13-category-detail.png) | [desktop](desktop/13-category-detail.png) |
| 14 | Import | [phone](phone-framed/14-import.png) | [mobile](mobile/14-import.png) | [desktop](desktop/14-import.png) |
| 15 | Settings | [phone](phone-framed/15-settings.png) | [mobile](mobile/15-settings.png) | [desktop](desktop/15-settings.png) |
| 16 | Add transaction (form) | [phone](phone-framed/16-add-transaction.png) | [mobile](mobile/16-add-transaction.png) | — |
| 17 | More menu | [phone](phone-framed/17-more-menu.png) | [mobile](mobile/17-more-menu.png) | — |
| 18 | Welcome | [phone](phone-framed/18-welcome.png) | [mobile](mobile/18-welcome.png) | [desktop](desktop/18-welcome.png) |
| 19 | Onboarding: track expenses | [phone](phone-framed/19-onboarding-expenses.png) | [mobile](mobile/19-onboarding-expenses.png) | [desktop](desktop/19-onboarding-expenses.png) |
| 20 | Onboarding: understand spending | [phone](phone-framed/20-onboarding-spending.png) | [mobile](mobile/20-onboarding-spending.png) | [desktop](desktop/20-onboarding-spending.png) |
| 24 | Onboarding: set budgets | [phone](phone-framed/24-onboarding-budgets.png) | [mobile](mobile/24-onboarding-budgets.png) | [desktop](desktop/24-onboarding-budgets.png) |
| 25 | Onboarding: never miss a bill | [phone](phone-framed/25-onboarding-bills.png) | [mobile](mobile/25-onboarding-bills.png) | [desktop](desktop/25-onboarding-bills.png) |
| 26 | Onboarding: stays private | [phone](phone-framed/26-onboarding-private.png) | [mobile](mobile/26-onboarding-private.png) | [desktop](desktop/26-onboarding-private.png) |
| 22 | Choose a profile picture | [phone](phone-framed/22-choose-avatar.png) | [mobile](mobile/22-choose-avatar.png) | [desktop](desktop/22-choose-avatar.png) |
| 23 | Transaction filters | [phone](phone-framed/23-filters.png) | [mobile](mobile/23-filters.png) | [desktop](desktop/23-filters.png) |
| 27 | Spending calendar (dashboard card) | [phone](phone-framed/27-spending-calendar.png) | [mobile](mobile/27-spending-calendar.png) | [desktop](desktop/27-spending-calendar.png) |
