"use client";

import { useCallback } from "react";
import { ManageNameList } from "@/components/manage-name-list";
import { fetchJson } from "@/lib/api";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  const fetchCategories = useCallback(() => fetchJson<Category[]>("/categories"), []);

  const createCategory = useCallback(
    async (name: string) => {
      await fetchJson<Category>("/categories", {
        method: "POST",
        body: JSON.stringify({ name })
      });
    },
    []
  );

  const renameCategory = useCallback(
    async (id: string, name: string) => {
      await fetchJson<Category>(`/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name })
      });
    },
    []
  );

  const deleteCategory = useCallback(async (id: string) => {
    await fetchJson(`/categories/${id}`, { method: "DELETE" });
  }, []);

  return (
    <ManageNameList
      title="Categories"
      description="Create, rename, and remove categories."
      entityLabel="Category"
      entityPluralLabel="Categories"
      inputPlaceholder="New category name"
      searchPlaceholder="Search categories"
      fetchItems={fetchCategories}
      createItem={createCategory}
      renameItem={renameCategory}
      deleteItem={deleteCategory}
    />
  );
}
