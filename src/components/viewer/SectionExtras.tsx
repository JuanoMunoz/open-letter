"use client";

import { useEffect, useRef, useState, createElement } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, MailOpen, Check, CalendarDays } from "lucide-react";
import { sectionIcon } from "./icons";
import { formatLongDate } from "@/lib/dates";
import type { SectionItem } from "@/templates/types";
import type { ViewerPhoto, ViewerAudio } from "./types";

function CardShell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="relative flex h-full items-center justify-center px-6">
      <div
        className={`night-card relative max-h-[84%] ${wide ? "w-[90%]" : "w-[86%]"} overflow-y-auto rounded-[28px] bg-[rgba(255,255,255,.88)] p-5 shadow-[0_10px_40px_rgba(214,69,127,.10)] backdrop-blur-xl sm:p-6`}
      >
        {children}
      </div>
    </div>
  );
}

function CardHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <>
      <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
        {createElement(sectionIcon(icon), { size: 18 })}
      </span>
      <h3 className="font-letter mb-3 text-center text-[30px] font-semibold text-neutral-900">{title}</h3>
    </>
  );
}

/** Lista numerada: aparecen una por una con pop al hacer scroll interno. */
export function SectionReasons({ item }: { item: SectionItem }) {
  return (
    <CardShell>
      <CardHeader title={item.title || "Razones"} icon={item.icon} />
      {item.body.trim() && (
        <p className="font-letter mb-3 text-center text-[20px] italic text-[#3A3A44]">{item.body}</p>
      )}
      <ol className="space-y-2">
        {(item.items ?? []).map((it, i) => (
          <motion.li
            key={i}
            initial={{ scale: 0.85, opacity: 0, y: 10 }}
            whileInView={{ scale: 1, opacity: 1, y: 0 }}
            viewport={{ amount: 0.6 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="flex items-center gap-2.5 rounded-2xl bg-white/70 px-3.5 py-2.5 shadow-sm"
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: "var(--brand)" }}
            >
              {i + 1}
            </span>
            <span className="font-letter text-[21px] leading-snug text-[#3A3A44]">{it}</span>
          </motion.li>
        ))}
      </ol>
    </CardShell>
  );
}

