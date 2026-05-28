export type Horizon = "now" | "next" | "later";

export type RoadmapItem = {
  id: number;
  title: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "doing" | "done";
  sort_order: number;
  construction: boolean;
  jira?: string;
  date?: string;
  Zadavatel?: string | null;
  roadmap_horizon?: Horizon | null;
};

export const HORIZON_META: Record<
  Horizon,
  { title: string; subtitle: string; accent: string }
> = {
  now: {
    title: "Now",
    subtitle: "Termín do 4 týdnů (nebo po termínu)",
    accent: "from-generali-red-dark to-generali-red",
  },
  next: {
    title: "Next",
    subtitle: "Termín za 1–3 měsíce",
    accent: "from-[#775700] to-[#f89b02]",
  },
  later: {
    title: "Later",
    subtitle: "Termín za 3+ měsíce nebo bez termínu",
    accent: "from-generali-ink-subtle to-generali-border-strong",
  },
};

/** Normalizace data z DB (YYYY-MM-DD nebo ISO řetězec). */
export function normalizeDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : undefined;
}

function todayLocalIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysFromToday(date: string) {
  const normalized = normalizeDate(date);
  if (!normalized) return NaN;
  const today = new Date(`${todayLocalIso()}T12:00:00`);
  const target = new Date(`${normalized}T12:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Automatické zařazení podle termínu release. */
export function deriveHorizon(item: {
  date?: string | null;
  status: RoadmapItem["status"];
}): Horizon {
  const date = normalizeDate(item.date);

  if (!date) {
    return item.status === "doing" ? "now" : "later";
  }

  const days = daysFromToday(date);
  if (Number.isNaN(days)) return "later";
  if (days < 0) return "now";
  if (days <= 28) return "now";
  if (days <= 90) return "next";
  return "later";
}

/** Sloupec v roadmapě: auto z termínu, nebo ruční po přetažení. */
export function getEffectiveHorizon(item: RoadmapItem): Horizon {
  if (
    item.roadmap_horizon === "now" ||
    item.roadmap_horizon === "next" ||
    item.roadmap_horizon === "later"
  ) {
    return item.roadmap_horizon;
  }
  return deriveHorizon(item);
}

export function isManualHorizon(item: RoadmapItem) {
  return (
    item.roadmap_horizon === "now" ||
    item.roadmap_horizon === "next" ||
    item.roadmap_horizon === "later"
  );
}
