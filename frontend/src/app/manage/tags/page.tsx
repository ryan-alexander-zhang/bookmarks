"use client";

import { useCallback } from "react";
import { ManageNameList } from "@/components/manage-name-list";
import { fetchJson } from "@/lib/api";
import type { Tag } from "@/lib/types";

export default function TagsPage() {
  const fetchTags = useCallback(() => fetchJson<Tag[]>("/tags"), []);

  const createTag = useCallback(
    async (name: string) => {
      await fetchJson<Tag>("/tags", {
        method: "POST",
        body: JSON.stringify({ name })
      });
    },
    []
  );

  const renameTag = useCallback(
    async (id: string, name: string) => {
      await fetchJson<Tag>(`/tags/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name })
      });
    },
    []
  );

  const deleteTag = useCallback(async (id: string) => {
    await fetchJson(`/tags/${id}`, { method: "DELETE" });
  }, []);

  return (
    <ManageNameList
      title="Tags"
      description="Create, rename, and remove tags."
      entityLabel="Tag"
      entityPluralLabel="Tags"
      inputPlaceholder="New tag name"
      searchPlaceholder="Search tags"
      fetchItems={fetchTags}
      createItem={createTag}
      renameItem={renameTag}
      deleteItem={deleteTag}
    />
  );
}
