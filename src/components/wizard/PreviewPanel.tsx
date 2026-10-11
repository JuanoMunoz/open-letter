"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Monitor, Smartphone, RotateCw, Maximize2, X } from "lucide-react";
import type { LetterView } from "@/components/viewer/types";

/** Panel de vista previa en vivo (iframe /preview + postMessage con debounce). */
export function PreviewPanel({
  letter,
  scrollKey,
  drawer,
  onCloseDrawer,
}: {
  letter: LetterView | null;
  scrollKey: { key: string; n: number } | null;
  drawer?: boolean;
  onCloseDrawer?: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [ready, setReady] = useState(false);
  const letterRef = useRef(letter);
  useEffect(() => {
    letterRef.current = letter;
  });

  // El preview avisa cuando está listo; reenvía el último borrador.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if ((e.data as { source?: string })?.source === "openletter-preview-ready") {
        setReady(true);
        if (letterRef.current) {
          iframeRef.current?.contentWindow?.postMessage(
            { source: "openletter-preview", letter: letterRef.current },
            window.location.origin,
          );
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Borrador con debounce de 300 ms.
  useEffect(() => {
    if (!ready || !letter) return;
    const t = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        { source: "openletter-preview", letter },
        window.location.origin,
      );
    }, 300);
    return () => clearTimeout(t);
  }, [letter, ready]);

  // Salto a sección (inmediato, sin debounce).
  useEffect(() => {
    if (!ready || !scrollKey) return;
    iframeRef.current?.contentWindow?.postMessage(
      { source: "openletter-preview", go: scrollKey },
      window.location.origin,
    );
  }, [scrollKey, ready]);

  const reload = () => {
    if (letterRef.current) {
      iframeRef.current?.contentWindow?.postMessage(
        { source: "openletter-preview", letter: letterRef.current },
        window.location.origin,
      );
    }
  };

  const frame = (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[#E4E4E8] bg-white shadow-[0_20px_60px_rgba(0,0,0,.15)]">
      <div className="flex items-center gap-1.5 border-b border-[#E4E4E8] px-3 py-2">
        <div className="flex rounded-full bg-[#EBEBEF] p-0.5">
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            aria-pressed={device === "mobile"}
            aria-label="Vista móvil"
            className={`flex h-7 w-7 items-center justify-center rounded-full ${device === "mobile" ? "bg-white shadow" : "text-neutral-400"}`}
          >
            <Smartphone size={14} />
          </button>
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            aria-pressed={device === "desktop"}
            aria-label="Vista escritorio"
            className={`flex h-7 w-7 items-center justify-center rounded-full ${device === "desktop" ? "bg-white shadow" : "text-neutral-400"}`}
          >
            <Monitor size={14} />
          </button>
        </div>
        <span className="ml-1 text-[11px] font-bold uppercase tracking-wide text-[#6B6B76]">Vista previa</span>
        <span className="ml-auto flex gap-1">
          <button type="button" onClick={reload} aria-label="Recargar vista previa" className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 hover:bg-[#EBEBEF]">
            <RotateCw size={14} />
          </button>
          <button
            type="button"
            onClick={() => window.open("/preview", "_blank", "noopener")}
            aria-label="Abrir vista previa en pantalla completa"
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 hover:bg-[#EBEBEF]"
          >
            <Maximize2 size={14} />
          </button>
          {drawer && (
            <button type="button" onClick={onCloseDrawer} aria-label="Cerrar vista previa" className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EBEBEF] text-neutral-600">
              <X size={15} />
            </button>
          )}
        </span>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-hidden bg-[#EDEDF1] p-3">
        <iframe
          ref={iframeRef}
          title="Vista previa de la carta"
          src="/preview"
          loading="lazy"
          className="h-full rounded-[20px] border border-[#D6D6DC] bg-white"
          style={{ width: device === "mobile" ? 300 : "100%", maxWidth: "100%" }}
        />
      </div>
    </div>
  );

  if (drawer) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Vista previa">
        <div className="mx-auto h-full max-w-lg">{frame}</div>
      </div>
    );
  }
  return frame;
}

/** Botón flotante (móvil) para abrir la vista previa. */
export function PreviewFab({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Abrir vista previa"
      className="fixed bottom-24 right-4 z-40 flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-3 text-sm font-bold text-white shadow-xl lg:hidden"
    >
      <Eye size={16} /> Vista previa
    </button>
  );
}
