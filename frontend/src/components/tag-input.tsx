"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const tags = useMemo(() => value.filter(Boolean), [value]);

  const addTag = (raw: string) => {
    const cleaned = raw.trim().toLowerCase();
    if (!cleaned) {
      return;
    }
    if (!tags.includes(cleaned)) {
      onChange([...tags, cleaned]);
    }
    setInputValue("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((item) => item !== tag));
  };

  return (
    <div className="space-y-2">
      <Input
        value={inputValue}
        placeholder={placeholder || "Type a tag and press space"}
        onChange={(event) => setInputValue(event.target.value)}
        onBlur={() => addTag(inputValue)}
        onKeyDown={(event) => {
          if (event.key === " " || event.code === "Space" || event.key === "Enter") {
            event.preventDefault();
            addTag(inputValue);
          }
        }}
      />
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="group gap-1">
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-sm p-0.5 text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
