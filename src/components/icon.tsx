import {
  AlertTriangle, ArrowDownRight, ArrowLeftRight, ArrowUpRight, Banknote, Briefcase,
  Building2, Calendar, CreditCard, Flame, Gauge, GraduationCap, Home, Landmark,
  LayoutDashboard, PiggyBank, PieChart, Plane, Plus, PlusCircle, Receipt, Repeat,
  Settings, ShoppingBag, Smartphone, Tag, Target, TrendingDown, TrendingUp, Wallet,
  type LucideIcon,
} from "lucide-react";

/** Named line-icon registry for accounts, goals, insights and UI. Categories use CategoryIcon. */
const ICONS: Record<string, LucideIcon> = {
  home: Home,
  "graduation-cap": GraduationCap,
  "shopping-bag": ShoppingBag,
  repeat: Repeat,
  receipt: Receipt,
  plane: Plane,
  landmark: Landmark,
  wallet: Wallet,
  briefcase: Briefcase,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "plus-circle": PlusCircle,
  tag: Tag,
  target: Target,
  "credit-card": CreditCard,
  banknote: Banknote,
  building: Building2,
  smartphone: Smartphone,
  "piggy-bank": PiggyBank,
  // insight + ui icons
  "pie-chart": PieChart,
  "arrow-up-right": ArrowUpRight,
  "arrow-down-right": ArrowDownRight,
  "arrow-left-right": ArrowLeftRight,
  flame: Flame,
  gauge: Gauge,
  "alert-triangle": AlertTriangle,
  calendar: Calendar,
  dashboard: LayoutDashboard,
  settings: Settings,
  plus: Plus,
};

export function Icon({
  name,
  className,
  size,
  strokeWidth = 2,
}: {
  name: string;
  className?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const Cmp = ICONS[name] ?? Tag;
  return <Cmp className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export const ICON_NAMES = Object.keys(ICONS);
