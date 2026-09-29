import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BrandLockup } from "@/components/logo";
import { Masthead } from "./masthead";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="grid min-h-dvh lg:grid-cols-[885fr_793fr]">
      <Masthead />

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-xl">
        <div className="w-full max-w-sm">
          <div className="mb-lg lg:hidden">
            <BrandLockup />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

