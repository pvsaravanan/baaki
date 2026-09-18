"use client";
import { useState } from "react";
import { type Bank } from "@/lib/banks";
import { BANK_LOGOS } from "./bank-logo-assets";

/**
 * Real bank logos are bundled from src/assets/banks and served locally.
 * SVG assets stay sharp at every display size without a logo API or
 * favicon service. Missing assets use the existing generated monogram
 * badge rather than requesting an external image.
 */
function sourceUrl(id: string): string | null {
  // Static imports let Next.js emit and fingerprint the supplied SVG files.
  const logo = BANK_LOGOS[id];
  // Keep a fallback for banks without a supplied asset.
  if (!logo) return null;
  // Next.js supplies image metadata; other asset loaders may supply a URL.
  return typeof logo === "string" ? logo : logo.src;
}

/** Lightens (positive) or darkens (negative) a "#rrggbb" color by `percent` (0-1). */
function shade(hex: string, percent: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const mix = (c: number) => Math.round((t - c) * p) + c;
  return `#${((1 << 24) + (mix(r) << 16) + (mix(g) << 8) + mix(b)).toString(16).slice(1)}`;
}

/** Flat monogram badge — only shown if the local logo is missing or fails. */
function MonogramFallback({ bank, size }: { bank: Bank; size: number }) {
  const from = shade(bank.color, 0.14);
  const to = shade(bank.color, -0.2);
  const fontSize = bank.monogram.length > 4 ? size * 0.24 : size * 0.32;

  return (
    <span
      className="flex shrink-0 items-center justify-center font-bold uppercase leading-none tracking-wide text-white"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        fontSize: Math.max(8, Math.round(fontSize)),
      }}
      role="img"
      aria-label={bank.name}
    >
      {bank.monogram}
    </span>
  );
}

/**
 * Renders a bank's supplied SVG logo from the local asset bundle,
 * falling back to a monogram tile in the bank's brand color when the
 * asset is missing or fails to load, so an account never renders blank.
 */
export function BankLogo({ bank, size = 40 }: { bank: Bank; size?: number }) {
  return <BankLogoImage key={`${bank.id}:${size}`} bank={bank} size={size} />;
}

function BankLogoImage({ bank, size }: { bank: Bank; size: number }) {
  const [failed, setFailed] = useState(false);
  // SVG artwork scales directly to the display size without raster upscaling.
  // Load only local assets; no external provider fallback is needed.
  const src = sourceUrl(bank.id);

  if (!src || failed) return <MonogramFallback bank={bank} size={size} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- bundled SVGs need no raster optimization
    <img
      key={src}
      src={src}
      alt={`${bank.name} logo`}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}
