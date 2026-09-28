import { getBankByIcon } from "@/lib/banks";
import type { AccountDTO } from "@/lib/types";
import { BankLogo } from "../bank-logo";
import { CategoryIcon } from "../category-icon";

/** A picked bank shows its logo; every other account its illustrated icon. */
export function AccountIcon({ account, size = 40 }: { account: Pick<AccountDTO, "type" | "icon">; size?: number }) {
  const bank = account.type === "bank" ? getBankByIcon(account.icon) : undefined;
  if (bank) return <BankLogo bank={bank} size={size} />;
  return <CategoryIcon icon={account.icon} size={size} />;
}
