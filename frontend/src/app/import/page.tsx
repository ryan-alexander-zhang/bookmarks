"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/lib/api";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/import/html`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      setMessage(`Imported ${result.count} bookmarks.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Import" description="Upload a Netscape HTML file to merge bookmarks." />
      <SectionCard title="HTML Import">
        <div className="space-y-4">
          <Input type="file" accept="text/html" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          <Button onClick={handleUpload} disabled={loading}>
            {loading ? "Importing..." : "Import bookmarks"}
          </Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
