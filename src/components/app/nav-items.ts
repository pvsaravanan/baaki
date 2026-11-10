import {
  ArrowLeftRight, Bookmark, CalendarClock, LayoutDashboard, PieChart,
  Settings, Sparkles, Upload, Wallet, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const DASHBOARD: NavItem = { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard };
const TRANSACTIONS: NavItem = { href: "/transactions", label: "Transactions", icon: ArrowLeftRight };
const BUDGETS: NavItem = { href: "/budgets", label: "Budgets", icon: PieChart };
const RECURRING: NavItem = { href: "/recurring", label: "Recurring", icon: CalendarClock };
const REPORTS: NavItem = { href: "/reports", label: "Reports", icon: Sparkles };
const ACCOUNTS: NavItem = { href: "/accounts", label: "Accounts", icon: Wallet };
const CATEGORIES: NavItem = { href: "/categories", label: "Categories", icon: Bookmark };
const IMPORT: NavItem = { href: "/import", label: "Import", icon: Upload };
const SETTINGS: NavItem = { href: "/settings", label: "Settings", icon: Settings };

export const PRIMARY_NAV: NavItem[] = [
  DASHBOARD, TRANSACTIONS, BUDGETS, RECURRING, REPORTS,
];

export const SECONDARY_NAV: NavItem[] = [ACCOUNTS, CATEGORIES, IMPORT, SETTINGS];

export const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

/**
 * Destinations for the mobile "More" sheet (see BottomNav). Dashboard,
 * Transactions and Reports already have persistent bottom-bar tabs, so they
 * aren't repeated here.
 */
export const MORE_SHEET_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Manage", items: [BUDGETS, ACCOUNTS, CATEGORIES, RECURRING, IMPORT, SETTINGS] },
];
