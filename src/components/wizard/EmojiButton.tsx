"use client";

import { useState, lazy, Suspense, type ComponentType } from "react";

interface PickerProps {
  data: unknown;
  onEmojiSelect: (e: { native: string }) => void;
  locale: string;
  previewPosition: string;
  skinTonePosition: string;
}

const Picker = lazy<ComponentType<PickerProps>>(() =>
  import("emoji-mart").then((m) => ({ default: m.Picker as unknown as ComponentType<PickerProps> })),
);

/** Botón de emoji con picker perezoso (no pesa en el bundle inicial). */
export function EmojiButton({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<object | null>(null);

  const toggle = async () => {
    if (!open && !data) {
      try {
        const mod = await import("@emoji-mart/data");
        const d = (mod as { default?: object }).default ?? (mod as object);
        setData(d);
      } catch {
        return;
      }
    }
    setOpen((v) => !v);
  };

  return (
    <span className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Añadir emoji"
        aria-expanded={open}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-base shadow-sm transition hover:scale-105"
      >
        😊
      </button>
      {open && data && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <span className="absolute bottom-9 right-0 z-50">
            <Suspense fallback={<span className="rounded-xl bg-white px-3 py-2 text-xs shadow">Cargando…</span>}>
              <Picker
                data={data}
                onEmojiSelect={(e: { native: string }) => {
                  onPick(e.native);
                  setOpen(false);
                }}
                locale="es"
                previewPosition="none"
                skinTonePosition="none"
              />
            </Suspense>
          </span>
        </>
      )}
    </span>
  );
}
