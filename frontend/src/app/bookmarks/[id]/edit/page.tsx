"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { BookmarkForm } from "@/components/bookmark-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { fetchJson } from "@/lib/api";
import type { Bookmark } from "@/lib/types";

export default function EditBookmarkPage() {
  const params = useParams<{ id: string }>();
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!params?.id) {
      return;
    }
    fetchJson<Bookmark>(`/bookmarks/${params.id}`)
      .then(setBookmark)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [params?.id]);

  const handleDelete = async () => {
    if (!bookmark) {
      return;
    }
    try {
      await fetchJson(`/bookmarks/${bookmark.id}`, { method: "DELETE" });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Bookmark"
        description="Update metadata and tags."
        actions={
          <Button variant="ghost" onClick={() => router.push("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {bookmark ? (
        <BookmarkForm
          submitLabel="Save changes"
          initialData={bookmark}
          onSuccess={() => router.push("/")}
          footerActions={
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2" type="button">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete bookmark</AlertDialogTitle>
                  <AlertDialogDescription>
                    Delete “{bookmark?.title}”? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          }
        />
      ) : (
        <p className="text-sm text-muted-foreground">Loading...</p>
      )}
    </div>
  );
}
