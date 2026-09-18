import { BANK_ICON_PREFIX, getBankById } from "./banks";
import { toPaise } from "./money";
import { accountSchema, fieldErrors } from "./validation";

export const OTHER_BANK = "__other__";

export interface AccountFormValues {
  name: string;
  nickname: string;
  otherBankName: string;
  typeSelect: string;
  customType: string;
  bankId: string | null;
  balance: string;
  color: string;
  icon: string;
}

export function accountNameField(typeSelect: string, bankId: string | null): string {
  return typeSelect !== "bank" ? "name" : bankId === OTHER_BANK ? "otherBankName" : "nickname";
}

export function parseAccountForm(values: AccountFormValues) {
  const errors: Record<string, string> = {};
  const bank = values.typeSelect === "bank" && values.bankId ? getBankById(values.bankId) : undefined;
  const name = values.typeSelect !== "bank" ? values.name
    : bank ? values.nickname.trim() || bank.name : values.otherBankName;
  if (values.typeSelect === "bank" && !bank && values.bankId !== OTHER_BANK) {
    errors.bank = "Pick your bank (or choose \"other\")";
  }
  let openingBalance = 0;
  try {
    openingBalance = values.balance.trim() ? toPaise(values.balance) : 0;
  } catch {
    errors.openingBalance = "Enter a valid amount";
  }
  const result = accountSchema.safeParse({
    name,
    type: values.typeSelect === "__custom__" ? values.customType.trim().toLowerCase() : values.typeSelect,
    openingBalance,
    color: bank?.color ?? values.color,
    icon: bank ? BANK_ICON_PREFIX + bank.id : values.icon.startsWith(BANK_ICON_PREFIX) ? "landmark" : values.icon,
  });
  if (!result.success) {
    for (const [field, message] of Object.entries(fieldErrors(result.error))) {
      const key = field === "name" ? accountNameField(values.typeSelect, values.bankId) : field;
      errors[key] ??= message;
    }
  }
  return result.success && !Object.keys(errors).length
    ? { success: true as const, data: result.data }
    : { success: false as const, errors };
}
