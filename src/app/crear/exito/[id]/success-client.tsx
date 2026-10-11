"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Copy, Check, Eye, Share2, Trash2 } from "lucide-react";

export default function ExitoPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [token] = useState(() => {
    if (typeof window === "undefined") return "";
    const m = window.location.hash.match(/token=([a-f0-9]+)/);
    return m ? m[1] : "";
  });
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const url = `/c/${id}`;
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const fullUrl = origin ? `${origin}/c/${id}` : url;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = fullUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Una carta para ti", url: fullUrl });
      } catch { /* cancelado */ }
    } else {
      void copy();
    }
  };

  const remove = async () => {
    if (!confirm("¿Eliminar esta carta ahora mismo? No se podrá recuperar.")) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/cartas/${id}`, {
        method: "DELETE",
        headers: { "x-manage-token": token },
      });
      if (res.status === 204) {
        setDeleted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteError((data as { error?: string }).error ?? "No se pudo eliminar.");
      }
    } catch {
      setDeleteError("Error de red.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center bg-[#F4F4F6] px-6 py-16 text-center">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md">
        {/* Confeti rosa sutil (una sola vez, CSS puro) */}
        <div aria-hidden className="pointer-events-none relative mx-auto h-16 w-64">
          {Array.from({ length: 18 }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ y: -10, opacity: 0, rotate: 0 }}
              animate={{ y: [0, 46], opacity: [0, 1, 0], rotate: 180 }}
              transition={{ duration: 1.6, delay: i * 0.06, ease: "easeOut" }}
              className="absolute top-0 h-2 w-1.5 rounded-sm"
              style={{
                left: `${(i * 53) % 100}%`,
                background: i % 3 === 0 ? "#E0698F" : i % 3 === 1 ? "#F8BBD0" : "#D6457F",
              }}
            />
          ))}
        </div>

        <h1 className="text-4xl font-light text-neutral-900">Tu carta está <em>lista</em></h1>
        <p className="mt-2 text-sm text-[#6B6B76]">Compártela con esa persona especial.</p>

        <div className="mt-6 rounded-3xl border border-[#E4E4E8] bg-white p-5 text-left shadow-sm">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#6B6B76]">Enlace de tu carta</p>
          <p className="break-all text-sm font-semibold text-neutral-900">{fullUrl || url}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={copy} className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white">
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "¡Copiado!" : "Copiar enlace"}
            </button>
            <Link href={`/c/${id}`} className="flex items-center gap-1.5 rounded-full border border-[#D6D6DC] bg-white px-5 py-2.5 text-sm font-bold text-neutral-800">
              <Eye size={15} /> Ver carta
            </Link>
            <button onClick={share} className="flex items-center gap-1.5 rounded-full border border-[#D6D6DC] bg-white px-5 py-2.5 text-sm font-bold text-neutral-800">
              <Share2 size={15} /> Compartir
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs text-[#6B6B76]">
          Disponible hasta dentro de 7 días. Después se elimina para siempre.
        </p>

        {token && !deleted && (
          <button onClick={remove} disabled={deleting} className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-red-500 disabled:opacity-50">
            <Trash2 size={13} /> {deleting ? "Eliminando…" : "Eliminar ahora"}
          </button>
        )}
        {deleted && <p className="mt-4 text-sm font-bold text-green-600">Carta eliminada para siempre.</p>}
        {deleteError && <p className="mt-4 text-sm font-semibold text-red-500">{deleteError}</p>}
      </motion.div>
    </div>
  );
}
