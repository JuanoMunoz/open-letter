"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { ui } from "@/templates/ui";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel: string;
  danger?: boolean;
}

interface ToastApi {
  toast: (message: string, kind?: ToastKind) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastCtx);
  if (!api) throw new Error("useToast necesita <ToastProvider>");
  return api;
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<(ConfirmOptions & { id: number }) | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = nextId++;
    setItems((prev) => [...prev.slice(-2), { id, kind, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setPending({ ...opts, id: nextId++ });
    });
  }, []);

  const answer = (v: boolean) => {
    setPending(null);
    resolver.current?.(v);
    resolver.current = null;
  };

  const api = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {/* Avisos */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-full bg-neutral-900 py-2.5 pl-4 pr-5 text-sm font-semibold text-white shadow-xl"
            >
              {t.kind === "success" ? (
                <CheckCircle2 size={16} className="shrink-0 text-green-400" />
              ) : t.kind === "error" ? (
                <AlertCircle size={16} className="shrink-0 text-red-400" />
              ) : (
                <Info size={16} className="shrink-0 text-sky-300" />
              )}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {/* Confirmación */}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => answer(false)}
          >
            <motion.div
              initial={{ y: 24, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 12, scale: 0.98 }}
              role="alertdialog"
              aria-modal="true"
              aria-label={pending.title}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-2xl"
            >
              <p className="text-[15px] font-bold text-neutral-900">{pending.title}</p>
              {pending.body && <p className="mt-1 text-sm text-[#6B6B76]">{pending.body}</p>}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => answer(false)}
                  autoFocus
                  className="flex-1 rounded-full border border-[#D6D6DC] bg-white px-4 py-2.5 text-sm font-bold text-neutral-700"
                >
                  {ui.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => answer(true)}
                  className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold text-white ${pending.danger ? "bg-red-500" : "bg-neutral-900"}`}
                >
                  {pending.confirmLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastCtx.Provider>
  );
}
