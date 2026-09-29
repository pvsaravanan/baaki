/**
 * The colours a category can have. Each category keeps its own colour, and
 * every chart and list uses it — so a category looks the same everywhere and
 * from month to month. The palette is the built-in categories' 19 curated
 * tones plus 11 more in the same warm, muted style (each clearly apart from
 * the rest — CIE ΔE ≥ 12 to its nearest neighbour), readable on both themes.
 */
import { DEFAULT_CATEGORIES } from "./constants";

const NAMES: Record<string, string> = {
  "#8c5a3c": "Walnut",
  "#d88060": "Clay coral",
  "#7d8c4a": "Olive",
  "#4f7a72": "Teal slate",
  "#4a6785": "Muted indigo",
  "#b84b3a": "Brick",
  "#a4566e": "Plum",
  "#c96f4f": "Burnt clay",
  "#6d5b8c": "Dusty violet",
  "#5a7a8c": "Slate blue",
  "#3f7d6e": "Pine",
  "#c9942f": "Ochre",
  "#96604f": "Rosewood",
  "#6b6b63": "Stone",
  "#2c6b4f": "Deep green",
  "#3f6b6b": "Deep teal",
  "#557a3f": "Moss",
  "#4f8060": "Fern",
  "#8a8578": "Warm grey",
  // Extra tones, beyond the built-in categories' colours.
  "#c47a7a": "Dusty rose",
  "#b89b6e": "Sand",
  "#8e6b87": "Mauve",
  "#7fa2ba": "Steel blue",
  "#5e3a55": "Aubergine",
  "#5f9e8f": "Sea green",
  "#8a9a6b": "Sage",
  "#4a4845": "Charcoal",
  "#8c2f3e": "Cranberry",
  "#9585b0": "Lavender",
  "#e3a587": "Peach",
};

const EXTRA_COLORS = [
  "#c47a7a", "#b89b6e", "#8e6b87", "#7fa2ba", "#5e3a55",
  "#5f9e8f", "#8a9a6b", "#4a4845", "#8c2f3e", "#9585b0",
  "#e3a587",
];

export const CATEGORY_COLORS: { hex: string; name: string }[] = [
  ...DEFAULT_CATEGORIES.map((c) => c.color),
  ...EXTRA_COLORS,
].map((hex) => ({ hex, name: NAMES[hex] ?? hex }));

export function categoryColorName(hex: string): string {
  return NAMES[hex.toLowerCase()] ?? "Custom";
}

/**
 * The palette colour fewest categories use (earliest in the palette on a
 * tie), so a new category doesn't clash with existing ones until every
 * colour is taken.
 */
export function leastUsedColor(usedColors: string[]): string {
  const counts = new Map(CATEGORY_COLORS.map((c) => [c.hex, 0]));
  for (const hex of usedColors) {
    const key = hex.toLowerCase();
    if (counts.has(key)) counts.set(key, counts.get(key)! + 1);
  }
  let best = CATEGORY_COLORS[0].hex;
  for (const { hex } of CATEGORY_COLORS) if (counts.get(hex)! < counts.get(best)!) best = hex;
  return best;
}
