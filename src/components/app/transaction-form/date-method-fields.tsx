import { Field, Input } from "@/components/ui/field";
import { SelectMenu } from "@/components/ui/select-menu";
import { toISODate } from "@/lib/dates";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/constants";

/** Date picker, plus the payment method select (hidden for a transfer). */
export function DateMethodFields({
  date,
  setDate,
  isTransfer,
  methodSelect,
  setMethodSelect,
  customMethod,
  setCustomMethod,
}: {
  date: string;
  setDate: (v: string) => void;
  isTransfer: boolean;
  methodSelect: string;
  setMethodSelect: (v: string) => void;
  customMethod: string;
  setCustomMethod: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Date" htmlFor="date" className="col-span-2 sm:col-span-1">
        <Input id="date" type="date" value={date} max={toISODate(new Date())} onChange={(e) => setDate(e.target.value)} />
      </Field>

      {!isTransfer && (
        <div className="col-span-2 sm:col-span-1 space-y-1.5">
          <Field label="Payment method" htmlFor="method">
            <SelectMenu
              id="method"
              value={methodSelect}
              onChange={setMethodSelect}
              options={[
                ...PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] })),
                { value: "__custom__", label: "+ Custom payment type…" },
              ]}
            />
          </Field>
          {methodSelect === "__custom__" && (
            <Input placeholder="e.g. Sodexo, Forex, Crypto, Cheque" value={customMethod} onChange={(e) => setCustomMethod(e.target.value)} autoFocus />
          )}
        </div>
      )}
    </div>
  );
}
