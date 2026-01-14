"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MAX_NAME_LENGTH = 40;
const NAME_PATTERN = /^[A-Za-z0-9 _-]+$/;

interface ToastState {
  message: string;
  tone: "success" | "error";
}

interface NameListItem {
  id: string;
  name: string;
}

interface ManageNameListProps<T extends NameListItem> {
  title: string;
  description: string;
  entityLabel: string;
  entityPluralLabel: string;
  inputPlaceholder: string;
  searchPlaceholder: string;
  fetchItems: () => Promise<T[]>;
  createItem: (name: string) => Promise<void>;
  renameItem: (id: string, name: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export function ManageNameList<T extends NameListItem>({
  title,
  description,
  entityLabel,
  entityPluralLabel,
  inputPlaceholder,
  searchPlaceholder,
  fetchItems,
  createItem,
  renameItem,
  deleteItem
}: ManageNameListProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [newName, setNewName] = useState("");
  const [newError, setNewError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingError, setEditingError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmItem, setConfirmItem] = useState<T | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const newInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const toastTimeout = useRef<number | null>(null);

  const filteredItems = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) {
      return items;
    }
    return items.filter((item) => item.name.toLowerCase().includes(trimmed));
  }, [items, search]);

  const showToast = (message: string, tone: ToastState["tone"]) => {
    setToast({ message, tone });
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }
    toastTimeout.current = window.setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchItems();
      setItems(data);
    } catch (error) {
      setLoadError(`Failed to load ${entityPluralLabel.toLowerCase()}.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!confirmItem) {
      return;
    }
    cancelRef.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfirmItem(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [confirmItem]);

  useEffect(() => {
    return () => {
      if (toastTimeout.current) {
        window.clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  const validateName = (name: string, currentId?: string | null) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return `Please enter a ${entityLabel.toLowerCase()} name.`;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      return `${entityLabel} name must be at most ${MAX_NAME_LENGTH} characters.`;
    }
    if (!NAME_PATTERN.test(trimmed)) {
      return "Only letters, numbers, spaces, - and _ are allowed.";
    }

    const normalized = trimmed.toLowerCase();
    const isDuplicate = items.some((item) => item.id !== currentId && item.name.toLowerCase() === normalized);
    if (isDuplicate) {
      return `This ${entityLabel.toLowerCase()} already exists.`;
    }
    return null;
  };

  const handleCreate = async () => {
    const error = validateName(newName);
    if (error) {
      setNewError(error);
      return;
    }

    setNewError(null);
    setIsSaving(true);
    try {
      await createItem(newName);
      setNewName("");
      showToast(`Added ${entityLabel.toLowerCase()} "${newName.trim()}".`, "success");
      await load();
      newInputRef.current?.focus();
    } catch (error) {
      setNewError(error instanceof Error ? error.message : "Add failed. Please try again.");
      showToast("Add failed. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (item: T) => {
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingError(null);
  };

  const saveEdit = async (item: T) => {
    const error = validateName(editingName, item.id);
    if (error) {
      setEditingError(error);
      return;
    }

    setEditingError(null);
    setIsSaving(true);
    try {
      await renameItem(item.id, editingName);
      showToast(`Updated to "${editingName.trim()}".`, "success");
      cancelEdit();
      await load();
    } catch (error) {
      setEditingError(error instanceof Error ? error.message : "Update failed. Please try again.");
      showToast("Update failed. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteConfirmed = async () => {
    if (!confirmItem) {
      return;
    }
    setIsSaving(true);
    try {
      await deleteItem(confirmItem.id);
      showToast(`Deleted ${entityLabel.toLowerCase()} "${confirmItem.name}".`, "success");
      setConfirmItem(null);
      await load();
    } catch (error) {
      showToast("Delete failed. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="text-sm text-muted-foreground">{items.length} total</div>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-start gap-4">
            <div className="relative w-full flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>

            <form
              className="flex flex-wrap items-start gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                handleCreate();
              }}
            >
              <div className="min-w-[220px] flex-1">
                <Input
                  ref={newInputRef}
                  value={newName}
                  onChange={(event) => {
                    setNewName(event.target.value);
                    if (newError) {
                      setNewError(null);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setNewName("");
                      setNewError(null);
                      newInputRef.current?.focus();
                    }
                  }}
                  placeholder={inputPlaceholder}
                />
                {newError ? <p className="text-xs text-destructive mt-1">{newError}</p> : null}
              </div>
              <Button type="submit" disabled={isSaving}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </form>
          </div>

          <div className="rounded-md border divide-y">
            {isLoading ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Loading {entityPluralLabel.toLowerCase()}...</p>
            ) : filteredItems.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                {items.length === 0
                  ? `No ${entityPluralLabel.toLowerCase()} yet.`
                  : `No ${entityPluralLabel.toLowerCase()} match your search.`}
              </p>
            ) : (
              filteredItems.map((item) => {
                const isEditing = editingId === item.id;
                return (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3 justify-between">
                      {isEditing ? (
                        <div className="flex-1 min-w-[220px]">
                          <Input
                            value={editingName}
                            onChange={(event) => {
                              setEditingName(event.target.value);
                              if (editingError) {
                                setEditingError(null);
                              }
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                saveEdit(item);
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                cancelEdit();
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="text-sm font-medium flex-1">{item.name}</div>
                      )}

                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => saveEdit(item)}
                              disabled={isSaving}
                            >
                              <Check className="h-4 w-4" />
                              Save
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                              <X className="h-4 w-4" />
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(item)}
                              disabled={Boolean(editingId)}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmItem(item)}
                              disabled={Boolean(editingId)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {isEditing && editingError ? (
                      <p className="text-xs text-destructive mt-2">{editingError}</p>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
        </div>
      </div>

      {toast ? (
        <div
          className={`fixed top-5 right-5 z-50 rounded-md px-4 py-2 text-sm shadow-lg ${
            toast.tone === "success"
              ? "bg-emerald-500 text-white"
              : "bg-destructive text-destructive-foreground"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      {confirmItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-md border bg-background p-4 shadow-lg space-y-3">
            <div className="text-sm font-semibold">Delete {entityLabel}</div>
            <p className="text-sm text-muted-foreground">
              Delete {entityLabel} “{confirmItem.name}”? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button ref={cancelRef} variant="outline" onClick={() => setConfirmItem(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteConfirmed} disabled={isSaving}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
