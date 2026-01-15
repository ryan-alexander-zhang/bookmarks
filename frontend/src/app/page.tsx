"use client";

import { useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { FilterMultiSelect } from "@/components/filter-multi-select";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { BookmarkTable } from "@/components/bookmark-table";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL, fetchJson } from "@/lib/api";
import type { BookmarkListResponse, Category, Tag } from "@/lib/types";

export default function HomePage() {
  const [data, setData] = useState<BookmarkListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const loadData = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNumber.toString(),
        page_size: "20",
        q: query,
        categories: selectedCategories.join(","),
        tags: selectedTags.join(",")
      });
      const result = await fetchJson<BookmarkListResponse>(`/bookmarks?${params.toString()}`);
      setData(result);
      setPage(result.pagination.page);
    } catch (error) {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = (tagName: string) => {
    setSelectedTags((current) => (current.includes(tagName) ? current : [...current, tagName]));
  };

  const handleRemove = async (bookmarkId: string) => {
    await fetchJson(`/bookmarks/${bookmarkId}`, { method: "DELETE" });
    loadData(page);
  };

  useEffect(() => {
    loadData(1);
  }, []);

  useEffect(() => {
    Promise.all([fetchJson<Category[]>("/categories"), fetchJson<Tag[]>("/tags")])
      .then(([categoryData, tagData]) => {
        setCategories(categoryData);
        setTags(tagData);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      loadData(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query, selectedCategories, selectedTags]);

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/export/html`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename=([^;]+)/i);
      const filename = match ? match[1].replace(/"/g, "") : "bookmarks.html";
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      return;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookmarks"
        description="Browse, filter, and search your library."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/import")}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <SectionCard title="Search">
            <Input
              placeholder="Search by title, description, or URL"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </SectionCard>

          <SectionCard title="Results">
            {data ? (
              <BookmarkTable items={data.items} onTagClick={handleTagClick} onRemove={handleRemove} />
            ) : (
              <p className="text-sm">No data.</p>
            )}
            {data ? (
              <div className="mt-4">
                <Pagination
                  page={data.pagination.page}
                  pageSize={data.pagination.pageSize}
                  total={data.pagination.total}
                  onPageChange={(next) => loadData(next)}
                />
              </div>
            ) : null}
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard title="Categories">
            <FilterMultiSelect
              label="Categories"
              options={categories}
              selected={selectedCategories}
              onChange={setSelectedCategories}
              searchPlaceholder="Search categories"
            />
          </SectionCard>
          <SectionCard title="Tags">
            <FilterMultiSelect
              label="Tags"
              options={tags}
              selected={selectedTags}
              onChange={setSelectedTags}
              searchPlaceholder="Search tags"
              groupDelimiter="/"
            />
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
