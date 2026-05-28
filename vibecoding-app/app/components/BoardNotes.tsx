"use client";

import { supabase } from "../../lib/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

const BOARD_NOTES_ID = 1;

export function BoardNotes() {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">(
    "loading"
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadNotes = useCallback(async () => {
    if (!supabase) {
      setStatus("idle");
      return;
    }

    setStatus("loading");
    const { data, error } = await supabase
      .from("board_notes")
      .select("content")
      .eq("id", BOARD_NOTES_ID)
      .maybeSingle();

    if (error) {
      console.error(error);
      setStatus("error");
      return;
    }

    setContent(data?.content ?? "");
    setStatus("idle");
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const saveNotes = useCallback(async (value: string) => {
    if (!supabase) return;

    setStatus("saving");
    const { error } = await supabase.from("board_notes").upsert({
      id: BOARD_NOTES_ID,
      content: value,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error(error);
      setStatus("error");
      return;
    }

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }, []);

  const handleChange = (value: string) => {
    setContent(value);
    setStatus("idle");

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveNotes(value), 700);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const statusLabel = {
    loading: "Načítám…",
    idle: "Ukládá se po přestání psaní",
    saving: "Ukládám…",
    saved: "Uloženo",
    error: "Chyba ukládání — zkontrolujte tabulku board_notes",
  }[status];

  return (
    <aside className="generali-card flex h-full min-h-[320px] flex-col p-5 xl:min-h-[520px]">
      <div className="mb-3">
        <h2 className="text-lg font-bold text-generali-ink">Poznámky k boardu</h2>
        <p className="mt-1 text-xs text-generali-ink-muted">
          Volný prostor pro PO — schůzky, rozhodnutí, kontext k prioritám.
        </p>
      </div>

      <textarea
        className="generali-input min-h-[200px] flex-1 resize-y font-normal leading-relaxed"
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Napište poznámky k aktuálnímu sprintu, backlogu nebo rozhodnutím…"
        disabled={status === "loading" || !supabase}
      />

      <p
        className={`mt-3 text-xs ${
          status === "error"
            ? "text-generali-red"
            : status === "saved"
              ? "text-generali-success"
              : "text-generali-ink-subtle"
        }`}
      >
        {statusLabel}
      </p>
    </aside>
  );
}
