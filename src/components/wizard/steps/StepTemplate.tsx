"use client";

import { Check } from "lucide-react";
import type { LetterTemplate } from "@/templates/types";

/** Paso 0: selector de plantilla. */
export function StepTemplate({
  allTemplates,
  template,
  onPick,
}: {
  allTemplates: LetterTemplate[];
  template: LetterTemplate;
  onPick: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B76]">
        Elige la plantilla
      </p>
      <h1 className="font-editorial mb-6 text-[42px] leading-[1.05] text-neutral-900 sm:text-[60px]">
        ¿Qué quieres <em>celebrar</em>?
      </h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {allTemplates.map((t) => {
          const selected = t.id === template.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t.id)}
              aria-pressed={selected}
              className="rounded-3xl border-2 bg-white p-4 text-left transition"
              style={{
                borderColor: selected ? t.theme.brand : "#E4E4E8",
                boxShadow: selected ? `0 8px 30px ${t.theme.brand}22` : undefined,
              }}
            >
              <span
                className="mb-2 block h-14 overflow-hidden rounded-2xl"
                style={{ background: `linear-gradient(135deg, ${t.theme.bgGradient[0]}, ${t.theme.brandSoft})` }}
              >
                <span className="flex h-full items-center justify-center gap-1 text-lg">
                  <span style={{ color: t.theme.brand }}>● ● ●</span>
                </span>
              </span>
              <span className="text-2xl">{t.emoji}</span>
              <span className="mt-1 block text-[15px] font-bold text-neutral-900">{t.name}</span>
              <span className="block text-xs leading-snug text-[#6B6B76]">{t.tagline}</span>
              {selected && (
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold" style={{ color: t.theme.brand }}>
                  <Check size={13} /> Elegida
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
