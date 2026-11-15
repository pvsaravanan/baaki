"use client";
import { BackButton } from "./back-button";
import { useBannerRegistration } from "./topbar-slot";
import { UserMenu } from "./user-menu";

/**
 * The header of a screen that has no month picker. On a phone it stands in for
 * the top bar: the back arrow and title sit level with your picture, with the
 * illustration beneath it, so no empty strip is left above the page. From `md`
 * up the top bar is back and the picture isn't repeated here.
 */
export function PageBanner({
  title,
  subtitle,
  art,
  back = true,
  children,
}: {
  title: string;
  subtitle?: string;
  art?: React.ReactNode;
  /** False on the main tabs, which have no screen to go back to. */
  back?: boolean;
  /** Sits under the subtitle, e.g. a button for the screen. */
  children?: React.ReactNode;
}) {
  useBannerRegistration();
  return (
    <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
      <div className="min-w-0">
        <div className="flex min-h-10 items-center gap-1">
          {back && <BackButton />}
          <h1 className="min-w-0 text-headline-md text-fg sm:text-headline-lg">{title}</h1>
        </div>
        {subtitle && <p className="mt-1 text-body-sm text-muted">{subtitle}</p>}
        {children}
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="md:hidden">
          <UserMenu />
        </div>
        {art}
      </div>
    </header>
  );
}
