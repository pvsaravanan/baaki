import Image, { getImageProps } from "next/image";
import { isSilhouetteIcon, resolveCategoryIcon, type CategoryIconKey } from "@/lib/category-icons";
import { CATEGORY_ICON_IMAGES } from "./category-icon-assets";
import { cn } from "@/lib/cn";

/**
 * A category's illustrated icon. Accepts whatever is stored on the category
 * (current key, legacy line-icon name, or nothing) and resolves it. The
 * source PNGs are 512px, so next/image serves a copy sized to `size`.
 *
 * The illustrations have black outlines and a few are solid black shapes,
 * which vanish on the dark theme — there a hairline parchment halo traces
 * the drawing's own edge (no background tile) so they stay legible, and the
 * all-black silhouettes are inverted to light ink.
 */
export function CategoryIcon({
  icon,
  size = 20,
  className,
}: {
  icon: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const key = resolveCategoryIcon(icon);
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={CATEGORY_ICON_IMAGES[key]}
        alt=""
        width={size}
        height={size}
        draggable={false}
        className={cn(
          "h-full w-full select-none object-contain",
          isSilhouetteIcon(key)
            ? "dark:invert"
            : "dark:[filter:drop-shadow(0_0_0.6px_#f4f1ea)_drop-shadow(0_0_0.6px_#f4f1ea)]",
        )}
      />
    </span>
  );
}

/** Optimized image URL for a category icon, for use inside SVG (`<image href>`). */
export function categoryIconSrc(icon: string | null | undefined, size: number): string {
  const key: CategoryIconKey = resolveCategoryIcon(icon);
  return getImageProps({ src: CATEGORY_ICON_IMAGES[key], alt: "", width: size, height: size }).props.src;
}
