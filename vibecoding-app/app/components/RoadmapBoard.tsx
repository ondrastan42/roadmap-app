"use client";

import {
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  getEffectiveHorizon,
  HORIZON_META,
  isManualHorizon,
  normalizeDate,
  type Horizon,
  type RoadmapItem,
} from "../../lib/roadmap";

const PRIORITY_LABELS = {
  low: "Nízká",
  medium: "Střední",
  high: "Vysoká",
} as const;

function RoadmapCard({
  item,
  onEdit,
  onResetHorizon,
}: {
  item: RoadmapItem;
  onEdit: (item: RoadmapItem) => void;
  onResetHorizon: (id: number) => void;
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
      className="generali-card group mb-3 cursor-grab p-4 transition hover:border-generali-red/25 active:cursor-grabbing"
    >
      <button
        type="button"
        onClick={() => onEdit(item)}
        className="w-full text-left"
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-generali-border bg-generali-surface-muted px-2 py-0.5 text-xs text-generali-ink-muted">
            {PRIORITY_LABELS[item.priority]}
          </span>
          {item.status === "doing" && (
            <span className="rounded-full bg-generali-danger-soft px-2 py-0.5 text-xs font-medium text-generali-red-dark">
              Probíhá
            </span>
          )}
          {isManualHorizon(item) ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-generali-navy/10 px-2 py-0.5 text-xs font-medium text-generali-navy">
              Ručně
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onResetHorizon(item.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    onResetHorizon(item.id);
                  }
                }}
                className="underline hover:text-generali-red cursor-pointer"
              >
                → auto
              </span>
            </span>
          ) : (
            <span className="rounded-full px-2 py-0.5 text-xs text-generali-ink-subtle">
              Dle termínu
            </span>
          )}
        </div>

        <h3 className="font-semibold text-generali-ink leading-snug">
          {item.title}
        </h3>

        <div className="mt-2 space-y-1 text-xs text-generali-ink-muted">
          {item.Zadavatel && <p>Zadavatel: {item.Zadavatel}</p>}
          {normalizeDate(item.date) ? (
            <p>
              Termín:{" "}
              {new Date(
                normalizeDate(item.date)! + "T12:00:00"
              ).toLocaleDateString("cs-CZ")}
            </p>
          ) : (
            <p>Bez termínu</p>
          )}
        </div>
      </button>
    </div>
  );
}

function HorizonColumn({
  horizon,
  items,
  onEdit,
  onResetHorizon,
}: {
  horizon: Horizon;
  items: RoadmapItem[];
  onEdit: (item: RoadmapItem) => void;
  onResetHorizon: (id: number) => void;
}) {
  const meta = HORIZON_META[horizon];
  const { setNodeRef, isOver } = useDroppable({ id: horizon });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[480px] rounded-2xl border bg-generali-surface/80 transition ${
        isOver
          ? "border-generali-red/40 ring-2 ring-[var(--generali-focus-ring)]"
          : "border-generali-border"
      }`}
    >
      <div className={`h-1 rounded-t-2xl bg-gradient-to-r ${meta.accent}`} />
      <div className="p-4">
        <div className="mb-1">
          <h2 className="font-bold text-generali-ink-secondary">{meta.title}</h2>
          <p className="text-xs text-generali-ink-subtle">{meta.subtitle}</p>
        </div>
        <div className="mb-4 mt-3 flex justify-end">
          <span className="rounded-full bg-generali-surface-muted px-2.5 py-0.5 text-sm font-medium text-generali-ink-muted">
            {items.length}
          </span>
        </div>

        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-generali-ink-subtle">
            Přetáhněte položku sem
          </p>
        ) : (
          items
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((item) => (
              <RoadmapCard
                key={item.id}
                item={item}
                onEdit={onEdit}
                onResetHorizon={onResetHorizon}
              />
            ))
        )}
      </div>
    </div>
  );
}

export function RoadmapBoard({
  items,
  onEdit,
  onDragEnd,
  onResetHorizon,
}: {
  items: RoadmapItem[];
  onEdit: (item: RoadmapItem) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onResetHorizon: (id: number) => void;
}) {
  const active = items.filter((i) => i.status !== "done");

  const byHorizon = (h: Horizon) =>
    active
      .filter((i) => getEffectiveHorizon(i) === h)
      .sort((a, b) => a.sort_order - b.sort_order);

  const horizons: Horizon[] = ["now", "next", "later"];

  return (
    <div className="space-y-6">
      <div className="generali-card p-6">
        <h2 className="text-lg font-bold text-generali-ink">
          Strategická roadmapa
        </h2>
        <p className="mt-1 text-sm text-generali-ink-muted">
          Položky z backlogu bez stavu Hotovo. Zařazení je automatické podle{" "}
          <strong className="font-medium text-generali-ink-secondary">
            Termínu release
          </strong>{" "}
          (termín se nemění). Přetažením můžete sloupec upravit ručně — po
          změně termínu v backlogu se znovu přepočítá.
        </p>
      </div>

      {active.length === 0 ? (
        <div className="generali-card border-dashed p-10 text-center text-sm text-generali-ink-muted">
          Žádné aktivní položky k zobrazení. Hotové úkoly jsou skryté.
        </div>
      ) : (
        <DndContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            {horizons.map((h) => (
              <HorizonColumn
                key={h}
                horizon={h}
                items={byHorizon(h)}
                onEdit={onEdit}
                onResetHorizon={onResetHorizon}
              />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}
