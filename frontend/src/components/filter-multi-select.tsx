"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface Option {
  id: string;
  name: string;
}

interface FilterMultiSelectProps {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  searchPlaceholder?: string;
}

export function FilterMultiSelect({
  label,
  options,
  selected,
  onChange,
  searchPlaceholder
}: FilterMultiSelectProps) {
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter((option) => option.name.toLowerCase().includes(term));
  }, [options, search]);

  const toggleOption = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((item) => item !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  const clearSelection = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="flex flex-wrap items-center gap-2">
          {selected.length > 0 ? <Badge variant="outline">{selected.length} selected</Badge> : null}
          {selected.length > 0 ? (
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={searchPlaceholder || `Search ${label.toLowerCase()}`}
      />
      <div className="max-h-44 space-y-2 overflow-y-auto rounded-md border p-3">
        {filteredOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No matches.</p>
        ) : (
          filteredOptions.map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={selected.includes(option.name)} onCheckedChange={() => toggleOption(option.name)} />
              <span>{option.name}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
