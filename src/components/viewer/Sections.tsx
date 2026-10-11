"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Quote, Heart, BookOpen, Rocket, Sparkles, CalendarDays, MapPin, Music2, Maximize2 } from "lucide-react";
import { TypewriterText, useTypewriter } from "./TypewriterText";
import { ExpandModal } from "./ExpandModal";
import { formatLongDate, daysTogetherText, daysTogetherCount } from "@/lib/dates";
import { spotifyEmbedUrl } from "@/lib/spotify";
import type { LetterView, ViewerPhoto } from "./types";

/* ---------- Polaroid que asoma en la esquina superior izquierda ---------- */

export function PolaroidPeek({ photo }: { photo?: ViewerPhoto }) {
  const reduce = useReducedMotion();
  if (!photo) return null;
  return (
    <motion.div
      aria-hidden
      initial={reduce ? { opacity: 0 } : { y: -20, rotate: -14, opacity: 0 }}
      whileInView={{ y: 0, rotate: -8, opacity: 1 }}
      viewport={{ amount: 0.6 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="absolute -left-2 top-6 z-10 h-20 w-16 -rotate-6 rounded-md bg-white p-1 pb-4 shadow-[0_10px_30px_rgba(0,0,0,.2)]"
      style={{ transform: "rotate(-8deg)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt="" className="h-full w-full rounded-sm object-cover" />
    </motion.div>
  );
}

/* ---------- 1. Portada ---------- */

export function SectionCover({ letter }: { letter: LetterView }) {
  const lines = [
    <h2 key="n" className="font-script text-[56px] font-bold leading-none text-[#D6457F] sm:text-[64px]">
      {letter.recipientName}
    </h2>,
    letter.specialDate ? (
      <p key="d" className="mt-3 text-[13px] font-medium text-neutral-500">
        {formatLongDate(letter.specialDate)}
      </p>
    ) : null,
    letter.senderName ? (
      <p key="c" className="mt-5 text-[13px] text-neutral-500">
        Con todo mi amor,
      </p>
    ) : null,
    letter.senderName ? (
      <p key="s" className="font-script mt-1 text-[44px] font-semibold leading-tight text-[#D6457F]">
        {letter.senderName}
      </p>
    ) : null,
    letter.nickname ? (
      <p key="a" className="mt-2 text-[13px] italic text-neutral-500">
        mi {letter.nickname}
      </p>
    ) : null,
  ].filter(Boolean);

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.6 }}
          transition={{ delay: i * 0.15, duration: 0.45 }}
        >
          {line}
        </motion.div>
      ))}
    </div>
  );
}

/* ---------- 2. Mensaje principal (sin tarjeta) ---------- */

