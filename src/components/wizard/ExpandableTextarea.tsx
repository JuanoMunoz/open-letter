"use client";

import { useState } from "react";
import { Maximize2, X } from "lucide-react";
import { FieldCounter, FieldLabel } from "./FieldCounter";

export function ExpandableTextarea({
  id,
  label,
  accent,
  required,
  value,
  onChange,
  placeholder,
  max = 1200,
  rows = 7,
}: {
  id: string;
  label: string;
  accent?: boolean;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
  rows?: number;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const openModal = () => {
    setDraft(value);
    setOpen(true);
  };

  return (
    <div>
      <FieldLabel htmlFor={id} accent={accent} required={required} right={<FieldCounter value={value.length} max={max} />}>
        {label}
      </FieldLabel>
      <div className="relative">
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, max))}
          placeholder={placeholder}
          rows={rows}
          className="w-full resize-y rounded-2xl border border-[#D6D6DC] bg-[#EBEBEF] px-4 py-3 pr-11 text-[16px] leading-relaxed text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[#E0698F] focus:ring-4 focus:ring-[#E0698F]/20"
        />
        <button
          type="button"
          onClick={openModal}
          aria-label={`Expandir ${label}`}
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm transition hover:text-[#E0698F]"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Editar ${label}`}
        >
          <div
            className="flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-3xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#E0698F]">{label}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EBEBEF] text-neutral-600 hover:text-neutral-900"
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, max))}
              rows={14}
              className="w-full flex-1 resize-y rounded-2xl border border-[#D6D6DC] bg-[#EBEBEF] px-4 py-3 text-[16px] leading-relaxed outline-none focus:border-[#E0698F]"
            />
            <div className="mt-3 flex items-center justify-between">
              <FieldCounter value={draft.length} max={max} />
              <button
                type="button"
                onClick={() => {
                  onChange(draft);
                  setOpen(false);
                }}
                className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-bold text-white"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
