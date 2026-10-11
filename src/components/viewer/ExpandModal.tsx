"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";

/** Modal de texto completo con focus trap, Esc y clic fuera. */
export function ExpandModal({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        // Focus trap mínimo: cicla dentro de la tarjeta.
        const card = cardRef.current;
        if (!card) return;
        const focusables = card.querySelectorAll<HTMLElement>(
          'button, [href], textarea, input, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 p-5 backdrop-blur-xl"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        ref={cardRef}
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80%] w-[86%] overflow-y-auto rounded-[28px] bg-white/95 p-6 shadow-[0_10px_40px_rgba(214,69,127,.15)]"
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-letter text-[28px] font-semibold text-neutral-900">{title}</h3>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EBEBEF] text-neutral-600"
          >
            <X size={16} />
          </button>
        </div>
        <p className="font-letter whitespace-pre-wrap text-[22px] leading-[1.5] text-[#3A3A44]">{text}</p>
      </motion.div>
    </motion.div>
  );
}