/** Mini sobres que se abren al tocarlos. */
export function SectionOpenWhen({ item }: { item: SectionItem }) {
  const [openIx, setOpenIx] = useState<number | null>(null);
  const pairs = item.pairs ?? [];
  return (
    <CardShell wide>
      <CardHeader title={item.title || "Ábrela cuando…"} icon={item.icon} />
      <div className="grid grid-cols-1 gap-2">
        {pairs.map((p, i) => {
          const open = openIx === i;
          return (
            <div key={i} className="overflow-hidden rounded-2xl bg-white/70 shadow-sm">
              <button
                type="button"
                onClick={() => setOpenIx(open ? null : i)}
                aria-expanded={open}
                className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
                  <MailOpen size={16} />
                </span>
                <span className="flex-1 text-sm font-bold text-neutral-800">
                  Ábrela cuando <span className="font-letter text-[19px] font-semibold">{p.when}</span>
                </span>
                <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-neutral-400">▾</motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="font-letter whitespace-pre-wrap px-4 pb-3.5 text-[21px] leading-snug text-[#3A3A44]">
                      {p.text || "…"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </CardShell>
  );
}

/** Promesas con ✓ animado escalonado. */
export function SectionPromises({ item }: { item: SectionItem }) {
  return (
    <CardShell>
      <CardHeader title={item.title || "Prometo"} icon={item.icon} />
      <ul className="space-y-2">
        {(item.items ?? []).map((it, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ amount: 0.6 }}
            transition={{ delay: i * 0.12 }}
            className="flex items-center gap-2.5 rounded-2xl bg-white/70 px-3.5 py-2.5 shadow-sm"
          >
            <motion.span
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ amount: 0.6 }}
              transition={{ delay: i * 0.12 + 0.1, type: "spring", stiffness: 500, damping: 15 }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: "var(--brand)" }}
            >
              <Check size={14} strokeWidth={3} />
            </motion.span>
            <span className="font-letter text-[21px] leading-snug text-[#3A3A44]">{it}</span>
          </motion.li>
        ))}
      </ul>
    </CardShell>
  );
}

/** Hilo vertical: nodos que se encienden y línea que se dibuja. */
export function SectionTimeline({
  items,
}: {
  items: Array<{ date?: string; title: string; body: string; assetId?: string }>;
}) {
  return (
    <div className="relative flex h-full items-center justify-center px-6">
      <div className="night-card relative max-h-[84%] w-[88%] overflow-y-auto rounded-[28px] bg-[rgba(255,255,255,.88)] p-5 shadow-[0_10px_40px_rgba(214,69,127,.10)] backdrop-blur-xl">
        <h3 className="font-letter mb-4 text-center text-[30px] font-semibold text-neutral-900">Recuerdos</h3>
        <div className="relative pl-7">
          {/* Hilo */}
          <svg aria-hidden className="absolute bottom-2 left-[9px] top-2 w-[3px]" preserveAspectRatio="none">
            <motion.line
              x1="1.5" y1="0" x2="1.5" y2="100%"
              stroke="var(--brand, #E0698F)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ amount: 0.3 }}
              transition={{ duration: 1.4, ease: "easeOut" }}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <ul className="space-y-4">
            {items.map((m, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.5 }}
                transition={{ delay: 0.1 }}
                className="relative"
              >
                <motion.span
                  aria-hidden
                  initial={{ backgroundColor: "#E4E4E8", scale: 0.7 }}
                  whileInView={{ backgroundColor: "var(--brand, #E0698F)", scale: 1 }}
                  viewport={{ amount: 0.5 }}
                  transition={{ delay: 0.2 }}
                  className="absolute top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full shadow"
                  style={{ left: "-28px" }}
                />
                {m.date && (
                  <p className="flex items-center gap-1 text-[12px] font-bold uppercase tracking-wide text-[#6B6B76]">
                    <CalendarDays size={12} /> {formatLongDate(m.date)}
                  </p>
                )}
                <p className="font-letter text-[23px] font-semibold leading-tight text-neutral-900">{m.title}</p>
                {m.body && <p className="mt-0.5 text-sm leading-snug text-[#3A3A44]">{m.body}</p>}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Nota de voz: tarjeta "Escucha esto" con reproductor propio. */
export function SectionVoice({ audio }: { audio: ViewerAudio }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(audio.durationS ?? 0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setT(el.currentTime);
    const onMeta = () => setDur(el.duration || audio.durationS || 0);
    const onEnd = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, [audio.durationS]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play();
    setPlaying(!playing);
  };

  const pct = dur > 0 ? Math.min(100, (t / dur) * 100) : 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <CardShell>
      <CardHeader title="Escucha esto" icon="Mic" />
      <audio ref={audioRef} src={audio.url} preload="metadata" />
      {/* Onda decorativa */}
      <div className="mb-3 flex h-12 items-center justify-center gap-[3px]" aria-hidden>
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full"
            style={{
              height: `${10 + Math.abs(Math.sin(i * 0.7)) * 30}px`,
              background: "var(--brand-soft)",
              animation: playing ? `voicemeter 0.9s ease-in-out ${i * 0.04}s infinite alternate` : undefined,
            }}
          />
        ))}
      </div>
      <style>{`@keyframes voicemeter { from { transform: scaleY(0.5); } to { transform: scaleY(1.15); } }`}</style>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pausar nota de voz" : "Reproducir nota de voz"}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg"
          style={{ background: "var(--brand)" }}
        >
          {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
        </button>
        <div className="flex-1">
          <div
            className="h-2 overflow-hidden rounded-full bg-[#EBEBEF]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={Math.round(dur)}
            aria-valuenow={Math.round(t)}
            aria-label="Progreso de la nota de voz"
            onClick={(e) => {
              const el = audioRef.current;
              if (!el || !dur) return;
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              el.currentTime = dur * Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            }}
          >
            <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: "var(--brand)" }} />
          </div>
          <p className="mt-1 text-[11px] font-bold tabular-nums text-[#6B6B76]">
            {fmt(t)} / {fmt(dur)}
          </p>
        </div>
      </div>
    </CardShell>
  );
}
