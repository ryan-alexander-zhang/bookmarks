"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

export default function ExportPage() {
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setMessage(null);
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Export" description="Download bookmarks in Netscape HTML format." />
      <SectionCard title="HTML Export">
        <div className="space-y-4">
          <Button onClick={handleExport}>
            <Download className="h-4 w-4" />
            Download HTML
          </Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
