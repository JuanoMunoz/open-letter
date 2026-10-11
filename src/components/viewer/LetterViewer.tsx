"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BlurBackground } from "./BlurBackground";
import { Particles } from "./Particles";
import { DotNav } from "./DotNav";
import { SealedEnvelope } from "./SealedEnvelope";
import {
  SectionCover,
  SectionMessage,
  SectionCard,
  SectionPhoto,
  SectionChapter,
  SectionSong,
} from "./Sections";
import { formatExpiry } from "@/lib/dates";
import type { LetterView, SectionKind } from "./types";

export function LetterViewer({ letter }: { letter: LetterView }) {
  const sections: SectionKind[] = useMemo(() => {
    const list: SectionKind[] = [
      { kind: "cover", key: "cover", label: "Portada" },
      { kind: "message", key: "message", label: "Mensaje" },
    ];
    if (letter.loveText) list.push({ kind: "card", key: "love", label: "Lo que más amo de ti", field: "loveText" });
    if (letter.storyText) list.push({ kind: "card", key: "story", label: "Nuestra historia", field: "storyText" });
    if (letter.dreamsText) list.push({ kind: "card", key: "dreams", label: "Sueños juntos", field: "dreamsText" });
    letter.photos.forEach((_, i) =>
      list.push({ kind: "photo", key: `photo-${i}`, label: `Foto ${i + 1}`, index: i }),
    );
    if (letter.specialDate) list.push({ kind: "chapter", key: "chapter", label: "Nuestro capítulo" });
    if (letter.spotifyTrackId) list.push({ kind: "song", key: "song", label: "Nuestra canción" });
    return list;
  }, [letter]);

  const [active, setActive] = useState(0);
  // Ritual de apertura: sobre sellado 3D (se omite con reduced-motion).
  const [opened, setOpened] = useState(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Array<HTMLDivElement | null>>([]);
  // Typewriter "done" persistente por sección: no se reinicia al volver.
  const [seenActive, setSeenActive] = useState<Set<number>>(new Set([0]));
  const activePhotoUrl = useMemo(() => {
    const s = sections[active];
    if (s?.kind === "photo") return letter.photos[s.index]?.url;
    return letter.photos[0]?.url;
  }, [sections, active, letter.photos]);
  const isPhotoSection = sections[active]?.kind === "photo";

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.index);
            setActive(i);
            setSeenActive((prev) => new Set(prev).add(i));
          }
        }
      },
      { root, threshold: 0.6 },
    );
    sectionRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
    // `opened`: con el sobre sellado las secciones no existen; al abrirse hay
    // que (re)conectar el observer o ninguna sección se activa (typewriter muerto).
  }, [sections.length, opened]);

  const goTo = (i: number) => {
    sectionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Teclado: ↑ ↓, PageUp/PageDown, espacio.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !/INPUT|TEXTAREA/.test((e.target as HTMLElement)?.tagName ?? ""))) {
        e.preventDefault();
        goTo(Math.min(sections.length - 1, active + 1));
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goTo(Math.max(0, active - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const cardPhoto = (order: number) =>
    letter.photos.length > 0 ? letter.photos[order % letter.photos.length] : undefined;

  let cardOrder = 0;

  if (!opened) {
    return (
      <SealedEnvelope
        letterId={letter.id}
        recipientName={letter.recipientName}
        onDone={() => setOpened(true)}
      />
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F4F4F6] bg-gradient-to-b from-[#F4F4F6] to-[#EDEDF1] sm:py-6">
      {/* Marco de teléfono en escritorio; pantalla completa en móvil */}
      <div className="relative h-[100dvh] w-full overflow-hidden bg-white sm:h-[min(92vh,900px)] sm:w-auto sm:aspect-[9/19] sm:rounded-[36px] sm:border sm:border-white/60 sm:shadow-[0_30px_80px_rgba(0,0,0,.12)]">
        <BlurBackground photoUrl={activePhotoUrl} clear={isPhotoSection} />
        <Particles />

        <div ref={scrollRef} className="snap-frame relative z-10 h-full w-full overflow-y-auto">
          {sections.map((s, i) => (
            <div
              key={s.key}
              ref={(el) => {
                sectionRefs.current[i] = el;
              }}
              data-index={i}
              className="snap-section relative h-full w-full"
            >
              {s.kind === "cover" && <SectionCover letter={letter} />}
              {s.kind === "message" && <SectionMessage letter={letter} active={seenActive.has(i)} />}
              {s.kind === "card" && (
                <SectionCard
                  letter={letter}
                  field={s.field}
                  active={seenActive.has(i)}
                  polaroid={cardPhoto(cardOrder++)}
                />
              )}
              {s.kind === "photo" && <SectionPhoto photo={letter.photos[s.index]} />}
              {s.kind === "chapter" && letter.specialDate && (
                <SectionChapter letter={letter} active={seenActive.has(i)} />
              )}
              {s.kind === "song" && letter.spotifyTrackId && (
                <SectionSong letter={letter} active={seenActive.has(i)} />
              )}
            </div>
          ))}

          {/* Pie global */}
          <div className="snap-section flex h-full items-center justify-center">
            <p className="px-8 text-center text-[11px] text-neutral-500/80">
              Disponible hasta {formatExpiry(letter.expiresAt)} · Hecho con openletter
            </p>
          </div>
        </div>

        <DotNav sections={sections} active={Math.min(active, sections.length - 1)} onGo={goTo} />
      </div>
    </div>
  );
}
