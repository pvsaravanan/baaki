export interface Step {
  /** A CSS selector for what to light; missing, the card sits in the middle. */
  target?: string;
  /** The target lives in the More menu, which the tour opens for it (on a phone). */
  menu?: boolean;
  /**
   * Asks for the person's name and can't be passed without one. The card holds
   * the field; the dashboard behind lights the greeting the name appears in.
   */
  name?: boolean;
  title: string;
  body: string;
}

/** A menu entry: a tile in the phone's More menu, or its row in the sidebar. */
export const menuItem = (path: string) => `[data-tour="menu"] a[href^="${path}"], nav[data-tour="more"] a[href^="${path}"]`;

// Each selector can match a phone control and a desktop one; the visible one is used.
export const STEPS: Step[] = [
  {
    title: "Welcome to baaki",
    body: "Here's a quick look at what you can do. It takes under a minute.",
  },
  {
    target: '[data-tour="greeting"]',
    name: true,
    title: "What should we call you?",
    body: "It appears in your dashboard greeting.",
  },
  {
    target: '[data-tour="month"] > *',
    title: "Pick a month",
    body: "Use the arrows, or tap the month to jump. Home, Budget, Categories, Reports and Transactions all follow the month you choose.",
  },
  {
    target: '[data-tour="add"]',
    title: "Add a transaction",
    body: "Record an expense, income, or a transfer between your accounts. Turn on Split to note what friends owe you.",
  },
  {
    target: 'nav a[href^="/transactions"]',
    title: "Every transaction",
    body: "Search, and filter by date, category, account or amount. Open one to edit or delete it.",
  },
  {
    target: 'nav a[href^="/reports"]',
    title: "Reports",
    body: "See where your money goes: spending by category, income against expenses, and how it changes over time.",
  },
  {
    target: '[data-tour="more"]',
    title: "More",
    body: "Everything else in baaki is in here. Let's look at each part.",
  },
  {
    target: menuItem("/budgets"),
    menu: true,
    title: "Budgets",
    body: "Set a monthly limit for the whole month and for each category, and see how much is left. It follows the month you pick.",
  },
  {
    target: menuItem("/accounts"),
    menu: true,
    title: "Accounts",
    body: "Add your banks, cash and cards with their starting balances. Every transaction belongs to an account, and balances update on their own.",
  },
  {
    target: menuItem("/categories"),
    menu: true,
    title: "Categories",
    body: "Group your spending and income your way, with your own icon and colour. Open one to see its trend and top merchants.",
  },
  {
    target: menuItem("/recurring"),
    menu: true,
    title: "Recurring",
    body: "Set up rent, bills, subscriptions or salary once. baaki adds them when they're due, or reminds you to add them with one tap.",
  },
  {
    target: menuItem("/splits"),
    menu: true,
    title: "To collect",
    body: "When you split an expense, what friends owe you is listed here. Mark it paid back and it lands in the account you choose.",
  },
  {
    target: menuItem("/import"),
    menu: true,
    title: "Import",
    body: "Bring in a bank statement as a CSV or Excel file. Match the columns, preview the rows, then import them all at once.",
  },
  {
    target: '[data-tour="profile"]',
    title: "Your profile and settings",
    body: "Change your picture, set an app lock, tidy the dashboard, or back up your data. It all stays on this phone.",
  },
  {
    title: "You're all set",
    body: "Start by adding your first transaction. You can replay this tour from Settings whenever you like.",
  },
];
