"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchJson } from "@/lib/api";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await fetchJson<Category[]>("/categories");
      setCategories(data);
    } catch (error) {
      setMessage("Failed to load categories.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createCategory = async () => {
    setMessage(null);
    try {
      await fetchJson<Category>("/categories", {
        method: "POST",
        body: JSON.stringify({ name: newName })
      });
      setNewName("");
      load();
    } catch (error) {
      setMessage("Failed to create category.");
    }
  };

  const renameCategory = async (id: string, name: string) => {
    setMessage(null);
    try {
      await fetchJson<Category>(`/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name })
      });
      load();
    } catch (error) {
      setMessage("Failed to rename category.");
    }
  };

  const deleteCategory = async (id: string) => {
    setMessage(null);
    try {
      await fetchJson(`/categories/${id}`, { method: "DELETE" });
      load();
    } catch (error) {
      setMessage("Failed to delete category.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Categories" description="Create, rename, and remove categories." />

      <SectionCard title="Add category">
        <form
          className="flex flex-wrap items-center gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            createCategory();
          }}
        >
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="New category name"
          />
          <Button type="submit">Add</Button>
        </form>
      </SectionCard>

      <SectionCard title="Manage categories">
        <div className="space-y-3">
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} onRename={renameCategory} onDelete={deleteCategory} />
          ))}
          {categories.length === 0 ? <p className="text-sm text-muted-foreground">No categories yet.</p> : null}
        </div>
      </SectionCard>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

function CategoryRow({
  category,
  onRename,
  onDelete
}: {
  category: Category;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(category.name);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border px-4 py-3">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onRename(category.id, name);
          }
        }}
        className="max-w-xs"
      />
      <Button variant="destructive" onClick={() => onDelete(category.id)}>
        Delete
      </Button>
    </div>
  );
}
