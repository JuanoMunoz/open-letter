"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { BlurBackground } from "./BlurBackground";
import { Particles } from "./Particles";
import { DotNav } from "./DotNav";
import { SealedEnvelope } from "./SealedEnvelope";
import { BrandMark } from "@/components/BrandMark";
import { getTemplate, resolveTheme, themeVars, scriptFamily } from "@/templates";
import type { ParticleKind } from "@/templates/types";
import {
  SectionCover,
  SectionMessage,
  SectionCard,
  SectionPhoto,
  SectionChapter,
  SectionSong,
} from "./Sections";
import {
  SectionReasons,
  SectionOpenWhen,
  SectionPromises,
  SectionTimeline,
  SectionVoice,
  SectionReply,
} from "./SectionExtras";
import { SongPlayer } from "./SongPlayer";
import { formatExpiry } from "@/lib/dates";
import type { LetterView, SectionKind } from "./types";

export function LetterViewer({ letter, preview = false, scrollSignal = null }: { letter: LetterView; preview?: boolean; scrollSignal?: { key: string; n: number } | null }) {
  const template = useMemo(() => getTemplate(letter.templateId), [letter.templateId]);
  const theme = useMemo(() => resolveTheme(template, letter.theme), [template, letter.theme]);
  // Secciones guardadas (por key) cruzadas con la plantilla (títulos/iconos).
  const cardDefs = useMemo(
    () =>
      template.sections.slice(1).flatMap((def) => {
        const s = letter.sections.find((x) => x.key === def.key);
        const body = (s?.body ?? "").trim();
        if (!body) return [];
        return [
          {
            key: def.key,
            def: { ...def, viewerTitle: s?.title || def.viewerTitle, icon: s?.icon || def.icon },
            body,
          },
        ];
      }),
    [template, letter.sections],
  );
  const sections: SectionKind[] = useMemo(() => {
    const list: SectionKind[] = [
      { kind: "cover", key: "cover", label: "Portada" },
      { kind: "message", key: "message", label: template.sections[0]?.label ?? "Mensaje" },
    ];
    cardDefs.forEach(({ key, def }) => {
      list.push({ kind: "card", key, label: def.viewerTitle });
    });
    // Extras/custom con contenido (razones, ábrela-cuándo, promesas, libres).
    for (const s of letter.sections) {
      if (s.key === template.sections[0]?.key) continue;
      if (template.sections.some((d) => d.key === s.key)) continue;
      const has = s.body.trim() || (s.items ?? []).length > 0 || (s.pairs ?? []).length > 0;
      if (!has) continue;
      const kind = (["reasons", "openwhen", "promises"] as const).includes(s.kind as never)
        ? (s.kind as "reasons" | "openwhen" | "promises")
        : "card";
      list.push({ kind, key: s.key, label: s.title || s.key });
    }
    letter.photos.forEach((_, i) =>
      list.push({ kind: "photo", key: `photo-${i}`, label: `Foto ${i + 1}`, index: i }),
    );
    if (letter.timeline.length > 0) list.push({ kind: "timeline", key: "timeline", label: "Recuerdos" });
    if (letter.audio) list.push({ kind: "voice", key: "voice", label: "Nota de voz" });
    if (letter.specialDate) list.push({ kind: "chapter", key: "chapter", label: template.dateSectionTitle });
    if (letter.spotifyTrackId) list.push({ kind: "song", key: "song", label: template.songTitle });
    if (!preview) list.push({ kind: "reply", key: "reply", label: "Responder" });
    return list;
  }, [letter, template, cardDefs]);

  const extraByKey = (key: string) => letter.sections.find((x) => x.key === key);

  const [active, setActive] = useState(0);
  // Modo noche: valor guardado + interruptor propio para quien lee.
  const [night, setNight] = useState(!!letter.theme?.nightMode);
  const bgLiso = letter.theme?.background === "liso";
  // Ritual de apertura: sobre sellado 3D (se omite con reduced-motion y en preview).
  const [opened, setOpened] = useState(
    () =>
      preview ||
      (typeof window !== "undefined" &&
        !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
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

  // Beacon de apertura: cuenta al abrir la carta (tras el ritual),
  // una vez por sesión vía cookie del servidor.
  useEffect(() => {
    if (preview || !opened) return;
    fetch(`/api/cartas/${letter.id}/vista`, { method: "POST" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);
  const lastSignal = useRef(0);
  useEffect(() => {
    if (!scrollSignal || scrollSignal.n === lastSignal.current) return;
    lastSignal.current = scrollSignal.n;
    const i = sections.findIndex((s) => s.key === scrollSignal.key);
    if (i >= 0) sectionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [scrollSignal, sectionRefs, sections]);

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

  // Música de fondo: arranca con el gesto de apertura (gesto fresco).
  // Sin ritual no hay gesto inicial: se intenta una vez al montar si aplica.
  const noRitual = (letter.opening || template.opening) === "ninguna";
  const [musicTick, setMusicTick] = useState(() =>
    !preview &&
    noRitual &&
    !!letter.spotifyTrackId &&
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? 1
      : 0,
  );
  const [bgLive, setBgLive] = useState(false);
  const musicApi = useRef<{ pause: () => void } | null>(null);
  const handleOpened = () => {
    setOpened(true);
    if (letter.spotifyTrackId && !preview) setMusicTick((n) => n + 1);
  };

  if (!opened && (letter.opening || template.opening) !== "ninguna") {
    return (
      <SealedEnvelope
        letterId={letter.id}
        recipientName={letter.recipientName}
        invite={template.openingInvite}
        tapLabel={(t, n) => template.tapCounter(t, n)}
        brand={theme.brand}
        brandSoft={theme.brandSoft}
        paper={theme.paper}
        scriptFont={scriptFamily(theme.font)}
        onDone={handleOpened}
      />
    );
  }

  return (
    <div
      className="flex min-h-dvh items-center justify-center sm:py-6"
      style={{ background: `linear-gradient(180deg, var(--bg0) 0%, var(--bg1) 100%)`, ...themeVars(theme) }}
    >
      {/* Marco de teléfono en escritorio; pantalla completa en móvil */}
      <div className={`relative h-[100dvh] w-full overflow-hidden bg-white sm:h-[min(92vh,900px)] sm:w-auto sm:aspect-[9/19] sm:rounded-[36px] sm:border sm:border-white/60 sm:shadow-[0_30px_80px_rgba(0,0,0,.12)] ${night ? "night-frame" : ""}`}>
        {bgLiso ? (
          <div
            aria-hidden
            className="absolute inset-0"
            style={night ? { background: "linear-gradient(180deg,#17181d,#101218)" } : { background: "linear-gradient(180deg, var(--bg0), var(--bg1))" }}
          />
        ) : (
          <BlurBackground photoUrl={activePhotoUrl} clear={isPhotoSection} />
        )}
        <Particles kind={(letter.theme?.particles as ParticleKind | undefined) ?? template.particles} color={theme.brand} />
        <button
          type="button"
          onClick={() => setNight((v) => !v)}
          aria-pressed={night}
          aria-label={night ? "Desactivar modo noche" : "Activar modo noche"}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur transition hover:bg-black/40"
        >
          {night ? <Sun size={16} /> : <Moon size={16} />}
        </button>

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
              {s.kind === "cover" && <SectionCover letter={letter} template={template} />}
              {s.kind === "message" && <SectionMessage letter={letter} active={seenActive.has(i)} />}
              {s.kind === "card" && (() => {
                const fromTemplate = cardDefs.find((c) => c.key === s.key);
                if (fromTemplate) {
                  return (
                    <SectionCard
                      def={fromTemplate.def}
                      body={fromTemplate.body}
                      active={seenActive.has(i)}
                      polaroid={cardPhoto(cardOrder++)}
                    />
                  );
                }
                const custom = extraByKey(s.key);
                if (!custom?.body.trim()) return null;
                return (
                  <SectionCard
                    def={{ key: custom.key, label: custom.title, placeholder: "", icon: custom.icon || "Sparkles", viewerTitle: custom.title || custom.key, suggestions: [], defaultEnabled: true, maxLength: 1200 }}
                    body={custom.body}
                    active={seenActive.has(i)}
                    polaroid={cardPhoto(cardOrder++)}
                  />
                );
              })()}
              {s.kind === "photo" && <SectionPhoto photo={letter.photos[s.index]} />}
              {(s.kind === "reasons" || s.kind === "promises") && (() => {
                const found = extraByKey(s.key);
                if (!found) return null;
                return s.kind === "reasons"
                  ? <SectionReasons item={found} />
                  : <SectionPromises item={found} />;
              })()}
              {s.kind === "openwhen" && (() => {
                const found = extraByKey(s.key);
                if (!found) return null;
                return <SectionOpenWhen item={found} />;
              })()}
              {s.kind === "timeline" && (
                <SectionTimeline items={letter.timeline} />
              )}
              {s.kind === "voice" && letter.audio && <SectionVoice audio={letter.audio} />}
              {s.kind === "reply" && <SectionReply letterId={letter.id} />}
              {s.kind === "chapter" && letter.specialDate && (
                <SectionChapter letter={letter} template={template} active={seenActive.has(i)} />
              )}
              {s.kind === "song" && letter.spotifyTrackId && (
                <SectionSong
                  letter={letter}
                  template={template}
                  active={seenActive.has(i)}
                  backgroundLive={bgLive}
                  onPauseBackground={() => musicApi.current?.pause()}
                />
              )}
            </div>
          ))}

          {/* Pie global */}
          <div className="snap-section flex h-full flex-col items-center justify-center gap-2">
            <p className="font-letter text-[24px]" style={{ color: "var(--brand)" }}>
              {template.closingLine}
            </p>
            <p className="px-8 text-center text-[11px] text-neutral-500/80">
              Disponible hasta {formatExpiry(letter.expiresAt)} · {template.footerSuffix}
            </p>
            <BrandMark />
          </div>
        </div>

        <DotNav sections={sections} active={Math.min(active, sections.length - 1)} onGo={goTo} />
        {letter.spotifyTrackId && !preview && (
          <SongPlayer
            trackId={letter.spotifyTrackId}
            autostart={musicTick}
            onLive={setBgLive}
            apiRef={musicApi}
          />
        )}
      </div>
    </div>
  );
}
