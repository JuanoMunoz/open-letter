"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Efecto máquina de escribir: arranca solo cuando `active` (sección visible),
 * no se reinicia al volver (el padre mantiene `done`), y clic completa al instante.
 * Con prefers-reduced-motion muestra el texto completo.
 */
export function useTypewriter(
  text: string,
  active: boolean,
  speed = 35,
): { shown: string; done: boolean; complete: () => void } {
  const [prefersReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  const [count, setCount] = useState(() => (prefersReduced ? text.length : 0));
  const [manualDone, setManualDone] = useState(() => prefersReduced);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = prefersReduced;
  const done = manualDone || count >= text.length;

  useEffect(() => {
    if (reduced) return; // init perezoso ya muestra el texto completo
    if (!active || done) return;
    const ch = text[count] ?? "";
    let delay = speed + Math.random() * speed * 0.43; // ±~15ms sobre 35ms
    if (ch === "." || ch === ",") delay += 250;
    timer.current = setTimeout(() => setCount((c) => Math.min(c + 1, text.length)), delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, active, count, done, speed, reduced]);

  const complete = () => {
    if (timer.current) clearTimeout(timer.current);
    setCount(text.length);
    setManualDone(true);
  };

  return { shown: text.slice(0, count), done, complete };
}

export function TypewriterText({
  text,
  active,
  className,
  ariaLabel,
}: {
  text: string;
  active: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const { shown, done, complete } = useTypewriter(text, active);
  return (
    <p
      className={className}
      aria-label={ariaLabel ?? text}
      onClick={() => !done && complete()}
      style={{ cursor: done ? "default" : "pointer" }}
    >
      <span aria-hidden>{shown}</span>
      {!done && <span className="type-cursor" aria-hidden />}
    </p>
  );
}
