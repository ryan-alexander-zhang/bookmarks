"use client";

import { useRouter } from "next/navigation";
import { BookmarkForm } from "@/components/bookmark-form";
import { PageHeader } from "@/components/page-header";

export default function NewBookmarkPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader title="Add Bookmark" description="Auto-fill title and description, then customize." />
      <BookmarkForm submitLabel="Create bookmark" onSuccess={() => router.push("/")} />
    </div>
  );
}
