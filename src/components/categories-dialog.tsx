import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "@/api/client";
import { useMaindata, useRunAction } from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { manageStore } from "@/lib/manage";
import { categoryTree, countBy, matchesCategory, matchesTag } from "@/lib/torrents";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";

/** The row being edited: an existing category, a new one (with an optional parent) or none. */
type Editing = { kind: "edit"; name: string } | { kind: "new"; parent?: string } | null;

function CategoryForm({
  editing,
  initialPath,
  onCancel,
  onSave,
}: {
  editing: NonNullable<Editing>;
  initialPath: string;
  onCancel: () => void;
  onSave: (name: string, path: string) => void;
}) {
  const [name, setName] = useState(editing.kind === "edit" ? editing.name : editing.parent ? `${editing.parent}/` : "");
  const [path, setPath] = useState(initialPath);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = name.trim().replace(/^\/+|\/+$/g, "");
    if (clean) onSave(clean, path.trim());
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5 border-b bg-muted p-3 last:border-b-0">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-name" className="text-[13px]">
            {m.name()}
          </Label>
          <Input
            id="category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={editing.kind === "edit"}
            title={editing.kind === "edit" ? m.category_rename_hint() : undefined}
            className="bg-background"
            autoFocus={editing.kind === "new"}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-path" className="text-[13px]">
            {m.add_save_in()}
          </Label>
          <Input
            id="category-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder={m.category_path_placeholder()}
            className="bg-background font-mono text-[13px]"
            autoFocus={editing.kind === "edit"}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" className="bg-background" onClick={onCancel}>
          {m.cancel()}
        </Button>
        <Button type="submit" size="sm">
          {m.save()}
        </Button>
      </div>
    </form>
  );
}

/**
 * "Kategorien und Tags" (docs/mockup/Kategorien.dc.html): create, edit and delete categories
 * (torrents/createCategory, editCategory, removeCategories) and tags (createTags, deleteTags),
 * and remove the unused ones. qBittorrent cannot rename a category, so the name is fixed.
 */
