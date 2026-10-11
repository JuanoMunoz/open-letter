"use client";

import { useState } from "react";
import { Plus, X, GripVertical } from "lucide-react";

export interface OpenPair {
  when: string;
  text: string;
}

/** Editor de listas: razones/promesas (strings) o ábrela-cuándo (pares). */
export function ItemsEditor({
  kind,
  items,
  pairs,
  onItems,
  onPairs,
  maxItems,
  placeholder,
}: {
  kind: "reasons" | "promises" | "openwhen";
  items: string[];
  pairs: OpenPair[];
  onItems: (items: string[]) => void;
  onPairs: (pairs: OpenPair[]) => void;
  maxItems: number;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const [draftWhen, setDraftWhen] = useState("");
  const [draftText, setDraftText] = useState("");

  if (kind === "openwhen") {
    const addPair = () => {
      if (pairs.length >= 5 || !draftWhen.trim()) return;
      onPairs([...pairs, { when: draftWhen.trim().slice(0, 80), text: draftText.trim().slice(0, 280) }]);
      setDraftWhen("");
      setDraftText("");
    };
    return (
      <div className="space-y-2">
        {pairs.map((p, i) => (
          <div key={i} className="flex items-start gap-2 rounded-xl bg-[#EBEBEF] px-3 py-2">
            <GripVertical size={14} className="mt-1 shrink-0 text-neutral-400" aria-hidden />
            <div className="min-w-0 flex-1">
              <input
                value={p.when}
                onChange={(e) => {
                  const next = [...pairs];
                  next[i] = { ...next[i], when: e.target.value.slice(0, 80) };
                  onPairs(next);
                }}
                placeholder="…tengas un mal día"
                aria-label={`Condición ${i + 1}`}
                className="w-full bg-transparent text-sm font-bold text-neutral-800 outline-none placeholder:text-neutral-400"
              />
              <input
                value={p.text}
                onChange={(e) => {
                  const next = [...pairs];
                  next[i] = { ...next[i], text: e.target.value.slice(0, 280) };
                  onPairs(next);
                }}
                placeholder="Lo que quieres decirle entonces…"
                aria-label={`Mensaje ${i + 1}`}
                className="mt-0.5 w-full bg-transparent text-sm text-neutral-600 outline-none placeholder:text-neutral-400"
              />
            </div>
            <button
              type="button"
              onClick={() => onPairs(pairs.filter((_, ix) => ix !== i))}
              aria-label={`Quitar mini carta ${i + 1}`}
              className="text-neutral-400 hover:text-red-500"
            >
              <X size={15} />
            </button>
          </div>
        ))}
        {pairs.length < 5 && (
          <div className="rounded-xl border border-dashed border-[#D6D6DC] p-2.5">
            <input
              value={draftWhen}
              onChange={(e) => setDraftWhen(e.target.value)}
              placeholder="…tengas un mal día"
              aria-label="Nueva condición"
              className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-neutral-400"
            />
            <input
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPair()}
              placeholder="Mensaje para ese momento… (Enter para añadir)"
              aria-label="Nuevo mensaje"
              className="mt-1 w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
            <button
              type="button"
              onClick={addPair}
              disabled={!draftWhen.trim()}
              className="mt-1.5 flex items-center gap-1 text-xs font-bold text-[#E0698F] disabled:opacity-40"
            >
              <Plus size={13} /> Añadir mini carta ({pairs.length}/5)
            </button>
          </div>
        )}
      </div>
    );
  }

  const addItem = () => {
    if (!draft.trim() || items.length >= maxItems) return;
    onItems([...items, draft.trim().slice(0, 140)]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <ol className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-2 rounded-xl bg-[#EBEBEF] px-3 py-2 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#E0698F]">
                {i + 1}
              </span>
              <input
                value={it}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value.slice(0, 140);
                  onItems(next);
                }}
                aria-label={`Ítem ${i + 1}`}
                className="w-full bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => onItems(items.filter((_, ix) => ix !== i))}
                aria-label={`Quitar ítem ${i + 1}`}
                className="shrink-0 text-neutral-400 hover:text-red-500"
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ol>
      )}
      {items.length < maxItems && (
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
            placeholder={placeholder}
            aria-label="Nuevo ítem"
            maxLength={140}
            className="w-full rounded-xl border border-[#D6D6DC] bg-[#EBEBEF] px-3 py-2.5 text-[15px] outline-none placeholder:text-neutral-400 focus:border-[#E0698F]"
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!draft.trim()}
            aria-label="Añadir ítem"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
        </div>
      )}
      <p className="text-right text-[11px] font-bold text-[#6B6B76]">
        {items.length}/{maxItems}
      </p>
    </div>
  );
}

