import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { ApiError, apiPost } from "@/lib/http";

/**
 * Undo a settled share: asks first, then makes it owed again (and takes back
 * the money entry recorded when it was settled). Resolves true when it was undone.
 */
export function useUnsettle() {
  const confirm = useConfirm();
  const toast = useToast();

  return async function unsettle(share: { id: string; description: string }): Promise<boolean> {
    const ok = await confirm({
      title: "Undo this settlement?",
      message: `"${share.description}" will be marked as not settled again. If the money was recorded in an account when you settled it, that entry is taken back out.`,
      confirmLabel: "Undo settlement",
    });
    if (!ok) return false;
    try {
      await apiPost(`/api/shares/${share.id}/unsettle`);
      toast.success("Settlement undone");
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not undo the settlement. Please try again.");
      return false;
    }
  };
}
