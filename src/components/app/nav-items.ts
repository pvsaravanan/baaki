import {
  ArrowLeftRight, Bookmark, CalendarClock, LayoutDashboard, Lightbulb, LineChart, PieChart,
  Settings, Sparkles, Target, Upload, Users, Wallet, type LucideIcon,
} from "lucide-react";
import type { SectionIconKey } from "./section-icon";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Sections with an illustration show it instead of the line icon. */
  section?: SectionIconKey;
}

const DASHBOARD: NavItem = { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard };
const TRANSACTIONS: NavItem = { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, section: "transactions" };
const BUDGETS: NavItem = { href: "/budgets", label: "Budgets", icon: PieChart, section: "budgets" };
const PEOPLE: NavItem = { href: "/people", label: "People", icon: Users, section: "people" };
const RECURRING: NavItem = { href: "/recurring", label: "Recurring", icon: CalendarClock, section: "recurring" };
const GOALS: NavItem = { href: "/goals", label: "Goals", icon: Target, section: "goals" };
const INSIGHTS: NavItem = { href: "/insights", label: "Insights", icon: Lightbulb, section: "insights" };
const TRENDS: NavItem = { href: "/trends", label: "Trends", icon: LineChart, section: "trends" };
const REPORTS: NavItem = { href: "/reports", label: "Reports", icon: Sparkles, section: "reports" };
const ACCOUNTS: NavItem = { href: "/accounts", label: "Accounts", icon: Wallet, section: "accounts" };
const CATEGORIES: NavItem = { href: "/categories", label: "Categories", icon: Bookmark, section: "categories" };
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
