"use client";

import { useEffect, useState } from "react";
import { Download, Search, Upload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { BookmarkTable } from "@/components/bookmark-table";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { API_BASE_URL, fetchJson } from "@/lib/api";
import type { BookmarkListResponse, Category, Tag } from "@/lib/types";

export default function HomePage() {
  const [data, setData] = useState<BookmarkListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const loadData = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNumber.toString(),
        page_size: "20",
        q: query,
        category,
        tags: tag ? tag : ""
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

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loadData(1);
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/export/html`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "bookmarks.html";
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

      <SectionCard title="Filters">
        <form className="grid gap-4 md:grid-cols-4" onSubmit={handleSearch}>
          <div className="md:col-span-2">
            <Input
              placeholder="Search by title, description, or URL"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select value={tag} onChange={(event) => setTag(event.target.value)}>
            <option value="">All tags</option>
            {tags.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </Select>
          <Button type="submit" className="md:col-span-4 w-full" disabled={loading}>
            <Search className="h-4 w-4" />
            {loading ? "Loading..." : "Apply filters"}
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Results">
        {data ? <BookmarkTable items={data.items} /> : <p className="text-sm">No data.</p>}
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
  );
}
