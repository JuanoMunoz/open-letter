"use client";

import { useRef, useState, createElement } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Maximize2, Undo2, Redo2, Trash2, Sparkles } from "lucide-react";
import { FieldCounter } from "./FieldCounter";
import { ExpandModalEditor } from "./ExpandableTextarea";
import { EmojiButton } from "./EmojiButton";
import { ItemsEditor, type OpenPair } from "./ItemsEditor";
import { sectionIcon } from "@/components/viewer/icons";
import type { WizardSection } from "./sections-model";

/** Tarjeta de sección: arrastre, toggle, chips, estado, undo/redo, emoji, expandir. */
export function SectionEditor({
  section,
  onChange,
  onRemove,
}: {
  section: WizardSection;
  onChange: (s: WizardSection) => void;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.uid,
  });
  const [expandOpen, setExpandOpen] = useState(false);
  const [expandDraft, setExpandDraft] = useState(section.body);
  const [focused, setFocused] = useState(false);
  const [hist, setHist] = useState<{ past: string[]; future: string[] }>({ past: [], future: [] });
  const areaRef = useRef<HTMLTextAreaElement>(null);

  /** Guarda instantánea (se llama en pausas: blur, expandir, insertar). */
  const commit = (body: string) =>
    setHist((h) => (h.past[h.past.length - 1] === body ? h : { past: [...h.past.slice(-49), body], future: [] }));

  const setBody = (body: string) => onChange({ ...section, body: body.slice(0, section.maxLength) });

  const undo = () => {
    const prev = hist.past[hist.past.length - 1];
    if (prev === undefined) return;
    setHist({ past: hist.past.slice(0, -1), future: [...hist.future, section.body] });
    onChange({ ...section, body: prev });
  };
  const redo = () => {
    const next = hist.future[hist.future.length - 1];
    if (next === undefined) return;
    setHist({ past: [...hist.past, section.body], future: hist.future.slice(0, -1) });
    onChange({ ...section, body: next });
  };

  const insertAtCursor = (text: string) => {
    const el = areaRef.current;
    const start = el?.selectionStart ?? section.body.length;
    const end = el?.selectionEnd ?? start;
    const next = (section.body.slice(0, start) + text + section.body.slice(end)).slice(0, section.maxLength);
    commit(section.body);
    onChange({ ...section, body: next });
    requestAnimationFrame(() => {
      if (areaRef.current) {
        const pos = Math.min(start + text.length, next.length);
        areaRef.current.focus();
        areaRef.current.setSelectionRange(pos, pos);
      }
    });
  };

  const words = section.body.trim() ? section.body.trim().split(/\s+/).length : 0;
  const readSecs = Math.max(1, Math.round((words / 200) * 60));
  const isList = section.kind === "reasons" || section.kind === "promises" || section.kind === "openwhen";
  const Icon = sectionIcon(section.icon);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className={`rounded-3xl border bg-white p-4 shadow-sm transition ${section.enabled ? "border-[#E4E4E8]" : "border-dashed border-[#D6D6DC] opacity-75"}`}
    >
      {/* Cabecera: asa + icono + título + toggle */}
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reordenar ${section.title || "sección"}`}
          className="flex h-8 w-6 cursor-grab items-center justify-center rounded text-neutral-400 active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl text-sm" style={{ background: "var(--brand-soft, #FBE4EC)", color: "var(--brand, #D6457F)" }}>
          {createElement(Icon, { size: 16 })}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-[#6B6B76]">
            {section.title || section.key}
            {section.required && <span style={{ color: "var(--brand, #E0698F)" }}> *</span>}
          </p>
        </div>
        <FieldCounter value={section.body.length} max={section.maxLength} />
        {!section.required && (
          <button
            type="button"
            role="switch"
            aria-checked={section.enabled}
            aria-label={`Incluir ${section.title} en la carta`}
            onClick={() => onChange({ ...section, enabled: !section.enabled })}
            className="relative h-6 w-11 shrink-0 rounded-full transition"
            style={{ background: section.enabled ? "var(--brand, #E0698F)" : "#D6D6DC" }}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
              style={{ left: section.enabled ? "22px" : "2px" }}
            />
          </button>
        )}
        {section.custom && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Quitar ${section.title}`}
            className="text-neutral-400 hover:text-red-500"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {section.enabled && (
        <>
          {!isList && (
            <div className="relative">
              <textarea
                ref={areaRef}
                value={section.body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                  setFocused(false);
                  commit(section.body);
                }}
                placeholder={section.placeholder}
                rows={section.required ? 7 : 4}
                aria-label={section.title}
                className="w-full resize-y rounded-2xl border border-[#D6D6DC] bg-[#EBEBEF] px-4 py-3 pr-11 text-[16px] leading-relaxed outline-none placeholder:text-neutral-400 focus:border-[#E0698F]"
              />
              <button
                type="button"
                onClick={() => {
                  setExpandDraft(section.body);
                  setExpandOpen(true);
                }}
                aria-label={`Expandir ${section.title}`}
                className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          )}

          {isList && (
            <ItemsEditor
              kind={section.kind as "reasons" | "promises" | "openwhen"}
              items={section.items}
              pairs={section.pairs}
              onItems={(items) => onChange({ ...section, items })}
              onPairs={(pairs: OpenPair[]) => onChange({ ...section, pairs })}
              maxItems={section.kind === "openwhen" ? 5 : section.kind === "promises" ? 10 : 20}
              placeholder={section.placeholder}
            />
          )}

          {/* Chips de arranque */}
          {!isList && !section.body.trim() && section.suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {section.suggestions.slice(0, 5).map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => insertAtCursor(sug)}
                  className="rounded-full border border-[#D6D6DC] bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:border-[#E0698F]"
                >
                  {sug.length > 42 ? sug.slice(0, 42) + "…" : sug}
                </button>
              ))}
            </div>
          )}

          {/* Vista previa tipográfica al enfocar */}
          {!isList && focused && section.body.trim() && (
            <p className="font-letter mt-2 truncate rounded-xl bg-[#F4F4F6] px-3 py-2 text-[18px] text-[#3A3A44]">
              {section.body.split("\n").slice(0, 2).join(" ").slice(0, 90)}
            </p>
          )}

          {/* Barra de estado + herramientas */}
          <div className="mt-2 flex items-center gap-1.5">
            <p className="mr-auto text-[11px] font-semibold text-[#6B6B76]">
              {words} palabras · ≈ {readSecs} s de lectura
              {section.body.length > 900 && (
                <span className="text-orange-500"> · En móvil se lee mejor corto</span>
              )}
            </p>
            {!isList && (
              <>
                <button
                  type="button"
                  onClick={undo}
                  disabled={hist.past.length === 0}
                  aria-label="Deshacer"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm disabled:opacity-30"
                >
                  <Undo2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={hist.future.length === 0}
                  aria-label="Rehacer"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm disabled:opacity-30"
                >
                  <Redo2 size={14} />
                </button>
                <EmojiButton onPick={(e) => insertAtCursor(e)} />
              </>
            )}
          </div>

          {!isList && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-neutral-400">
              <Sparkles size={11} /> Tip: escribe a mano; el botón Inspírame con IA llegará pronto.
            </p>
          )}
        </>
      )}

      {expandOpen && (
        <ExpandModalEditor
          label={section.title}
          draft={expandDraft}
          onDraft={setExpandDraft}
          onSave={() => {
            commit(section.body);
            onChange({ ...section, body: expandDraft.slice(0, section.maxLength) });
            setExpandOpen(false);
          }}
          onClose={() => setExpandOpen(false)}
          max={section.maxLength}
        />
      )}
    </div>
  );
}
