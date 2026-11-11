"use client";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

/** Rounded, flat buttons: a solid fill or a soft outline, and a light press. */
const PRESS = "active:scale-[0.98]";

const VARIANTS: Record<Variant, string> = {
  primary: `bg-brand text-brand-fg border border-border hover:bg-brand-hover ${PRESS}`,
  secondary: `bg-brand-soft/50 text-fg border border-border/25 hover:bg-brand-soft ${PRESS}`,
  outline: `bg-transparent text-fg border border-border hover:bg-surface-2 ${PRESS}`,
  ghost: "bg-transparent text-muted hover:text-fg hover:underline underline-offset-4 decoration-2",
  danger: `bg-expense text-white border border-expense hover:bg-expense/85 ${PRESS}`,
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-body-sm gap-1.5 rounded-lg",
  md: "h-11 px-5 text-body-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-body-md font-bold gap-2 rounded-xl",
  icon: "h-10 w-10 rounded-xl",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-bold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
