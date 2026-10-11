"use client";

import { useEffect, useState } from "react";
import { LetterViewer } from "@/components/viewer/LetterViewer";
import type { LetterView } from "@/components/viewer/types";

interface PreviewMsg {
  source?: string;
  letter?: LetterView;
  go?: { key: string; n: number };
}

/** Ruta interna de previsualización: renderiza lo que el wizard envía por postMessage. Sin guardar nada. */
export default function PreviewClient() {
  const [letter, setLetter] = useState<LetterView | null>(null);
  const [scrollSignal, setScrollSignal] = useState<{ key: string; n: number } | null>(null);

  useEffect(() => {
    const onMsg = (e: MessageEvent<PreviewMsg>) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data;
      if (!data || data.source !== "openletter-preview") return;
      if (data.letter) setLetter(data.letter);
      if (data.go) setScrollSignal(data.go);
    };
    window.addEventListener("message", onMsg);
    // Avisa al padre de que está listo para recibir el borrador.
    window.parent.postMessage({ source: "openletter-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  if (!letter) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F4F4F6] p-6 text-center">
        <p className="text-sm font-semibold text-[#6B6B76]">
          Escribe en el asistente y verás tu carta aquí al instante.
        </p>
      </div>
    );
  }
  return <LetterViewer letter={letter} preview scrollSignal={scrollSignal} />;
}
