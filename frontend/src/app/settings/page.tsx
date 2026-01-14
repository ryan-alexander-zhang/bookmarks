"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchJson } from "@/lib/api";
import type { Category, Rule } from "@/lib/types";

interface RuleFormState {
  name: string;
  hostPrefix: string;
  urlPrefix: string;
  pathPrefix: string;
  titleContains: string;
  category: string;
  tags: string[];
}

const emptyRule: RuleFormState = {
  name: "",
  hostPrefix: "",
  urlPrefix: "",
  pathPrefix: "",
  titleContains: "",
  category: "",
  tags: []
};

export default function SettingsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newRule, setNewRule] = useState<RuleFormState>(emptyRule);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [ruleData, categoryData] = await Promise.all([
        fetchJson<Rule[]>("/rules"),
        fetchJson<Category[]>("/categories")
      ]);
      setRules(ruleData);
      setCategories(categoryData);
    } catch (error) {
      setMessage("Failed to load settings data.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createRule = async () => {
    setMessage(null);
    try {
      await fetchJson<Rule>("/rules", {
        method: "POST",
        body: JSON.stringify(newRule)
      });
      setNewRule(emptyRule);
      loadData();
    } catch (error) {
      setMessage("Failed to create rule.");
    }
  };

  const updateRule = async (id: string, payload: RuleFormState) => {
    setMessage(null);
    try {
      await fetchJson<Rule>(`/rules/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      loadData();
    } catch (error) {
      setMessage("Failed to update rule.");
    }
  };

  const deleteRule = async (id: string) => {
    setMessage(null);
    try {
      await fetchJson(`/rules/${id}`, { method: "DELETE" });
      loadData();
    } catch (error) {
      setMessage("Failed to delete rule.");
    }
  };

  const clearAllData = async () => {
    const confirmed = window.confirm(
      "This will delete all bookmarks, tags, and categories. This action cannot be undone."
    );
    if (!confirmed) {
      return;
    }

    try {
      await fetchJson("/settings/clear", { method: "POST" });
      loadData();
      setMessage("All data cleared.");
    } catch (error) {
      setMessage("Failed to clear data.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage automation rules and cleanup operations." />

      <SectionCard title="Automation rules">
        <div className="space-y-6">
          <RuleEditor
            title="Create rule"
            categories={categories}
            value={newRule}
            onChange={setNewRule}
            onSubmit={createRule}
            submitLabel="Add rule"
          />

          <div className="space-y-4">
            {rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                categories={categories}
                onSave={(payload) => updateRule(rule.id, payload)}
                onDelete={() => deleteRule(rule.id)}
              />
            ))}
            {rules.length === 0 ? <p className="text-sm text-muted-foreground">No rules yet.</p> : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Danger zone">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Clear all bookmarks, tags, and categories. Rules will remain intact.
          </p>
          <Button variant="destructive" onClick={clearAllData}>
            Clear all data
          </Button>
        </div>
      </SectionCard>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

function RuleEditor({
  title,
  value,
  categories,
  onChange,
  onSubmit,
  submitLabel
}: {
  title: string;
  value: RuleFormState;
  categories: Category[];
  onChange: (value: RuleFormState) => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="rounded-md border p-4 space-y-4">
      <div className="text-sm font-semibold">{title}</div>
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Input
          placeholder="Rule name"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
        <Input
          placeholder="Host prefix (example: docs.)"
          value={value.hostPrefix}
          onChange={(event) => onChange({ ...value, hostPrefix: event.target.value })}
        />
        <Input
          placeholder="URL prefix (example: https://example.com/docs)"
          value={value.urlPrefix}
          onChange={(event) => onChange({ ...value, urlPrefix: event.target.value })}
        />
        <Input
          placeholder="Path prefix (example: /guides)"
          value={value.pathPrefix}
          onChange={(event) => onChange({ ...value, pathPrefix: event.target.value })}
        />
        <Input
          placeholder="Title contains"
          value={value.titleContains}
          onChange={(event) => onChange({ ...value, titleContains: event.target.value })}
        />
        <Input
          list="settings-category-list"
          placeholder="Category"
          value={value.category}
          onChange={(event) => onChange({ ...value, category: event.target.value })}
        />
        <div className="md:col-span-2">
          <TagInput value={value.tags} onChange={(tags) => onChange({ ...value, tags })} />
        </div>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
      <datalist id="settings-category-list">
        {categories.map((category) => (
          <option key={category.id} value={category.name} />
        ))}
      </datalist>
    </div>
  );
}

function RuleRow({
  rule,
  categories,
  onSave,
  onDelete
}: {
  rule: Rule;
  categories: Category[];
  onSave: (value: RuleFormState) => void;
  onDelete: () => void;
}) {
  const [value, setValue] = useState<RuleFormState>({
    name: rule.name,
    hostPrefix: rule.hostPrefix,
    urlPrefix: rule.urlPrefix,
    pathPrefix: rule.pathPrefix,
    titleContains: rule.titleContains,
    category: rule.categoryName || "",
    tags: rule.tags.map((tag) => tag.name)
  });

  useEffect(() => {
    setValue({
      name: rule.name,
      hostPrefix: rule.hostPrefix,
      urlPrefix: rule.urlPrefix,
      pathPrefix: rule.pathPrefix,
      titleContains: rule.titleContains,
      category: rule.categoryName || "",
      tags: rule.tags.map((tag) => tag.name)
    });
  }, [rule]);

  return (
    <div className="rounded-md border p-4 space-y-4">
      <div className="text-sm font-semibold">{rule.name}</div>
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(value);
        }}
      >
        <Input placeholder="Rule name" value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })} />
        <Input
          placeholder="Host prefix (example: docs.)"
          value={value.hostPrefix}
          onChange={(event) => setValue({ ...value, hostPrefix: event.target.value })}
        />
        <Input
          placeholder="URL prefix (example: https://example.com/docs)"
          value={value.urlPrefix}
          onChange={(event) => setValue({ ...value, urlPrefix: event.target.value })}
        />
        <Input
          placeholder="Path prefix (example: /guides)"
          value={value.pathPrefix}
          onChange={(event) => setValue({ ...value, pathPrefix: event.target.value })}
        />
        <Input
          placeholder="Title contains"
          value={value.titleContains}
          onChange={(event) => setValue({ ...value, titleContains: event.target.value })}
        />
        <Input
          list="settings-category-list"
          placeholder="Category"
          value={value.category}
          onChange={(event) => setValue({ ...value, category: event.target.value })}
        />
        <div className="md:col-span-2">
          <TagInput value={value.tags} onChange={(tags) => setValue({ ...value, tags })} />
        </div>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2">
          <Button type="submit">Save</Button>
          <Button type="button" variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </form>
      <datalist id="settings-category-list">
        {categories.map((category) => (
          <option key={category.id} value={category.name} />
        ))}
      </datalist>
    </div>
  );
}
