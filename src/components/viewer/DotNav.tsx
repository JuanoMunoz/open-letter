"use client";

import type { SectionKind } from "./types";
import { ui } from "@/templates/ui";

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
      aria-label={ui.letterNav}
      className="absolute left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2.5"
    >
      {sections.map((s, i) => (
        <button
          key={s.key}
          onClick={() => onGo(i)}
          aria-label={ui.goToSection(s.label)}
          aria-current={i === active ? "true" : undefined}
          className="flex h-4 w-4 items-center justify-center"
          style={{ cursor: "pointer" }}
        >
          <span
            className="relative block rounded-full bg-white transition-all"
            style={{
              width: i === active ? 11 : 8,
              height: i === active ? 11 : 8,
              background: i === active ? "var(--brand)" : "#fff",
              boxShadow: "0 1px 4px rgba(0,0,0,.18)",
            }}
          >
            {i === active && (
              <span
                className="absolute inset-0 animate-ping rounded-full"
                style={{ background: "color-mix(in srgb, var(--brand) 35%, transparent)" }}
              />
            )}
          </span>
        </button>
      ))}
    </nav>
  );
}
