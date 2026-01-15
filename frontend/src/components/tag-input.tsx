"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}

export function TagInput({ value, onChange, placeholder, suggestions = [] }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

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

  const filteredSuggestions = useMemo(() => {
    const term = inputValue.trim().toLowerCase();
    if (!term) {
      return [];
    }
    return suggestions
      .filter((item) => item.toLowerCase().includes(term))
      .filter((item) => !tags.includes(item.toLowerCase()))
      .slice(0, 6);
  }, [inputValue, suggestions, tags]);

  const commitSuggestion = (value: string) => {
    addTag(value);
    setHighlightedIndex(-1);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          value={inputValue}
          placeholder={placeholder || "Type a tag and press space"}
          onChange={(event) => {
            setInputValue(event.target.value);
            setHighlightedIndex(0);
          }}
          onBlur={() => addTag(inputValue)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlightedIndex((index) => Math.min(filteredSuggestions.length - 1, index + 1));
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlightedIndex((index) => Math.max(0, index - 1));
              return;
            }
            if (event.key === "Enter" && highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
              event.preventDefault();
              commitSuggestion(filteredSuggestions[highlightedIndex]);
              return;
            }
            if (event.key === " " || event.code === "Space" || event.key === "Enter") {
              event.preventDefault();
              addTag(inputValue);
            }
          }}
        />
        {filteredSuggestions.length > 0 ? (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commitSuggestion(suggestion)}
                className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-muted ${
                  index === highlightedIndex ? "bg-muted" : ""
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>
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
