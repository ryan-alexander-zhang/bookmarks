import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Bookmark } from "@/lib/types";

interface BookmarkTableProps {
  items: Bookmark[];
}

export function BookmarkTable({ items }: BookmarkTableProps) {
  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground">No bookmarks found.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead>Added</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((bookmark) => (
          <TableRow key={bookmark.id}>
            <TableCell>
              <div className="font-medium text-foreground">{bookmark.title}</div>
              <a className="text-xs text-muted-foreground" href={bookmark.url} target="_blank" rel="noreferrer">
                {bookmark.url}
              </a>
            </TableCell>
            <TableCell>{bookmark.categoryName || "Uncategorized"}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {bookmark.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>{new Date(bookmark.createdAt).toLocaleDateString()}</TableCell>
            <TableCell>
              <Link className="text-sm text-primary hover:underline" href={`/bookmarks/${bookmark.id}/edit`}>
                Edit
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
