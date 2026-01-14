import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { BookMarked, Folder, Settings, Tags, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Bookmarks Manager",
  description: "A modern bookmarks manager"
};

const navItems = [
  { href: "/", label: "Bookmarks", icon: BookMarked },
  { href: "/bookmarks/new", label: "Add", icon: Upload },
  { href: "/manage/categories", label: "Categories", icon: Folder },
  { href: "/manage/tags", label: "Tags", icon: Tags },
  { href: "/settings", label: "Settings", icon: Settings }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-muted/30">
        <div className="flex min-h-screen">
          <aside className="w-60 border-r bg-white p-6">
            <div className="mb-8 text-lg font-semibold">Bookmarks</div>
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition",
                    "hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 p-8">
            <div className="mx-auto max-w-5xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
