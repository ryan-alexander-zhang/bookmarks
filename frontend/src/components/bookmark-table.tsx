import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { Bookmark } from "@/lib/types";

interface BookmarkTableProps {
  items: Bookmark[];
  onTagClick: (tag: string) => void;
  onRemove: (bookmarkId: string) => void;
}

export function BookmarkTable({ items, onTagClick, onRemove }: BookmarkTableProps) {
  const [confirmBookmark, setConfirmBookmark] = useState<Bookmark | null>(null);

  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground">No bookmarks found.</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((bookmark) => {
        const sortedTags = [...bookmark.tags].sort((a, b) => a.name.localeCompare(b.name));
        const description = bookmark.description || "";

        return (
          <div key={bookmark.id} className="space-y-1 rounded-md border px-4 py-3 min-w-0">
            <HoverCard>
              <HoverCardTrigger asChild>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full min-w-0 truncate text-sm font-semibold text-primary hover:underline max-w-[240px] sm:max-w-[360px] lg:max-w-[520px]"
                >
                  {bookmark.title}
                </a>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="space-y-1">
                  <div className="text-sm font-semibold">{bookmark.title}</div>
                  {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
                </div>
              </HoverCardContent>
            </HoverCard>

            <div className="flex flex-nowrap items-center gap-2 text-xs text-muted-foreground min-w-0 overflow-hidden">
              {sortedTags.length > 0 ? (
                <div className="flex items-center gap-1 shrink-0">
                  {sortedTags.map((tag, index) => (
                    <span key={tag.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onTagClick(tag.name)}
                        className="text-primary hover:underline"
                      >
                        #{tag.name}
                      </button>
                      {index < sortedTags.length - 1 ? <span className="text-muted-foreground">|</span> : null}
                    </span>
                  ))}
                </div>
              ) : null}
              {description ? (
                <div className="min-w-0 flex-1">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <span className="block truncate max-w-[240px] sm:max-w-[360px] lg:max-w-[520px]">
                        {sortedTags.length > 0 ? "|" : null} {description}
                      </span>
                    </HoverCardTrigger>
                    <HoverCardContent>
                      <div className="text-xs text-muted-foreground">{description}</div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Added {new Date(bookmark.createdAt).toLocaleDateString()}</span>
              <Link href={`/bookmarks/${bookmark.id}/edit`} className="text-primary hover:underline">
                Edit
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-destructive hover:text-destructive"
                onClick={() => setConfirmBookmark(bookmark)}
              >
                Remove
              </Button>
            </div>
          </div>
        );
      })}

      <AlertDialog
        open={Boolean(confirmBookmark)}
        onOpenChange={(open) => !open && setConfirmBookmark(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove bookmark</AlertDialogTitle>
            <AlertDialogDescription>
              Remove “{confirmBookmark?.title}”? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => confirmBookmark && onRemove(confirmBookmark.id)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
