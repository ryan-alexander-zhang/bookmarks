"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/tag-input";
import { fetchJson } from "@/lib/api";
import type { Bookmark, Category, Tag } from "@/lib/types";

interface BookmarkFormProps {
  initialData?: Bookmark;
  onSuccess?: (bookmark: Bookmark) => void;
  submitLabel: string;
  footerActions?: React.ReactNode;
}

export function BookmarkForm({ initialData, onSuccess, submitLabel, footerActions }: BookmarkFormProps) {
  const [url, setUrl] = useState(initialData?.url || "");
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category, setCategory] = useState(initialData?.categoryName || "");
  const [tags, setTags] = useState(initialData?.tags.map((tag) => tag.name) || []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataMessage, setMetadataMessage] = useState<string | null>(null);
  const [titleEdited, setTitleEdited] = useState(Boolean(initialData?.title));
  const [descriptionEdited, setDescriptionEdited] = useState(Boolean(initialData?.description));
  const lastFetchedUrl = useRef<string | null>(null);

  useEffect(() => {
    Promise.all([fetchJson<Category[]>("/categories"), fetchJson<Tag[]>("/tags")])
      .then(([categoryData, tagData]) => {
        setCategories(categoryData);
        setAvailableTags(tagData);
      })
      .catch(() => undefined);
  }, []);

  const fetchMetadata = async () => {
    if (initialData || !url) {
      return;
    }
    if (lastFetchedUrl.current === url) {
      return;
    }

    setMetadataLoading(true);
    setMetadataMessage(null);
    try {
      const data = await fetchJson<{
        found: boolean;
        normalizedUrl: string;
        title: string;
        description: string;
        category?: string | null;
        tags?: Array<{ id?: string; name: string }>;
        bookmarkId?: string;
      }>(`/bookmarks/lookup?url=${encodeURIComponent(url)}`);

      lastFetchedUrl.current = url;

      if (!titleEdited && data.title) {
        setTitle(data.title);
      }
      if (!descriptionEdited && data.description) {
        setDescription(data.description);
      }
      if (data.found) {
        setCategory(data.category || "");
        setTags(data.tags ? data.tags.map((tag) => tag.name) : []);
      }
    } catch (error) {
      setMetadataMessage("Failed to fetch metadata.");
    } finally {
      setMetadataLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        url,
        title,
        description,
        category: category || "",
        tags
      };

      const data = initialData
        ? await fetchJson<Bookmark>(`/bookmarks/${initialData.id}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          })
        : await fetchJson<Bookmark>("/bookmarks", {
            method: "POST",
            body: JSON.stringify(payload)
          });

      setMessage("Saved successfully.");
      onSuccess?.(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onBlur={fetchMetadata}
          required
        />
        {metadataLoading ? <p className="text-xs text-muted-foreground">Fetching metadata...</p> : null}
        {metadataMessage ? <p className="text-xs text-destructive">{metadataMessage}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(event) => {
            setTitleEdited(true);
            setTitle(event.target.value);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(event) => {
            setDescriptionEdited(true);
            setDescription(event.target.value);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          list="category-list"
          value={category || ""}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Optional"
        />
        <datalist id="category-list">
          {categories.map((item) => (
            <option key={item.id} value={item.name} />
          ))}
        </datalist>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <TagInput value={tags} onChange={setTags} />
        {availableTags.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Suggestions: {availableTags.map((tag) => tag.name).join(" ")}
          </p>
        ) : null}
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
        {footerActions}
      </div>
    </form>
  );
}
