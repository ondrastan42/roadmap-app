"use client";

type Priority = "low" | "medium" | "high";
type Status = "todo" | "doing" | "done";

export type TimelineItem = {
  id: number;
  title: string;
  priority: Priority;
  status: Status;
  sort_order: number;
  construction: boolean;
  jira?: string;
  date?: string;
  Zadavatel?: string | null;
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Nízká",
  medium: "Střední",
  high: "Vysoká",
};

const STATUS_LABELS: Record<Status, string> = {
  todo: "K řešení",
  doing: "Probíhá",
  done: "Hotovo",
};

const STATUS_STYLES: Record<Status, string> = {
  todo: "bg-generali-surface-muted text-generali-ink-muted",
  doing: "bg-generali-danger-soft text-generali-red-dark",
  done: "bg-generali-success-soft text-generali-success",
};

function releaseKey(date: string) {
  return date.slice(0, 7);
}

function releaseLabel(date: string) {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });
}

function releaseSubtitle(date: string) {
  const d = new Date(date + "T12:00:00");
  const quarter = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${quarter} · ${d.getFullYear()}`;
}

function isPastRelease(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const release = new Date(date + "T12:00:00");
  return release < today;
}

function isTodayRelease(date: string) {
  const today = new Date().toISOString().slice(0, 10);
  return date === today;
}

function groupByRelease(items: TimelineItem[]) {
  const dated = items
    .filter((i) => i.date)
    .sort(
      (a, b) =>
        new Date(a.date!).getTime() - new Date(b.date!).getTime() ||
        a.sort_order - b.sort_order
    );

  const groups = new Map<string, TimelineItem[]>();

  for (const item of dated) {
    const key = releaseKey(item.date!);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  return Array.from(groups.entries()).map(([key, groupItems]) => ({
    key,
    date: groupItems[0].date!,
    items: groupItems,
  }));
}

function TimelineCard({
  item,
  onEdit,
}: {
  item: TimelineItem;
  onEdit: (item: TimelineItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(item)}
      className="generali-card w-full p-4 text-left transition hover:border-generali-red/30 hover:shadow-[0_6px_20px_rgba(32,37,43,0.08)]"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}
        >
          {STATUS_LABELS[item.status]}
        </span>
        <span className="rounded-full border border-generali-border bg-generali-surface-muted px-2 py-0.5 text-xs text-generali-ink-muted">
          {PRIORITY_LABELS[item.priority]}
        </span>
        {item.construction && (
          <span className="rounded-full bg-[#e8eef5] px-2 py-0.5 text-xs font-medium text-generali-navy">
            Konstrukce
          </span>
        )}
      </div>

      <h3 className="font-semibold text-generali-ink leading-snug">
        {item.title}
      </h3>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-generali-ink-muted">
        {item.Zadavatel && <span>Zadavatel: {item.Zadavatel}</span>}
        <span>Pořadí #{item.sort_order}</span>
      </div>

      {item.jira && (
        <span className="mt-2 inline-block text-xs font-medium text-generali-red">
          Jira →
        </span>
      )}
    </button>
  );
}

export function ReleasesTimeline({
  items,
  onEdit,
}: {
  items: TimelineItem[];
  onEdit: (item: TimelineItem) => void;
}) {
  const milestones = groupByRelease(items);
  const unscheduled = items
    .filter((i) => !i.date)
    .sort((a, b) => a.sort_order - b.sort_order);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <div className="generali-card p-6">
        <h2 className="text-lg font-bold text-generali-ink">Časová osa release</h2>
        <p className="mt-1 text-sm text-generali-ink-muted">
          Položky z backlogu se řadí podle pole{" "}
          <strong className="font-medium text-generali-ink-secondary">Termín</strong>.
          Kliknutím na kartu přejdete do úprav v backlogu.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-2 text-generali-ink-muted">
            <span className="h-3 w-3 rounded-full bg-generali-red ring-4 ring-generali-danger-soft" />
            Nadcházející release
          </span>
          <span className="flex items-center gap-2 text-generali-ink-muted">
            <span className="h-3 w-3 rounded-full bg-generali-ink-subtle" />
            Uplynulý release
          </span>
          <span className="flex items-center gap-2 text-generali-ink-muted">
            <span className="rounded-full border border-generali-red bg-generali-danger-soft px-2 py-0.5 text-xs font-semibold text-generali-red">
              Dnes
            </span>
          </span>
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="generali-card border-dashed p-10 text-center">
          <p className="font-medium text-generali-ink-secondary">
            Zatím žádný naplánovaný release
          </p>
          <p className="mt-2 text-sm text-generali-ink-muted">
            V backlogu nastavte u položek pole Termín — objeví se zde na časové ose.
          </p>
        </div>
      ) : (
        <div className="relative">
          <div
            className="absolute left-[1.125rem] top-2 bottom-2 w-0.5 bg-gradient-to-b from-generali-red/40 via-generali-border to-generali-border-strong"
            aria-hidden
          />

          <div className="space-y-10">
            {milestones.map((milestone) => {
              const past = isPastRelease(milestone.date);
              const isToday = isTodayRelease(milestone.date);

              return (
                <section key={milestone.key} className="relative pl-12">
                  <div
                    className={`absolute left-3 top-1.5 h-4 w-4 rounded-full border-2 border-generali-surface ${
                      past
                        ? "bg-generali-ink-subtle"
                        : "bg-generali-red shadow-[0_0_0_4px_rgba(194,27,23,0.15)]"
                    }`}
                    aria-hidden
                  />

                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold capitalize text-generali-ink">
                          {releaseLabel(milestone.date)}
                        </h3>
                        {isToday && (
                          <span className="rounded-full bg-generali-red px-2.5 py-0.5 text-xs font-semibold text-white">
                            Dnes
                          </span>
                        )}
                        {past && !isToday && (
                          <span className="rounded-full bg-generali-surface-muted px-2.5 py-0.5 text-xs font-medium text-generali-ink-muted">
                            Uplynulo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-generali-ink-muted">
                        {releaseSubtitle(milestone.date)} · {milestone.items.length}{" "}
                        {milestone.items.length === 1 ? "položka" : "položek"}
                      </p>
                    </div>
                    <time
                      dateTime={milestone.date}
                      className="text-sm font-medium text-generali-ink-subtle"
                    >
                      {new Date(milestone.date + "T12:00:00").toLocaleDateString(
                        "cs-CZ",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                    </time>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {milestone.items.map((item) => (
                      <TimelineCard key={item.id} item={item} onEdit={onEdit} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {today && milestones.every((m) => m.date !== today) && (
            <p className="mt-6 pl-12 text-xs text-generali-ink-subtle">
              Dnešní datum na ose: žádný release není přímo dnes naplánován.
            </p>
          )}
        </div>
      )}

      <section className="generali-card p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-generali-ink-secondary">
              Mimo časovou osu
            </h3>
            <p className="text-sm text-generali-ink-muted">
              Položky bez termínu — zatím nezařazené do release
            </p>
          </div>
          <span className="rounded-full bg-generali-surface-muted px-3 py-1 text-sm font-medium text-generali-ink-muted">
            {unscheduled.length}
          </span>
        </div>

        {unscheduled.length === 0 ? (
          <p className="text-sm text-generali-ink-subtle">
            Všechny položky mají nastavený termín release.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {unscheduled.map((item) => (
              <TimelineCard key={item.id} item={item} onEdit={onEdit} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
