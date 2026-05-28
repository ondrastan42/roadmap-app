"use client";

import { BoardNotes } from "./components/BoardNotes";
import { RoadmapBoard } from "./components/RoadmapBoard";
import { ReleasesTimeline } from "./components/ReleasesTimeline";
import { normalizeDate, type Horizon } from "../lib/roadmap";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { useEffect, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

type Priority = "low" | "medium" | "high";
type Status = "todo" | "doing" | "done";
type View = "backlog" | "releases" | "roadmap";

const VIEW_TITLES: Record<View, string> = {
  backlog: "Product Backlog",
  releases: "Releases",
  roadmap: "Roadmap",
};

type Item = {
  id: number;
  title: string;
  priority: Priority;
  status: Status;
  sort_order: number;
  construction: boolean;
  jira?: string;
  date?: string;
  Zadavatel?: string | null;
  roadmap_horizon?: Horizon | null;
};

function formatSupabaseError(error: {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}) {
  return [error.message, error.code, error.details, error.hint]
    .filter(Boolean)
    .join(" — ");
}

function todayLocalIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isTermExpired(date?: string) {
  const d = normalizeDate(date);
  return Boolean(d && d < todayLocalIso());
}

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Nízká",
  medium: "Střední",
  high: "Vysoká",
};

function PriorityBadge({ priority }: { priority: Priority }) {
  const styles = {
    high: "bg-generali-danger-soft text-generali-red-dark border-generali-red/20",
    medium:
      "bg-generali-warning-soft text-[#775700] border-amber-200/60",
    low: "bg-generali-surface-muted text-generali-ink-muted border-generali-border",
  };

  return (
    <span
      className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${styles[priority]}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

function DraggableItem({
  item,
  onEdit,
  onDelete,
}: {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
  });

  const style = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="generali-card group mb-3 cursor-grab p-4 transition hover:border-generali-red/25 hover:shadow-[0_8px_24px_rgba(32,37,43,0.08)] active:cursor-grabbing"
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-generali-ink-subtle mb-1 font-medium">
            #{item.sort_order}
          </div>
          <h3 className="font-semibold text-generali-ink leading-snug">
            {item.title}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <PriorityBadge priority={item.priority} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="rounded-lg p-1.5 text-generali-ink-subtle opacity-0 transition group-hover:opacity-100 hover:bg-generali-surface-muted hover:text-generali-ink"
            aria-label="Upravit"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="rounded-lg p-1.5 text-generali-ink-subtle opacity-0 transition group-hover:opacity-100 hover:bg-generali-danger-soft hover:text-generali-red"
            aria-label="Smazat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        {item.Zadavatel && (
          <div className="text-generali-ink-muted text-xs">
            <span className="font-medium text-generali-ink-subtle">Zadavatel:</span>{" "}
            {item.Zadavatel}
          </div>
        )}

        {item.construction && (
          <div className="inline-flex w-fit items-center rounded-full bg-[#e8eef5] text-generali-navy px-2.5 py-1 text-xs font-medium">
            Předáno na konstrukci
          </div>
        )}

        {item.date && (
          <div className="text-generali-ink-muted text-xs">
            {new Date(item.date).toLocaleDateString("cs-CZ", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        )}

        {item.jira && (
          <a
            href={item.jira}
            target="_blank"
            rel="noopener noreferrer"
            className="text-generali-red font-medium hover:text-generali-red-hover hover:underline text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            Otevřít v Jira →
          </a>
        )}
      </div>
    </div>
  );
}

const COLUMN_ACCENTS: Record<Status, string> = {
  todo: "from-generali-ink-subtle to-generali-border-strong",
  doing: "from-generali-red-dark to-generali-red",
  done: "from-generali-success to-[#55ab67]",
};

