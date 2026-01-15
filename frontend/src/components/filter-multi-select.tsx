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
  groupDelimiter?: string;
}

export function FilterMultiSelect({
  label,
  options,
  selected,
  onChange,
  searchPlaceholder,
  groupDelimiter
}: FilterMultiSelectProps) {
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter((option) => option.name.toLowerCase().includes(term));
  }, [options, search]);

  const groupedOptions = useMemo(() => {
    if (!groupDelimiter) {
      return [{ label: "", items: filteredOptions }];
    }

    const groups = new Map<string, Option[]>();
    filteredOptions.forEach((option) => {
      const parts = option.name.split(groupDelimiter);
      const group = parts.length > 1 ? parts[0] : "Other";
      const list = groups.get(group) || [];
      list.push(option);
      groups.set(group, list);
    });

    return Array.from(groups.entries()).map(([group, items]) => ({
      label: group,
      items: items.sort((a, b) => a.name.localeCompare(b.name))
    }));
  }, [filteredOptions, groupDelimiter]);

  const toggleOption = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((item) => item !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  const selectAll = () => {
    const filteredNames = filteredOptions.map((option) => option.name);
    const merged = new Set([...selected, ...filteredNames]);
    onChange(Array.from(merged));
  };

  const toggleGroup = (groupLabel: string, items: Option[]) => {
    const names = items.map((item) => item.name);
    const allSelected = names.every((name) => selected.includes(name));
    if (allSelected) {
      onChange(selected.filter((item) => !names.includes(item)));
      return;
    }
    const merged = new Set([...selected, ...names]);
    onChange(Array.from(merged));
  };

  const toggleExpand = (groupLabel: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [groupLabel]: !(current[groupLabel] ?? true)
    }));
  };

  const clearSelection = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        {selected.length > 0 ? (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{selected.length} selected</Badge>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        ) : null}
      </div>
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={searchPlaceholder || `Search ${label.toLowerCase()}`}
      />
      <div className="max-h-56 space-y-3 overflow-y-auto rounded-md border bg-background p-3">
        {filteredOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No matches.</p>
        ) : (
          <>
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={filteredOptions.length > 0 && filteredOptions.every((option) => selected.includes(option.name))}
                onCheckedChange={selectAll}
              />
              <span>Select all</span>
            </label>
            {groupedOptions.map((group) => {
              const allSelected = group.items.every((item) => selected.includes(item.name));
              const isExpanded = expandedGroups[group.label ?? ""] ?? true;
              return (
                <div key={group.label} className="space-y-2">
                  {group.label ? (
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <label className="flex items-center gap-2 pl-1">
                        <Checkbox checked={allSelected} onCheckedChange={() => toggleGroup(group.label, group.items)} />
                        <span className="font-medium uppercase tracking-wide">{group.label}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleExpand(group.label)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? "Hide" : "Show"}
                      </button>
                    </div>
                  ) : null}
                  {isExpanded ? (
                    <div className="space-y-2 pl-6">
                      {group.items.map((option) => (
                        <label key={option.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={selected.includes(option.name)}
                            onCheckedChange={() => toggleOption(option.name)}
                          />
                          <span>{option.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