export function CategoriesDialog() {
  const state = manageStore.use();
  const { data } = useMaindata();
  const run = useRunAction();
  const [editing, setEditing] = useState<Editing>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (!state.open) return;
    setEditing(null);
    setSelected(null);
    setNewTag("");
  }, [state.open]);

  const torrents = Object.values(data?.torrents ?? {});
  const categories = categoryTree(Object.keys(data?.categories ?? {}));
  const tags = data?.tags ?? [];
  const usage = (name: string) => countBy(torrents, (t) => t.category === name);
  const tagUsage = (tag: string) => countBy(torrents, (t) => matchesTag(t, tag));
  const unusedCategories = categories.filter(
    (c) => usage(c.name) === 0 && !categories.some((o) => o.name.startsWith(`${c.name}/`) && usage(o.name) > 0),
  );
  const unusedTags = tags.filter((t) => tagUsage(t) === 0);
  const close = () => manageStore.set((s) => ({ ...s, open: false }));

  const saveCategory = async (name: string, path: string) => {
    const existing = editing?.kind === "edit";
    setEditing(null);
    await run(() => (existing ? api.editCategory(name, path) : api.createCategory(name, path)), {
      success: existing ? m.toast_category_saved() : m.toast_category_created({ name }),
    });
  };

  const removeUnused = () => {
    if (state.tab === "categories") {
      const names = unusedCategories.map((c) => c.name);
      if (names.length)
        void run(() => api.removeCategories(names), { success: m.toast_unused_removed({ n: names.length }) });
    } else if (unusedTags.length) {
      void run(() => api.deleteTags(unusedTags), { success: m.toast_unused_removed({ n: unusedTags.length }) });
    }
  };

  const addTag = (event: FormEvent) => {
    event.preventDefault();
    const list = newTag
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && !tags.includes(t));
    setNewTag("");
    if (list.length) void run(() => api.createTags(list));
  };

  const usageText = (n: number) => (n === 0 ? m.unused() : m.n_torrents({ n }));
  const unusedCount = state.tab === "categories" ? unusedCategories.length : unusedTags.length;

  return (
    <Dialog open={state.open} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-[536px]" data-testid="manage-dialog">
        <DialogHeader>
          <DialogTitle>{m.manage_title()}</DialogTitle>
          <DialogDescription>{m.manage_text()}</DialogDescription>
        </DialogHeader>
        <Tabs value={state.tab} onValueChange={(v) => manageStore.set({ open: true, tab: v as "categories" | "tags" })}>
          <TabsList className="w-full">
            <TabsTrigger value="categories">{m.categories()}</TabsTrigger>
            <TabsTrigger value="tags">{m.tags()}</TabsTrigger>
          </TabsList>
        </Tabs>

        {state.tab === "categories" ? (
          <div className="overflow-hidden rounded-lg border text-sm" data-testid="category-list">
            {categories.length === 0 && !editing && (
              <p className="p-4 text-center text-muted-foreground">{m.categories_none()}</p>
            )}
            {categories.map((c) => {
              const cat = data?.categories[c.name];
              const n = countBy(torrents, (t) => matchesCategory(t, c.name));
              if (editing?.kind === "edit" && editing.name === c.name) {
                return (
                  <CategoryForm
                    key={c.name}
                    editing={editing}
                    initialPath={cat?.savePath ?? ""}
                    onCancel={() => setEditing(null)}
                    onSave={saveCategory}
                  />
                );
              }
              return (
                <div
                  key={c.name}
                  className={cn(
                    "flex items-center gap-3 border-b py-2 pr-2 last:border-b-0",
                    selected === c.name && "bg-muted/60",
                  )}
                  style={{ paddingLeft: 12 + c.depth * 16 }}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 flex-col text-left"
                    onClick={() => setSelected(selected === c.name ? null : c.name)}
                    aria-pressed={selected === c.name}
                  >
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="truncate font-mono text-muted-foreground text-xs">
                      {cat?.savePath || m.category_default_path()}
                    </span>
                  </button>
                  <span className="shrink-0 text-[13px] text-muted-foreground tabular-nums">{usageText(n)}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={m.edit_name({ name: c.name })}
                    onClick={() => setEditing({ kind: "edit", name: c.name })}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={m.delete_name({ name: c.name })}
                    onClick={() =>
                      run(() => api.removeCategories([c.name]), { success: m.toast_category_removed({ name: c.name }) })
                    }
                  >
                    <Trash2Icon className="text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
            {editing?.kind === "new" && (
              <CategoryForm editing={editing} initialPath="" onCancel={() => setEditing(null)} onSave={saveCategory} />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <form onSubmit={addTag} className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder={m.tags_new_placeholder()}
                aria-label={m.tags_new()}
              />
              <Button type="submit" disabled={!newTag.trim()}>
                <PlusIcon /> {m.tag()}
              </Button>
            </form>
            <div className="overflow-hidden rounded-lg border text-sm" data-testid="tag-list">
              {tags.length === 0 && <p className="p-4 text-center text-muted-foreground">{m.tags_none()}</p>}
              {tags.map((tag) => (
                <div key={tag} className="flex items-center gap-3 border-b py-2 pr-2 pl-3 last:border-b-0">
                  <span className="min-w-0 flex-1 truncate font-medium">{tag}</span>
                  <span className="text-[13px] text-muted-foreground tabular-nums">{usageText(tagUsage(tag))}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={m.delete_name({ name: tag })}
                    onClick={() => run(() => api.deleteTags([tag]), { success: m.toast_tag_removed({ name: tag }) })}
                  >
                    <Trash2Icon className="text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={unusedCount === 0}
            onClick={removeUnused}
          >
            {m.remove_unused()}
          </Button>
          <span className="flex-1" />
          {state.tab === "categories" && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={!selected}
                title={selected ? undefined : m.subcategory_hint()}
                onClick={() => selected && setEditing({ kind: "new", parent: selected })}
              >
                {m.subcategory()}
              </Button>
              <Button size="sm" onClick={() => setEditing({ kind: "new" })}>
                <PlusIcon /> {m.category()}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
