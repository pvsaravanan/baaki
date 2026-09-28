/**
 * Category icon keys — each is the filename (minus `.png`) of an illustration
 * in src/assets/icons. Kept free of image imports so the server (validation,
 * seeding) and tests can use it; the key → image map lives in
 * components/app/category-icon-assets.ts. Ordered by theme for the picker.
 */
export const CATEGORY_ICON_KEYS = [
  // Food & drink
  "biryani", "burger", "ramen", "snack", "diet", "fruit", "vegetable", "groceries",
  "cafe", "coffee", "drink", "delivery",
  // Shopping & personal
  "shopping-bag", "shopping-cart", "online-shopping", "male-clothes", "sneakers",
  "accessories", "cream", "personal-hygiene", "giftbox", "electronic-devices",
  "laptop", "mobile-phone",
  // Home, bills & digital
  "house", "utilities", "bill", "subscription", "application", "digital", "platform", "browsing",
  // Getting around
  "car", "taxi", "bus", "electric-train", "motorcycle", "gas-pump", "parking-car", "toll",
  // Travel
  "airplane", "airplane-ticket", "travel", "travel-luggage", "cruise", "ship",
  // Health & fitness
  "healthcare", "health-check", "injection", "insurance", "family-insurance",
  "dumbbell", "weightlifter", "running",
  // Fun
  "cinema", "music", "game-controller", "happy",
  // Learning
  "education", "graduation", "notebook",
  // Money & work
  "money-sack", "dollars", "payment", "profits", "accounting", "report",
  "asset-utilization", "suitcase",
  // Pets
  "paws", "pet-food",
  // Other
  "more", "menu",
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

export const DEFAULT_CATEGORY_ICON: CategoryIconKey = "more";

const KEY_SET: ReadonlySet<string> = new Set(CATEGORY_ICON_KEYS);

/**
 * Categories saved before the illustrated set used line-icon names. Those rows
 * are still in the database, so they're mapped onto the closest new icon at
 * read time; saving the category from the form stores the new key.
 */
const LEGACY_ICONS: Readonly<Record<string, CategoryIconKey>> = {
  home: "house",
  utensils: "biryani",
  "shopping-basket": "groceries",
  car: "car",
  "graduation-cap": "graduation",
  "heart-pulse": "healthcare",
  heart: "health-check",
  clapperboard: "cinema",
  "shopping-bag": "shopping-bag",
  repeat: "subscription",
  receipt: "bill",
  plane: "airplane",
  user: "personal-hygiene",
  users: "family-insurance",
  landmark: "payment",
  wallet: "money-sack",
  briefcase: "suitcase",
  "trending-up": "profits",
  "plus-circle": "dollars",
  banknote: "dollars",
  smartphone: "mobile-phone",
  wifi: "utilities",
  "circle-dot": "more",
  tag: "more",
  target: "more",
};

export function isCategoryIcon(value: string): value is CategoryIconKey {
  return KEY_SET.has(value);
}

/** The icon to show for a stored value — a current key, a legacy name, or nothing. */
export function resolveCategoryIcon(value: string | null | undefined): CategoryIconKey {
  if (!value) return DEFAULT_CATEGORY_ICON;
  if (isCategoryIcon(value)) return value;
  return LEGACY_ICONS[value] ?? DEFAULT_CATEGORY_ICON;
}

/** "shopping-bag" → "Shopping bag", for accessible labels in the picker. */
export function categoryIconLabel(key: CategoryIconKey): string {
  const words = key.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
