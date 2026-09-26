import { Icon } from "@/components/icon";
import { getBankByIcon } from "@/lib/banks";
import type { AccountDTO } from "@/lib/types";
import { BankLogo } from "../bank-logo";

export function AccountIcon({ account }: { account: AccountDTO }) {
  const bank = account.type === "bank" ? getBankByIcon(account.icon) : undefined;
  if (bank) return <BankLogo bank={bank} size={40} />;
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none"
      style={{ color: account.color }}
    >
      <Icon name={account.icon} size={22} />
    </span>
  );
}
