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
  const [categoryQuery, setCategoryQuery] = useState(initialData?.categoryName || "");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryHighlight, setCategoryHighlight] = useState(0);
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

  const filteredCategories = categories
    .map((item) => item.name)
    .filter((name) => name.toLowerCase().includes(categoryQuery.trim().toLowerCase()))
    .slice(0, 6);

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
         const nextCategory = data.category || "";
         setCategory(nextCategory);
         setCategoryQuery(nextCategory);
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
         <div className="relative">
           <Input
             id="category"
             value={categoryQuery}
             onChange={(event) => {
               setCategoryQuery(event.target.value);
               setCategory(event.target.value);
               setCategoryOpen(true);
               setCategoryHighlight(0);
             }}
             onFocus={() => setCategoryOpen(true)}
             onBlur={() => window.setTimeout(() => setCategoryOpen(false), 100)}
             onKeyDown={(event) => {
               if (!categoryOpen) {
                 return;
               }
               if (event.key === "ArrowDown") {
                 event.preventDefault();
                 setCategoryHighlight((index) => Math.min(filteredCategories.length - 1, index + 1));
               }
               if (event.key === "ArrowUp") {
                 event.preventDefault();
                 setCategoryHighlight((index) => Math.max(0, index - 1));
               }
               if (event.key === "Enter" && filteredCategories[categoryHighlight]) {
                 event.preventDefault();
                 const selected = filteredCategories[categoryHighlight];
                 setCategoryQuery(selected);
                 setCategory(selected);
                 setCategoryOpen(false);
               }
             }}
             placeholder="Optional"
           />
           {categoryOpen && filteredCategories.length > 0 ? (
             <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow">
               {filteredCategories.map((item, index) => (
                 <button
                   key={item}
                   type="button"
                   onMouseDown={(event) => event.preventDefault()}
                   onClick={() => {
                     setCategoryQuery(item);
                     setCategory(item);
                     setCategoryOpen(false);
                   }}
                   className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-muted ${
                     index === categoryHighlight ? "bg-muted" : ""
                   }`}
                 >
                   {item}
                 </button>
               ))}
             </div>
           ) : null}
         </div>
       </div>

       <div className="space-y-2">
         <Label>Tags</Label>
         <TagInput value={tags} onChange={setTags} suggestions={availableTags.map((tag) => tag.name)} />
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
