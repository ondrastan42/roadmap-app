"use client";

import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

type Priority = "low" | "medium" | "high";
type Status = "todo" | "doing" | "done";

type Item = {
  id: number;
  title: string;
  priority: Priority;
  status: Status;
  sort_order: number;
  construction: boolean;
  jira?: string;
  date?: string;
};

function PriorityBadge({
  priority,
}: {
  priority: Priority;
}) {
  const styles = {
  high:
    "bg-red-50 text-red-700 border border-red-200",
  medium:
    "bg-amber-50 text-amber-700 border border-amber-200",
  low:
    "bg-slate-100 text-slate-700 border border-slate-200",
};

  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${styles[priority]}`}
    >
      {priority.toUpperCase()}
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
  const { attributes, listeners, setNodeRef, transform } =
    useDraggable({
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
      className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 mb-4 cursor-grab hover:shadow-xl hover:-translate-y-1 transition duration-200"
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex-1">
          <div className="text-xs text-slate-400 mb-1">
            #{item.sort_order}
          </div>

          <h3 className="font-semibold text-slate-800">
            {item.title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <PriorityBadge priority={item.priority} />

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="text-xs bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded"
          >
            ✏️
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
          >
            🗑
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        {item.construction && (
          <div className="inline-flex w-fit items-center rounded-full bg-blue-100 text-blue-700 px-2 py-1 text-xs font-medium">
            Předáno na konstrukci
          </div>
        )}

        {item.date && (
          <div className="text-slate-500">
            📅 {item.date}
          </div>
        )}

        {item.jira && (
          <a
            href={item.jira}
            target="_blank"
            className="text-[#D31145] hover:underline"
          >
            Otevřít Jira →
          </a>
        )}
      </div>
    </div>
  );
}

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
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className="bg-white/70 backdrop-blur rounded-3xl p-4 flex-1 min-h-[500px] border border-slate-200 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-slate-700">
          {title}
        </h2>

        <div className="bg-white text-slate-500 text-sm rounded-full px-2 py-1">
          {items.length}
        </div>
      </div>

      {items.map((item) => (
        <DraggableItem
          key={item.id}
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [input, setInput] = useState("");
  const [priority, setPriority] =
    useState<Priority>("medium");
  const [sortOrder, setSortOrder] = useState(1);
  const [construction, setConstruction] =
    useState(false);
  const [jira, setJira] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("items")
      .select("*");

    if (error) {
      console.error(error);
      return;
    }

    setItems(data || []);
  };

  const resetForm = () => {
    setEditingId(null);
    setInput("");
    setJira("");
    setDate("");
    setSortOrder(1);
    setConstruction(false);
    setPriority("medium");
  };

  const saveItem = async () => {
    if (!input) return;

    if (editingId) {
      const { error } = await supabase
        .from("items")
        .update({
          title: input,
          priority,
          sort_order: sortOrder,
          construction,
          jira,
          date,
        })
        .eq("id", editingId);

      if (error) {
        console.error(error);
        return;
      }

      fetchItems();
      resetForm();

      return;
    }

    const { error } = await supabase
      .from("items")
      .insert([
        {
          title: input,
          priority,
          status: "todo",
          sort_order: sortOrder,
          construction,
          jira,
          date,
        },
      ]);

    if (error) {
      console.error(error);
      return;
    }

    fetchItems();
    resetForm();
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setInput(item.title);
    setPriority(item.priority);
    setSortOrder(item.sort_order);
    setConstruction(item.construction);
    setJira(item.jira || "");
    setDate(item.date || "");
  };

  const handleDelete = async (id: number) => {
    const confirmed = confirm(
      "Delete this item?"
    );

    if (!confirmed) return;

    await supabase
      .from("items")
      .delete()
      .eq("id", id);

    fetchItems();
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!over) return;

    await supabase
      .from("items")
      .update({
        status: over.id,
      })
      .eq("id", active.id);

    fetchItems();
  };

  const sorted = (status: Status) =>
    items
      .filter((i) => i.status === status)
      .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-800">
      <header className="h-16 bg-gradient-to-r from-[#8C1538] to-[#C41230] text-white flex items-center justify-between px-8 shadow-lg border-b border-white/10">
        <div>
          <h1 className="font-bold text-xl">
            Product Roadmap
          </h1>

          <div className="text-xs text-slate-300">
            PO Planning Dashboard
          </div>
        </div>

        <div className="text-sm text-slate-300">
          Vibecoding Edition 🚀
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 bg-white/95 backdrop-blur border-r border-slate-200 min-h-screen p-6 shadow-sm">
          <div className="mb-8">
            <div className="text-xs uppercase text-slate-400 mb-2">
              Navigation
            </div>

            <div className="flex flex-col gap-2">
              <button className="bg-gradient-to-r from-[#A71930] to-[#D31145] text-white rounded-2xl px-4 py-3 text-left font-semibold shadow hover:scale-[1.02] transition">
                Roadmap Board
              </button>

              <button className="hover:bg-[#FCE8ED] rounded-2xl px-4 py-3 text-left text-slate-600 transition">
                Releases
              </button>

              <button className="hover:bg-slate-100 rounded-xl px-4 py-3 text-left text-slate-600">
                Backlog
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase text-slate-400 mb-2">
              Summary
            </div>

            <div className="bg-slate-100 rounded-2xl p-4">
              <div className="text-3xl font-bold text-slate-800">
                {items.length}
              </div>

              <div className="text-sm text-slate-500">
                Total items
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-8">
          <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 mb-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {editingId
                ? "Edit roadmap item"
                : "Create roadmap item"}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <input
                className="border border-slate-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-[#C41230]/30 focus:border-[#C41230] transition"
                value={input}
                onChange={(e) =>
                  setInput(e.target.value)
                }
                placeholder="Feature name..."
              />

              <input
                className="border border-slate-300 rounded-xl p-3"
                value={jira}
                onChange={(e) =>
                  setJira(e.target.value)
                }
                placeholder="Jira URL..."
              />

              <select
                className="border border-slate-300 rounded-xl p-3"
                value={priority}
                onChange={(e) =>
                  setPriority(
                    e.target.value as Priority
                  )
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>

              <input
                type="date"
                className="border border-slate-300 rounded-xl p-3"
                value={date}
                onChange={(e) =>
                  setDate(e.target.value)
                }
              />

              <input
                type="number"
                className="border border-slate-300 rounded-xl p-3"
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(Number(e.target.value))
                }
                placeholder="Order"
              />

              <label className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={construction}
                  onChange={(e) =>
                    setConstruction(
                      e.target.checked
                    )
                  }
                />

                Předáno na konstrukci
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveItem}
                className="bg-gradient-to-r from-[#A71930] to-[#D31145] hover:scale-[1.02] text-white rounded-2xl px-6 py-3 font-semibold transition shadow-lg"
              >
                {editingId
                  ? "Save changes"
                  : "Add item"}
              </button>

              {editingId && (
                <button
                  onClick={resetForm}
                  className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-2xl px-6 py-3 font-medium transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <DndContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-3 gap-6">
              <Column
                id="todo"
                title="TODO"
                items={sorted("todo")}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />

              <Column
                id="doing"
                title="IN PROGRESS"
                items={sorted("doing")}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />

              <Column
                id="done"
                title="DONE"
                items={sorted("done")}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          </DndContext>
        </main>
      </div>
    </div>
  );
}