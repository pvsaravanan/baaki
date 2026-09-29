import {
  ArrowLeftRight, Bookmark, CalendarClock, LayoutDashboard, Lightbulb, LineChart, PieChart,
  Settings, Sparkles, Target, Upload, Users, Wallet, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const DASHBOARD: NavItem = { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard };
const TRANSACTIONS: NavItem = { href: "/transactions", label: "Transactions", icon: ArrowLeftRight };
const BUDGETS: NavItem = { href: "/budgets", label: "Budgets", icon: PieChart };
const PEOPLE: NavItem = { href: "/people", label: "People", icon: Users };
const RECURRING: NavItem = { href: "/recurring", label: "Recurring", icon: CalendarClock };
const GOALS: NavItem = { href: "/goals", label: "Goals", icon: Target };
const INSIGHTS: NavItem = { href: "/insights", label: "Insights", icon: Lightbulb };
const TRENDS: NavItem = { href: "/trends", label: "Trends", icon: LineChart };
const REPORTS: NavItem = { href: "/reports", label: "Reports", icon: Sparkles };
const ACCOUNTS: NavItem = { href: "/accounts", label: "Accounts", icon: Wallet };
const CATEGORIES: NavItem = { href: "/categories", label: "Categories", icon: Bookmark };
const IMPORT: NavItem = { href: "/import", label: "Import", icon: Upload };
const SETTINGS: NavItem = { href: "/settings", label: "Settings", icon: Settings };

export const PRIMARY_NAV: NavItem[] = [
  DASHBOARD, TRANSACTIONS, BUDGETS, PEOPLE, RECURRING, GOALS, INSIGHTS, TRENDS, REPORTS,
];

export const SECONDARY_NAV: NavItem[] = [ACCOUNTS, CATEGORIES, IMPORT, SETTINGS];

export const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

/**
 * Grouped destinations for the mobile "More" sheet (see BottomNav). Dashboard,
 * Transactions and Budgets are omitted — they already have persistent
 * bottom-bar tabs, so repeating them here just adds noise to a menu that's
 * already competing for attention on a small screen. The remaining items are
 * grouped by intent (glancing at your finances vs. managing setup) instead of
 * one flat, equal-weight grid, so the sheet reads as a hierarchy.
 */
export const MORE_SHEET_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Track", items: [INSIGHTS, TRENDS, REPORTS, GOALS] },
  { label: "Manage", items: [ACCOUNTS, CATEGORIES, PEOPLE, RECURRING, IMPORT, SETTINGS] },
];
