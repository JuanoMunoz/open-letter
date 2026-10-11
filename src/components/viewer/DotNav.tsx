"use client";

import type { SectionKind } from "./types";

export function DotNav({
  sections,
  active,
  onGo,
}: {
  sections: SectionKind[];
  active: number;
  onGo: (i: number) => void;
}) {
  return (
    <nav
      aria-label="Navegación de la carta"
      className="absolute left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2.5"
    >
      {sections.map((s, i) => (
        <button
          key={s.key}
          onClick={() => onGo(i)}
          aria-label={`Ir a ${s.label}`}
          aria-current={i === active ? "true" : undefined}
          className="flex h-4 w-4 items-center justify-center"
          style={{ cursor: "pointer" }}
        >
          <span
            className="relative block rounded-full bg-white transition-all"
            style={{
              width: i === active ? 11 : 8,
              height: i === active ? 11 : 8,
              background: i === active ? "#D6457F" : "#fff",
              boxShadow: "0 1px 4px rgba(0,0,0,.18)",
            }}
          >
            {i === active && (
              <span
                className="absolute inset-0 animate-ping rounded-full"
                style={{ background: "rgba(214,69,127,.35)" }}
              />
            )}
          </span>
        </button>
      ))}
    </nav>
  );
}
