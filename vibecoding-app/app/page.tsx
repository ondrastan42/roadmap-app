"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
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

function DraggableItem({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, transform } =
    useDraggable({ id: item.id });

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
      className={`p-3 border mb-2 cursor-grab ${
        item.priority === "high"
          ? "bg-red-100"
          : item.priority === "medium"
          ? "bg-yellow-100"
          : "bg-gray-100"
      }`}
    >
      <div className="flex justify-between">
        <span>
          #{item.order} – {item.title} ({item.priority})
        </span>

        {item.construction && (
          <span className="text-xs bg-blue-200 px-2">
            Konstrukce
          </span>
        )}
      </div>

      {item.jira && (
        <a
          href={item.jira}
          target="_blank"
          className="text-blue-600 underline text-sm"
        >
          Jira
        </a>
      )}

      {item.date && (
        <div className="text-sm text-gray-600">
          {item.date}
        </div>
      )}
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
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="flex-1">
      <h2 className="font-bold mb-2">{title}</h2>
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

  // 🔽 FETCH Z DATABÁZE
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

  // 🔽 NAČTENÍ PŘI STARTU
  useEffect(() => {
    fetchItems();
  }, []);

  // 🔽 ADD ITEM
  const addItem = async () => {
    if (!input) return;

    const { error } = await supabase.from("items").insert([
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
  };

  // 🔽 DRAG & DROP
  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!over) return;

    await supabase
      .from("items")
      .update({ status: over.id })
      .eq("id", active.id);

    fetchItems();
  };

  const sorted = (status: Status) =>
    items
      .filter((i) => i.status === status)
      .sort((a, b) => a.order - b.order);

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">
        Roadmap App
      </h1>

      {/* FORM */}
      <div className="mb-6 flex flex-col gap-2 max-w-xl">
        <input
          className="border p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Název itemu..."
        />

        <div className="flex gap-2">
          <select
            className="border p-2"
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as Priority)
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <input
            type="number"
            className="border p-2"
            value={order}
            onChange={(e) =>
              setOrder(Number(e.target.value))
            }
            placeholder="Pořadí"
          />
        </div>

        <div className="flex gap-2">
          <input
            className="border p-2 flex-1"
            value={jira}
            onChange={(e) => setJira(e.target.value)}
            placeholder="Jira link..."
          />

          <input
            type="date"
            className="border p-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={construction}
            onChange={(e) =>
              setConstruction(e.target.checked)
            }
          />
          Předáno na konstrukci
        </label>

        <button
          onClick={addItem}
          className="bg-black text-white p-2"
        >
          Přidat
        </button>
      </div>

      {/* KANBAN */}
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6">
          <Column id="todo" title="TODO" items={sorted("todo")} />
          <Column id="doing" title="DOING" items={sorted("doing")} />
          <Column id="done" title="DONE" items={sorted("done")} />
        </div>
      </DndContext>
    </div>
  );
}