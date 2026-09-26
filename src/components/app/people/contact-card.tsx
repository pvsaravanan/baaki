import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { Money } from "@/components/money";
import type { ContactDTO } from "@/lib/types";
import { cn } from "@/lib/cn";
import { ContactShares } from "./contact-shares";

export function ContactCard({
  contact,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onSettled,
}: {
  contact: ContactDTO;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSettled: () => void;
}) {
  const initials = contact.name.slice(0, 2).toUpperCase();
  return (
    <li className={cn("rounded-none border border-border bg-surface", contact.isArchived && "opacity-70")}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none text-sm font-semibold"
          style={{ color: contact.color, borderColor: contact.color }}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-fg">{contact.name}</p>
            {contact.isArchived && <Badge tone="neutral">Archived</Badge>}
          </div>
          <p className="text-xs text-muted">
            {contact.net > 0 ? "Owes you" : contact.net < 0 ? "You owe" : "All settled up"}
          </p>
        </div>
        {contact.net !== 0 && (
          <Money paise={Math.abs(contact.net)} tone={contact.net > 0 ? "income" : "expense"} className="text-base font-semibold" />
        )}
        {expanded ? <ChevronUp className="h-4 w-4 text-faint" /> : <ChevronDown className="h-4 w-4 text-faint" />}
      </button>

      {expanded && (
        <div className="border-t border-border p-4 pt-3">
          <div className="mb-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-expense" />
              Remove
            </Button>
          </div>
          <ContactShares contact={contact} onSettled={onSettled} />
        </div>
      )}
    </li>
  );
}