export function SectionMessage({ letter, active }: { letter: LetterView; active: boolean }) {
  const [open, setOpen] = useState(false);
  const { shown, done, complete } = useTypewriter(letter.mainMessage, active);
  return (
    <div className="relative flex h-full flex-col px-8 pb-16 pt-20">
      <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#D6457F]/40 text-[#D6457F]">
        <Quote size={18} />
      </span>
      {letter.specialDate && (
        <p className="font-script text-[18px] italic text-neutral-500">{formatLongDate(letter.specialDate)}</p>
      )}
      <p
        className="font-script mt-2 flex-1 overflow-hidden text-[24px] leading-[1.55] text-[#2b2b33]"
        aria-label={letter.mainMessage}
        onClick={() => !done && complete()}
      >
        <span aria-hidden>{shown}</span>
        {!done && <span className="type-cursor" aria-hidden />}
      </p>
      <div className="flex items-end justify-between">
        {letter.senderName ? (
          <p className="font-script text-[22px] text-neutral-600">— {letter.senderName}</p>
        ) : (
          <span />
        )}
        <button
          onClick={() => setOpen(true)}
          aria-label="Leer mensaje completo"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-500 shadow"
        >
          <Maximize2 size={14} />
        </button>
      </div>
      <AnimatePresence>
        {open && <ExpandModal title="Mensaje" text={letter.mainMessage} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ---------- 3-5. Tarjetas de texto ---------- */

const CARD_META = {
  loveText: { icon: Heart, title: "Lo que más amo de ti" },
  storyText: { icon: BookOpen, title: "Nuestra historia" },
  dreamsText: { icon: Rocket, title: "Sueños juntos" },
} as const;

export function SectionCard({
  letter,
  field,
  active,
  polaroid,
}: {
  letter: LetterView;
  field: keyof typeof CARD_META;
  active: boolean;
  polaroid?: ViewerPhoto;
}) {
  const text = letter[field] ?? "";
  const [open, setOpen] = useState(false);
  const { icon: Icon, title } = CARD_META[field];
  return (
    <div className="relative flex h-full items-center justify-center px-6">
      <PolaroidPeek photo={polaroid} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        whileInView={{ scale: 1, opacity: 1, y: 0 }}
        viewport={{ amount: 0.5 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="relative max-h-[82%] w-[86%] overflow-y-auto rounded-[28px] bg-[rgba(255,255,255,.88)] p-5 shadow-[0_10px_40px_rgba(214,69,127,.10)] backdrop-blur-xl sm:p-6"
      >
        <button
          onClick={() => setOpen(true)}
          aria-label={`Leer ${title} completo`}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-white text-neutral-400 shadow-sm"
        >
          <Maximize2 size={13} />
        </button>
        <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBE4EC] text-[#D6457F]">
          <Icon size={18} />
        </span>
        <h3 className="font-script mb-2 text-center text-[30px] font-semibold text-neutral-900">{title}</h3>
        <TypewriterText
          text={text}
          active={active}
          className="font-script whitespace-pre-wrap text-[22px] leading-[1.5] text-[#3A3A44]"
        />
      </motion.div>
      <AnimatePresence>
        {open && <ExpandModal title={title} text={text} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ---------- 6. Foto a pantalla completa ---------- */

export function SectionPhoto({ photo }: { photo: ViewerPhoto }) {
  return (
    <div className="relative h-full w-full">
      <motion.img
        src={photo.url}
        alt={photo.caption ?? "Foto de la carta"}
        initial={{ scale: 1.08 }}
        whileInView={{ scale: 1 }}
        viewport={{ amount: 0.6 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="h-full w-full object-cover"
      />
      {(photo.caption || photo.takenOn || photo.place) && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/95 via-white/70 to-transparent px-6 pb-10 pt-16">
          {photo.caption && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.6 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="font-script text-[24px] leading-snug text-neutral-900"
            >
              {photo.caption}
            </motion.p>
          )}
          <div className="mt-1 flex flex-wrap gap-3 text-[13px] text-neutral-600">
            {photo.takenOn && (
              <span className="flex items-center gap-1">
                <CalendarDays size={13} /> {formatLongDate(photo.takenOn)}
              </span>
            )}
            {photo.place && (
              <span className="flex items-center gap-1">
                <MapPin size={13} /> {photo.place}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 7. Nuestro Capítulo ---------- */

function useCountUp(target: number, active: boolean, duration = 1200) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(() => (reduce ? target : 0));
  useEffect(() => {
    if (!active || reduce) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration, reduce]);
  return n;
}

export function SectionChapter({ letter, active }: { letter: LetterView; active: boolean }) {
  const target = daysTogetherCount(letter.specialDate!, new Date());
  const n = useCountUp(Math.abs(target), active);
  return (
    <div className="flex h-full items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        whileInView={{ scale: 1, opacity: 1, y: 0 }}
        viewport={{ amount: 0.5 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="w-[86%] rounded-[28px] bg-[rgba(255,255,255,.88)] p-5 text-center shadow-[0_10px_40px_rgba(214,69,127,.10)] backdrop-blur-xl"
      >
        <div className="mb-1 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBE4EC] text-[#D6457F]">
            <Sparkles size={18} />
          </span>
          <h3 className="font-script text-[30px] font-semibold text-neutral-900">Nuestro Capítulo</h3>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBE4EC] text-[#D6457F]">
            <CalendarDays size={16} />
          </span>
          <div className="text-left">
            <p className="text-[13px] italic text-neutral-500">Fecha especial</p>
            <p className="font-script text-[28px] font-semibold leading-tight text-neutral-900">
              {formatLongDate(letter.specialDate!)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-sm font-bold text-[#D6457F]" aria-live="polite">
          {target === 0 ? "¡Hoy es el día!" : target > 0 ? `${n} días juntos` : `Faltan ${n} días`}
        </p>
        <span className="sr-only">{daysTogetherText(letter.specialDate!, new Date())}</span>
      </motion.div>
    </div>
  );
}

/* ---------- 8. Nuestra Canción ---------- */

export function SectionSong({ letter, active }: { letter: LetterView; active: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  void active;
  return (
    <div ref={ref} className="flex h-full items-center justify-center px-6">
      <div className="w-[86%] rounded-[28px] bg-[rgba(255,255,255,.88)] p-5 shadow-[0_10px_40px_rgba(214,69,127,.10)] backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBE4EC] text-[#D6457F]">
            <Music2 size={18} />
          </span>
          <h3 className="font-script text-[30px] font-semibold text-neutral-900">Nuestra Canción</h3>
          <button
            onClick={() => setOpen(true)}
            aria-label="Ampliar canción"
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-white text-neutral-400 shadow-sm"
          >
            <Maximize2 size={13} />
          </button>
        </div>
        {inView ? (
          <iframe
            src={spotifyEmbedUrl(letter.spotifyTrackId!)}
            width="100%"
            height="152"
            style={{ borderRadius: 12, border: 0 }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Canción de Spotify"
          />
        ) : (
          <div className="flex h-[152px] items-center justify-center rounded-xl bg-[#FBE4EC] text-sm font-semibold text-[#D6457F]">
            Cargando canción…
          </div>
        )}
      </div>
      <AnimatePresence>
        {open && (
          <ExpandModal title="Nuestra Canción" text={`open.spotify.com/track/${letter.spotifyTrackId}`} onClose={() => setOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
