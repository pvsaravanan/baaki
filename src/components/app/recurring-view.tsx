"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpDown,
  ArrowUpRight,
  CalendarClock,
  MoreVertical,
  Pause,
  Play,
  Plus,
  SkipForward,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge, EmptyState } from "@/components/ui/misc";
import { SelectMenu } from "@/components/ui/select-menu";
import { useToast } from "@/components/ui/toast";
import { SwipeActions } from "@/components/ui/swipe-actions";
import { useConfirm } from "@/components/ui/confirm";
import { ActionMenu, ActionMenuItem } from "@/components/ui/action-menu";
import { Money } from "@/components/money";
import { CategoryIcon } from "@/components/app/category-icon";
import { SectionIcon } from "@/components/app/section-icon";
import { RecurringForm } from "./recurring-form";
import { useAppData, useLookups } from "./app-data";
import { apiDelete, apiPatch, apiPost } from "@/lib/http";
import { fromISODate, formatDate, toISODate } from "@/lib/dates";
import { FREQUENCY_LABELS, type Frequency } from "@/lib/constants";
import { formatINR } from "@/lib/money";
import { expectedPerMonth, RECURRING_SORTS, sortRules, type RecurringSort } from "@/lib/recurring-summary";
import type { RecurringDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

const TYPE_TONE: Record<RecurringDTO["type"], "income" | "expense" | "muted"> = {
  income: "income",
  expense: "expense",
  transfer: "muted",
};

const TYPE_BADGE: Record<RecurringDTO["type"], "income" | "expense" | "neutral"> = {
  income: "income",
  expense: "expense",
  transfer: "neutral",
};

const TYPE_LABEL: Record<RecurringDTO["type"], string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

function frequencyLabel(frequency: Frequency, interval: number): string {
  if (interval <= 1) return FREQUENCY_LABELS[frequency];
  const unit: Record<Frequency, string> = {
    daily: "days",
    weekly: "weeks",
    monthly: "months",
    quarterly: "quarters",
    yearly: "years",
  };
  return `Every ${interval} ${unit[frequency]}`;
}

export function RecurringView({ recurring }: { recurring: RecurringDTO[] }) {
  const [rules, setRules] = useState<RecurringDTO[]>(recurring);
  // Resync when the loaded prop changes — see the identical note in
  // CategoriesView; without this the list stays stale until a full reload.
  useEffect(() => setRules(recurring), [recurring]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"active" | "paused">("active");
  const [sort, setSort] = useState<RecurringSort>("next");

  const active = useMemo(() => rules.filter((r) => r.isActive), [rules]);
  const paused = useMemo(() => rules.filter((r) => !r.isActive), [rules]);
  const shown = useMemo(() => sortRules(tab === "active" ? active : paused, sort), [tab, active, paused, sort]);
  const expected = useMemo(() => expectedPerMonth(rules, toISODate(new Date())), [rules]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(rule: RecurringDTO) {
    setEditing(rule);
    setModalOpen(true);
  }

  return (
    <div className="space-y-3">
      {rules.length === 0 ? (
        <div className="rounded-xl border border-border/25">
          <EmptyState
            illustration={<SectionIcon section="recurring" size={56} />}
            title="No recurring rules yet"
            description="Set up bills, subscriptions and income you expect every period, and baaki will keep track of them."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                New recurring
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <ExpectedCard
              label="Expected income"
              amount={expected.income}
              tone="text-income"
              icon={<ArrowUpRight aria-hidden className="h-5 w-5 shrink-0 text-income" />}
            />
            <ExpectedCard
              label="Expected expenses"
              amount={expected.expense}
              tone="text-expense"
              icon={<ArrowDownRight aria-hidden className="h-5 w-5 shrink-0 text-expense" />}
            />
          </div>

          <div role="tablist" aria-label="Recurring status" className="flex gap-1 rounded-full border border-border/20 bg-surface-2/60 p-1">
            {(
              [
                { value: "active", label: "Active", count: active.length },
                { value: "paused", label: "Paused", count: paused.length },
              ] as const
            ).map(({ value, label, count }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={cn(
                  "flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-sm font-bold transition-colors",
                  tab === value ? "bg-brand text-brand-fg" : "text-fg",
                )}
              >
                {label}
                <span className="tnum flex h-5 min-w-5 items-center justify-center rounded-full bg-surface/50 px-1 text-xs">{count}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <SelectMenu
              soft
              // No room for it beside "Next occurrence" on the narrowest phones.
              icon={<ArrowUpDown aria-hidden className="hidden h-4 w-4 shrink-0 min-[380px]:block" />}
              ariaLabel="Sort by"
              value={sort}
              onChange={(v) => setSort(v as RecurringSort)}
              options={RECURRING_SORTS}
              className="min-w-0 flex-1 sm:max-w-[14rem]"
            />
            <Button onClick={openCreate} className="ml-auto shrink-0 !rounded-lg !px-3">
              <Plus className="h-4 w-4" />
              New recurring
            </Button>
          </div>

          {shown.length === 0 ? (
            <p className="py-6 text-center text-body-sm text-muted">
              {tab === "active" ? "Nothing is running right now." : "Nothing is paused."}
            </p>
          ) : (
            <ul className="space-y-2">
              {shown.map((rule) => (
                <RecurringRow key={rule.id} rule={rule} onEdit={openEdit} onChange={setRules} />
              ))}
            </ul>
          )}
        </>
      )}

      <Modal
        open={modalOpen}
        fullScreen
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit recurring" : "New recurring"}
        busy={busy}
      >
        <RecurringForm
          initial={editing ?? undefined}
          onSaved={(list) => {
            setRules(list);
            setModalOpen(false);
          }}
          onCancel={() => setModalOpen(false)}
          onBusyChange={setBusy}
        />
      </Modal>
    </div>
  );
}

function ExpectedCard({ label, amount, tone, icon }: { label: string; amount: number; tone: string; icon: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border p-3 [container-type:inline-size]">
      <div className="flex items-start gap-1.5">
        {icon}
        <p className="min-w-0 text-xs leading-tight text-muted">{label}</p>
      </div>
      {/* Fluid size, so a large amount fits the card instead of wrapping. */}
      <p className={cn("tnum mt-1.5 whitespace-nowrap font-bold text-[clamp(0.95rem,11cqi,1.35rem)]", tone)}>{formatINR(amount)}</p>
      <p className="text-2xs text-muted">per month</p>
    </div>
  );
}

function RecurringRow({
  rule,
  onEdit,
  onChange,
}: {
  rule: RecurringDTO;
  onEdit: (rule: RecurringDTO) => void;
  onChange: (list: RecurringDTO[]) => void;
}) {
  const { refresh } = useAppData();
  const { accountName, category } = useLookups();
  const toast = useToast();
  const confirm = useConfirm();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isTransfer = rule.type === "transfer";
  const cat = rule.categoryId ? category(rule.categoryId) : null;
  const nextDate = fromISODate(rule.nextOccurrence);

  const where = isTransfer
    ? `${accountName(rule.accountId)} → ${accountName(rule.transferAccountId)}`
    : accountName(rule.accountId);

  async function run(action: () => Promise<{ recurring: RecurringDTO[] }>, success: string, failure: string) {
    setMenuOpen(false);
    setBusy(true);
    try {
      const res = await action();
      onChange(res.recurring);
      refresh();
      toast.success(success);
    } catch {
      toast.error(failure);
    } finally {
      setBusy(false);
    }
  }

  function rulePayload(r: RecurringDTO) {
    return {
      name: r.name,
      type: r.type,
      amount: r.amount,
      categoryId: r.categoryId,
      accountId: r.accountId,
      transferAccountId: r.transferAccountId,
      notes: r.notes,
      frequency: r.frequency,
      interval: r.interval,
      startDate: r.startDate,
      endDate: r.endDate,
      autoPost: r.autoPost,
      isActive: r.isActive,
    };
  }

  const onPostNow = () =>
    run(
      () => apiPost<{ recurring: RecurringDTO[] }>(`/api/recurring/${rule.id}/post`),
      `Posted "${rule.name}" and advanced the schedule`,
      "Could not post this occurrence",
    );

  const onSkip = () =>
    run(
      () => apiPost<{ recurring: RecurringDTO[] }>(`/api/recurring/${rule.id}/skip`),
      "Skipped to the next occurrence",
      "Could not skip this occurrence",
    );

  const onToggleActive = () =>
    run(
      () =>
        apiPatch<{ recurring: RecurringDTO[] }>(`/api/recurring/${rule.id}`, {
          ...rulePayload(rule),
          isActive: !rule.isActive,
        }),
      rule.isActive ? "Recurring paused" : "Recurring resumed",
      "Could not update this recurring",
    );

  async function onDelete() {
    setMenuOpen(false);
    const ok = await confirm({
      title: "Delete recurring?",
      message: `"${rule.name}" will be removed. Transactions already posted are kept.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    await run(
      () => apiDelete<{ recurring: RecurringDTO[] }>(`/api/recurring/${rule.id}`),
      "Recurring deleted",
      "Could not delete this recurring",
    );
  }

  return (
    <SwipeActions
      as="li"
      name={rule.name}
      enabled={!busy}
      onEdit={() => onEdit(rule)}
      onDelete={onDelete}
      className="rounded-xl border border-border"
      contentClassName={cn("flex items-center gap-2.5 py-2.5 pl-3 pr-1 transition-opacity", busy && "opacity-50", !rule.isActive && "opacity-70")}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
        {isTransfer ? <ArrowLeftRight className="h-7 w-7 text-muted" /> : <CategoryIcon icon={cat?.icon} size={38} />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-fg">{rule.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {frequencyLabel(rule.frequency, rule.interval)} · {where}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-2xs text-muted">
          <CalendarClock aria-hidden className="h-3 w-3 shrink-0" />
          {rule.isActive ? "Next" : "Was due"} {nextDate ? formatDate(nextDate, { withYear: false }) : "—"}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <Money paise={rule.amount} tone={TYPE_TONE[rule.type]} className="text-sm font-bold" />
        <div className="flex items-center gap-1">
          {rule.autoPost && (
            <span className="inline-flex items-center gap-0.5 rounded bg-brand-soft px-1.5 py-0.5 text-2xs font-medium text-brand-hover">
              <Zap aria-hidden className="h-3 w-3" />
              Auto
            </span>
          )}
          <Badge tone={TYPE_BADGE[rule.type]}>{TYPE_LABEL[rule.type]}</Badge>
        </div>
      </div>

      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          disabled={busy}
          className="flex h-10 w-8 items-center justify-center text-fg"
          aria-label={`More for ${rule.name}`}
        >
          <MoreVertical className="h-5 w-5" />
        </button>
        <ActionMenu open={menuOpen} onClose={() => setMenuOpen(false)} width={176} label={`Actions for ${rule.name}`}>
          <ActionMenuItem icon={<Zap className="h-4 w-4" />} onClick={onPostNow}>
            Post now
          </ActionMenuItem>
          <ActionMenuItem icon={<SkipForward className="h-4 w-4" />} onClick={onSkip}>
            Skip next
          </ActionMenuItem>
          <ActionMenuItem
            icon={rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            onClick={onToggleActive}
          >
            {rule.isActive ? "Pause" : "Resume"}
          </ActionMenuItem>
        </ActionMenu>
      </div>
    </SwipeActions>
  );
}