function Column({
  id,
  title,
  items,
  onEdit,
  onDelete,
}: {
  id: Status;
  title: string;
  items: Item[];
  onEdit: (item: Item) => void;
  onDelete: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[520px] rounded-2xl border bg-generali-surface/80 backdrop-blur-sm transition ${
        isOver
          ? "border-generali-red/40 ring-2 ring-[var(--generali-focus-ring)]"
          : "border-generali-border"
      }`}
    >
      <div
        className={`h-1 rounded-t-2xl bg-gradient-to-r ${COLUMN_ACCENTS[id]}`}
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-generali-ink-secondary tracking-tight">
            {title}
          </h2>
          <span className="rounded-full bg-generali-surface-muted px-2.5 py-0.5 text-sm font-medium text-generali-ink-muted">
            {items.length}
          </span>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-generali-ink-subtle py-8 text-center">
            Přetáhněte položku sem
          </p>
        ) : (
          items.map((item) => (
            <DraggableItem
              key={item.id}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [sortOrder, setSortOrder] = useState(1);
  const [construction, setConstruction] = useState(false);
  const [jira, setJira] = useState("");
  const [date, setDate] = useState("");
  const [zadavatel, setZadavatel] = useState("");
  const [activeView, setActiveView] = useState<View>("backlog");

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 60_000);
    return () => clearInterval(interval);
  }, []);

  const fetchItems = async () => {
    if (!supabase) return;

    const { data, error } = await supabase.from("items").select("*");

    if (error) {
      console.error(formatSupabaseError(error), error);
      return;
    }

    const loaded = data || [];
    const expiredIds = loaded
      .filter(
        (i) => isTermExpired(i.date) && i.status !== "done"
      )
      .map((i) => i.id);

    if (expiredIds.length > 0) {
      const { error: updateError } = await supabase
        .from("items")
        .update({ status: "done" })
        .in("id", expiredIds);

      if (updateError) {
        console.error(formatSupabaseError(updateError), updateError);
        setItems(loaded);
        return;
      }

      setItems(
        loaded.map((i) =>
          expiredIds.includes(i.id) ? { ...i, status: "done" as Status } : i
        )
      );
      return;
    }

    setItems(loaded);
  };

  const resetForm = () => {
    setEditingId(null);
    setInput("");
    setJira("");
    setDate("");
    setZadavatel("");
    setSortOrder(1);
    setConstruction(false);
    setPriority("medium");
  };

  const saveItem = async () => {
    if (!input || !supabase) return;

    if (editingId) {
      const previous = items.find((i) => i.id === editingId);
      const previousDate = normalizeDate(previous?.date);
      const newDate = date ? normalizeDate(date) : undefined;
      const dateChanged = previousDate !== newDate;

      const { error } = await supabase
        .from("items")
        .update({
          title: input,
          priority,
          sort_order: sortOrder,
          construction,
          jira,
          date: newDate || null,
          Zadavatel: zadavatel || null,
          ...(dateChanged ? { roadmap_horizon: null } : {}),
        })
        .eq("id", editingId);

      if (error) {
        console.error(formatSupabaseError(error), error);
        alert(`Uložení se nezdařilo: ${formatSupabaseError(error)}`);
        return;
      }

      fetchItems();
      resetForm();
      return;
    }

    const { error } = await supabase.from("items").insert([
      {
        title: input,
        priority,
        status: "todo",
        sort_order: sortOrder,
        construction,
        jira,
        date,
        Zadavatel: zadavatel || null,
      },
    ]);

    if (error) {
      console.error(formatSupabaseError(error), error);
      alert(`Uložení se nezdařilo: ${formatSupabaseError(error)}`);
      return;
    }

    fetchItems();
    resetForm();
  };

  const handleEdit = (item: Item, options?: { switchToBacklog?: boolean }) => {
    if (options?.switchToBacklog) {
      setActiveView("backlog");
    }
    setEditingId(item.id);
    setInput(item.title);
    setPriority(item.priority);
    setSortOrder(item.sort_order);
    setConstruction(item.construction);
    setJira(item.jira || "");
    setDate(normalizeDate(item.date) || "");
    setZadavatel(item.Zadavatel || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    const confirmed = confirm("Opravdu smazat tuto položku?");
    if (!confirmed || !supabase) return;

    await supabase.from("items").delete().eq("id", id);
    fetchItems();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !supabase) return;

    const { error } = await supabase
      .from("items")
      .update({ status: over.id as Status })
      .eq("id", active.id);

    if (error) {
      console.error(formatSupabaseError(error), error);
      alert(`Přesun se nezdařil: ${formatSupabaseError(error)}`);
      return;
    }

    fetchItems();
  };

  const handleResetHorizon = async (id: number) => {
    if (!supabase) return;

    const { error } = await supabase
      .from("items")
      .update({ roadmap_horizon: null })
      .eq("id", id);

    if (error) {
      console.error(formatSupabaseError(error), error);
      alert(`Obnovení se nezdařilo: ${formatSupabaseError(error)}`);
      return;
    }

    fetchItems();
  };

  const handleRoadmapDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !supabase) return;

    const horizon = over.id as Horizon;
    if (horizon !== "now" && horizon !== "next" && horizon !== "later") {
      return;
    }

    const { error } = await supabase
      .from("items")
      .update({ roadmap_horizon: horizon })
      .eq("id", active.id);

    if (error) {
      console.error(formatSupabaseError(error), error);
      alert(`Uložení pozice v roadmapě se nezdařilo: ${formatSupabaseError(error)}`);
      return;
    }

    fetchItems();
  };

  const sorted = (status: Status) =>
    items
      .filter((i) => i.status === status)
      .sort((a, b) => a.sort_order - b.sort_order);

  const stats = {
    total: items.length,
    todo: sorted("todo").length,
    doing: sorted("doing").length,
    done: sorted("done").length,
  };

  return (
    <div className="min-h-screen bg-generali-surface-warm text-generali-ink">
      <header className="sticky top-0 z-10 flex h-[4.25rem] items-center justify-between border-b border-white/10 bg-gradient-to-r from-generali-red-deep via-generali-red-dark to-generali-red px-6 shadow-[0_4px_20px_rgba(148,17,20,0.25)] lg:px-8">
        <div className="flex items-center gap-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-lg font-bold text-white backdrop-blur"
            aria-hidden
          >
            G
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              {VIEW_TITLES[activeView]}
            </h1>
            <p className="text-xs text-white/75">PO Planning Dashboard</p>
          </div>
        </div>
        <span className="hidden text-sm text-white/70 sm:block">
          Generali Česká pojišťovna
        </span>
      </header>

      <div className="flex flex-col lg:flex-row">
        <aside className="w-full border-b border-generali-border bg-generali-surface p-5 shadow-sm lg:w-64 lg:min-h-[calc(100vh-4.25rem)] lg:border-b-0 lg:border-r">
          <nav className="mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-generali-ink-subtle">
              Navigace
            </p>
            <div className="flex flex-col gap-1">
              {(
                [
                  ["backlog", "Backlog"],
                  ["releases", "Releases"],
                  ["roadmap", "Roadmap"],
                ] as const
              ).map(([view, label]) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => {
                    setActiveView(view);
                    if (view !== "backlog") resetForm();
                  }}
                  className={
                    activeView === view
                      ? "generali-nav-active"
                      : "generali-nav-item"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </nav>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-generali-ink-subtle">
              Přehled
            </p>
            <div className="generali-card overflow-hidden p-0">
              <div className="border-b border-generali-border bg-generali-danger-soft px-4 py-3">
                <div className="text-3xl font-bold text-generali-red">
                  {stats.total}
                </div>
                <div className="text-sm text-generali-ink-muted">
                  položek celkem
                </div>
              </div>
              <div className="grid grid-cols-3 gap-px bg-generali-border text-center text-xs">
                <div className="bg-generali-surface px-2 py-3">
                  <div className="font-bold text-generali-ink">{stats.todo}</div>
                  <div className="text-generali-ink-subtle">Todo</div>
                </div>
                <div className="bg-generali-surface px-2 py-3">
                  <div className="font-bold text-generali-red">{stats.doing}</div>
                  <div className="text-generali-ink-subtle">Probíhá</div>
                </div>
                <div className="bg-generali-surface px-2 py-3">
                  <div className="font-bold text-generali-success">{stats.done}</div>
                  <div className="text-generali-ink-subtle">Hotovo</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-5 lg:p-8">
          {!supabaseConfigured && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-amber-300 bg-generali-warning-soft px-5 py-4 text-sm text-generali-ink-secondary"
            >
              <p className="font-semibold text-generali-ink">
                Supabase není nakonfigurované
              </p>
              <p className="mt-1">
                V kořeni projektu vytvořte soubor{" "}
                <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">
                  .env.local
                </code>{" "}
                podle{" "}
                <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">
                  .env.local.example
                </code>
                , pak restartujte{" "}
                <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">
                  npm run dev
                </code>
                .
              </p>
            </div>
          )}

          {activeView === "backlog" && (
          <section className="generali-card mb-8 p-6">
            <h2 className="mb-1 text-lg font-bold text-generali-ink">
              {editingId ? "Upravit položku" : "Nová položka backlogu"}
            </h2>
            <p className="mb-5 text-sm text-generali-ink-muted">
              Vyplňte údaje a přidejte položku na board. Pole Termín určuje
              pozici na časové ose v Releases.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-generali-ink-secondary">
                  Název funkce <span className="text-generali-red">*</span>
                </span>
                <input
                  className="generali-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="např. Export do PDF"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-generali-ink-secondary">
                  Zadavatel
                </span>
                <input
                  className="generali-input"
                  value={zadavatel}
                  onChange={(e) => setZadavatel(e.target.value)}
                  placeholder="např. Jan Novák"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-generali-ink-secondary">
                  Odkaz na Jira
                </span>
                <input
                  className="generali-input"
                  value={jira}
                  onChange={(e) => setJira(e.target.value)}
                  placeholder="https://…"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-generali-ink-secondary">
                  Priorita
                </span>
                <select
                  className="generali-input"
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as Priority)
                  }
                >
                  <option value="low">Nízká priorita</option>
                  <option value="medium">Střední priorita</option>
                  <option value="high">Vysoká priorita</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-generali-ink-secondary">
                  Termín release
                </span>
                <input
                  type="date"
                  className="generali-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-generali-ink-secondary">
                  Pořadí
                </span>
                <input
                  type="number"
                  className="generali-input"
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(Number(e.target.value))
                  }
                  placeholder="1"
                  min={1}
                />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-generali-border bg-generali-surface-muted/50 px-4 py-2.5 text-sm text-generali-ink-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={construction}
                  onChange={(e) => setConstruction(e.target.checked)}
                  className="h-4 w-4 rounded border-generali-border-strong text-generali-red accent-generali-red"
                />
                Předáno na konstrukci
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={saveItem} className="generali-btn-primary">
                {editingId ? "Uložit změny" : "Přidat položku"}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="generali-btn-secondary">
                  Zrušit
                </button>
              )}
            </div>
          </section>
          )}

          {activeView === "backlog" && (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_minmax(260px,320px)]">
              <DndContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                  <Column
                    id="todo"
                    title="K řešení"
                    items={sorted("todo")}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                  <Column
                    id="doing"
                    title="Probíhá"
                    items={sorted("doing")}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                  <Column
                    id="done"
                    title="Hotovo"
                    items={sorted("done")}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </div>
              </DndContext>
              <BoardNotes />
            </div>
          )}

          {activeView === "releases" && (
            <ReleasesTimeline
              items={items}
              onEdit={(item) => handleEdit(item, { switchToBacklog: true })}
            />
          )}

          {activeView === "roadmap" && (
            <RoadmapBoard
              items={items}
              onEdit={(item) => handleEdit(item, { switchToBacklog: true })}
              onDragEnd={handleRoadmapDragEnd}
              onResetHorizon={handleResetHorizon}
            />
          )}
        </main>
      </div>
    </div>
  );
}
