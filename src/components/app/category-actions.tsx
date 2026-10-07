"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { useAppData } from "./app-data";
import { CategoryForm } from "./category-form";
import { ApiError, apiDelete } from "@/lib/http";
import type { CategoryDTO } from "@/lib/types";

/**
 * Asks before deleting a category, then deletes it. Resolves with the updated
 * category list (and whether it was only deactivated because transactions
 * still use it), or null when the user backed out or the request failed.
 */
export function useDeleteCategory() {
  const toast = useToast();
  const confirm = useConfirm();
  const { refresh } = useAppData();

  return async function deleteCategory(c: CategoryDTO) {
    const ok = await confirm({
      title: `Delete ${c.name}?`,
      message:
        "This removes the category. If any transactions use it, they will be kept and the category deactivated instead.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return null;
    try {
      const res = await apiDelete<{ detached: boolean; categories: CategoryDTO[] }>(`/api/categories/${c.id}`);
      refresh();
      toast.success(res.detached ? `${c.name} deactivated (transactions kept)` : `${c.name} deleted`);
      return res;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete this category.");
      return null;
    }
  };
}

/** Edit and Delete for the category page. */
export function CategoryActions({ category }: { category: CategoryDTO }) {
  const router = useRouter();
  const toast = useToast();
  const { refresh } = useAppData();
  const deleteCategory = useDeleteCategory();
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    const res = await deleteCategory(category);
    // Deactivated rather than removed: the page is still there, just updated.
    if (res && !res.detached) router.replace("/categories");
  }

  return (
    <>
      <div className="flex w-full gap-2 sm:w-auto">
        <Button variant="outline" onClick={() => setEditOpen(true)} className="flex-1 sm:flex-none">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button variant="outline" onClick={onDelete} className="flex-1 !text-expense sm:flex-none">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit category" busy={busy}>
        <CategoryForm
          key={category.id}
          initial={category}
          onSaved={() => {
            refresh();
            toast.success("Category updated");
            setEditOpen(false);
          }}
          onCancel={() => setEditOpen(false)}
          onBusyChange={setBusy}
        />
      </Modal>
    </>
  );
}
