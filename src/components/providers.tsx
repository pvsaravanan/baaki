"use client";
import { ToastProvider } from "./ui/toast";
import { ConfirmProvider } from "./ui/confirm";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}
