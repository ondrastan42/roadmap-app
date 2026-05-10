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
  order: number;
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
    high: "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${styles[priority]}`}
    >
      {priority.toUpperCase()}
    </span>
  );
}

function DraggableItem({ item }: { item: Item }) {
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
      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4 cursor-grab hover:shadow-md transition"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-slate-400 mb-1">
            #{item.order}
          </div>

          <h3 className="font-semibold text-slate-800">
            {item.title}
          </h3>
        </div>

        <PriorityBadge priority={item.priority} />
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
}: {
  id: Status;
  title: string;
  items: Item[];
}) {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className="bg-slate-100 rounded-2xl p-4 flex-1 min-h-[500px]"
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
        <DraggableItem key={item.id} item={item} />
      ))}
    </div>
  );
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);

  const [input, setInput] = useState("");
  const [priority, setPriority] =
    useState<Priority>("medium");
  const [order, setOrder] = useState(1);
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

  const addItem = async () => {
    if (!input) return;

    const { error } = await supabase
      .from("items")
      .insert([
        {
          title: input,
          priority,
          status: "todo",
          order,
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

    setInput("");
    setJira("");
    setDate("");
    setOrder(order + 1);
    setConstruction(false);
    setPriority("medium");
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
      .sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      {/* TOPBAR */}
      <header className="h-16 bg-[#002B5C] text-white flex items-center justify-between px-8 shadow">
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
        {/* SIDEBAR */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-screen p-6">
          <div className="mb-8">
            <div className="text-xs uppercase text-slate-400 mb-2">
              Navigation
            </div>

            <div className="flex flex-col gap-2">
              <button className="bg-[#D31145] text-white rounded-xl px-4 py-3 text-left font-medium">
                Roadmap Board
              </button>

              <button className="hover:bg-slate-100 rounded-xl px-4 py-3 text-left text-slate-600">
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

        {/* CONTENT */}
        <main className="flex-1 p-8">
          {/* FORM */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              Create roadmap item
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <input
                className="border border-slate-300 rounded-xl p-3"
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
                value={order}
                onChange={(e) =>
                  setOrder(Number(e.target.value))
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

            <button
              onClick={addItem}
              className="mt-6 bg-[#D31145] hover:opacity-90 text-white rounded-xl px-6 py-3 font-medium transition"
            >
              Add item
            </button>
          </div>

          {/* BOARD */}
          <DndContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-3 gap-6">
              <Column
                id="todo"
                title="TODO"
                items={sorted("todo")}
              />

              <Column
                id="doing"
                title="IN PROGRESS"
                items={sorted("doing")}
              />

              <Column
                id="done"
                title="DONE"
                items={sorted("done")}
              />
            </div>
          </DndContext>
        </main>
      </div>
    </div>
  );
}