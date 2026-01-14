"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchJson } from "@/lib/api";
import type { Tag } from "@/lib/types";

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await fetchJson<Tag[]>("/tags");
      setTags(data);
    } catch (error) {
      setMessage("Failed to load tags.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createTag = async () => {
    setMessage(null);
    try {
      await fetchJson<Tag>("/tags", {
        method: "POST",
        body: JSON.stringify({ name: newName })
      });
      setNewName("");
      load();
    } catch (error) {
      setMessage("Failed to create tag.");
    }
  };

  const renameTag = async (id: string, name: string) => {
    setMessage(null);
    try {
      await fetchJson<Tag>(`/tags/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name })
      });
      load();
    } catch (error) {
      setMessage("Failed to rename tag.");
    }
  };

  const deleteTag = async (id: string) => {
    setMessage(null);
    try {
      await fetchJson(`/tags/${id}`, { method: "DELETE" });
      load();
    } catch (error) {
      setMessage("Failed to delete tag.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tags" description="Create, rename, and remove tags." />

      <SectionCard title="Add tag">
        <form
          className="flex flex-wrap items-center gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            createTag();
          }}
        >
          <Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="New tag name" />
          <Button type="submit">Add</Button>
        </form>
      </SectionCard>

      <SectionCard title="Manage tags">
        <div className="space-y-3">
          {tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} onRename={renameTag} onDelete={deleteTag} />
          ))}
          {tags.length === 0 ? <p className="text-sm text-muted-foreground">No tags yet.</p> : null}
        </div>
      </SectionCard>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

function TagRow({
  tag,
  onRename,
  onDelete
}: {
  tag: Tag;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(tag.name);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border px-4 py-3">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onRename(tag.id, name);
          }
        }}
        className="max-w-xs"
      />
      <Button variant="destructive" onClick={() => onDelete(tag.id)}>
        Delete
      </Button>
    </div>
  );
}
