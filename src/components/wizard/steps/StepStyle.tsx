"use client";

import { Moon, Lock, CalendarClock } from "lucide-react";
import {
  THEME_COLOR_IDS,
  THEME_FONTS,
  THEME_PARTICLES,
  THEME_BACKGROUNDS,
  THEME_PALETTES,
  type ThemeColorId,
} from "@/templates/theme-palettes";
import { formatExpiry } from "@/lib/dates";
import { expiresAtFromNow } from "@/lib/expiry";
import type { LetterTemplate } from "@/templates/types";

export interface StyleState {
  colorId?: string;
  font?: string;
  particles?: string;
  background?: string;
  nightMode?: boolean;
  opening?: string;
}

const FONT_LABEL: Record<string, string> = { caveat: "Caveat", kalam: "Kalam", dancing: "Dancing Script" };
const PARTICLE_LABEL: Record<string, string> = {
  petalos: "Pétalos",
  corazones: "Corazones",
  estrellas: "Estrellas",
  confeti: "Confeti",
  nieve: "Nieve",
  ninguna: "Ninguna",
};
const BG_LABEL: Record<string, string> = { foto: "Foto difuminada", liso: "Color liso" };

/** Paso 4: estilo con vista previa de opciones + resumen. */
export function StepStyle({
  template,
  value,
  onPatch,
  photoCount,
  sectionCount,
}: {
  template: LetterTemplate;
  value: StyleState;
  onPatch: (p: Partial<StyleState>) => void;
  photoCount: number;
  sectionCount: number;
}) {
  const [a, b, c] = template.wizard.step4Title;
  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-xs font-bold transition border-2 ${active ? "border-transparent text-white" : "border-[#E4E4E8] bg-white text-neutral-600"}`;

  return (
    <div className="space-y-7">
      <h1 className="font-editorial mb-2 text-[42px] leading-[1.05] text-neutral-900 sm:text-[60px]">
        {a} <em>{b}</em> {c}
      </h1>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#6B6B76]">Color</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onPatch({ colorId: undefined })}
            aria-pressed={!value.colorId}
            className={chip(!value.colorId)}
            style={!value.colorId ? { background: template.theme.brand } : undefined}
          >
            {template.name}
          </button>
          {THEME_COLOR_IDS.map((id: ThemeColorId) => (
            <button
              key={id}
              type="button"
              onClick={() => onPatch({ colorId: id })}
              aria-pressed={value.colorId === id}
              className={chip(value.colorId === id)}
              style={value.colorId === id ? { background: THEME_PALETTES[id].brand } : undefined}
            >
              <span
                className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
                style={{ background: THEME_PALETTES[id].brand }}
              />
              {id.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#6B6B76]">Letra de la carta</p>
        <div className="flex flex-wrap gap-2">
          {THEME_FONTS.map((f) => {
            const active = (value.font ?? template.theme.font) === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => onPatch({ font: f })}
                aria-pressed={active}
                className={chip(active)}
                style={active ? { background: "var(--brand, #E0698F)" } : undefined}
              >
                <span className={f === "kalam" ? "font-kalam" : f === "dancing" ? "font-dancing" : "font-script"} style={{ fontSize: 17 }}>
                  {FONT_LABEL[f]} Ag
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#6B6B76]">Partículas</p>
        <div className="flex flex-wrap gap-2">
          {THEME_PARTICLES.map((p) => {
            const active = (value.particles ?? template.particles) === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPatch({ particles: p })}
                aria-pressed={active}
                className={chip(active)}
                style={active ? { background: "var(--brand, #E0698F)" } : undefined}
              >
                {PARTICLE_LABEL[p]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#6B6B76]">Fondo</p>
        <div className="flex flex-wrap gap-2">
          {THEME_BACKGROUNDS.map((bg) => {
            const active = (value.background ?? "foto") === bg;
            return (
              <button
                key={bg}
                type="button"
                onClick={() => onPatch({ background: bg })}
                aria-pressed={active}
                className={chip(active)}
                style={active ? { background: "var(--brand, #E0698F)" } : undefined}
              >
                {BG_LABEL[bg]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#6B6B76]">Apertura</p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "sobre", label: "Sobre" },
            { id: "ninguna", label: "Directa" },
          ].map((o) => {
            const active = (value.opening ?? template.opening) === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onPatch({ opening: o.id })}
                aria-pressed={active}
                className={chip(active)}
                style={active ? { background: "var(--brand, #E0698F)" } : undefined}
              >
                {o.label}
              </button>
            );
          })}
          {(["regalo", "raspadita"] as const).map((o) => (
            <span key={o} className="rounded-full border-2 border-dashed border-[#D6D6DC] px-3.5 py-1.5 text-xs font-bold text-neutral-400">
              {o === "regalo" ? "Regalo" : "Raspadita"} · pronto
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={!!value.nightMode}
        aria-label="Modo noche del visor"
        onClick={() => onPatch({ nightMode: !value.nightMode })}
        className="flex w-full items-center gap-2.5 rounded-2xl border border-[#E4E4E8] bg-white p-4 text-left"
      >
        <Moon size={18} className="text-neutral-600" />
        <span>
          <span className="block text-sm font-bold">Modo noche</span>
          <span className="block text-xs text-[#6B6B76]">Quien la lea puede cambiarlo dentro de la carta</span>
        </span>
        <span
          className="relative ml-auto h-6 w-11 shrink-0 rounded-full transition"
          style={{ background: value.nightMode ? "var(--brand, #E0698F)" : "#D6D6DC" }}
        >
          <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow" style={{ left: value.nightMode ? "22px" : "2px" }} />
        </span>
      </button>

      <hr className="border-[#E4E4E8]" />

      {/* Resumen */}
      <div className="rounded-3xl border border-[#E4E4E8] bg-white p-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[#6B6B76]">Resumen</p>
        <ul className="space-y-1.5 text-sm text-neutral-700">
          <li>
            <strong>{template.emoji} {template.name}</strong> · {sectionCount} sección(es) con texto · {photoCount} foto(s)
          </li>
          <li className="flex items-center gap-1.5 text-[#6B6B76]">
            <CalendarClock size={14} /> Disponible hasta {formatExpiry(expiresAtFromNow(new Date()))}. Después se elimina para siempre.
          </li>
          <li className="flex items-center gap-1.5 text-[#6B6B76]">
            <Lock size={14} /> Muy pronto: palabra secreta y respuestas del destinatario.
          </li>
        </ul>
      </div>
    </div>
  );
}
