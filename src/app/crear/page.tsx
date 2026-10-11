"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { format } from "date-fns";
import { StepTemplate } from "@/components/wizard/steps/StepTemplate";
import { StepWho } from "@/components/wizard/steps/StepWho";
import { StepSections } from "@/components/wizard/steps/StepSections";
import { StepMemories } from "@/components/wizard/steps/StepMemories";
import { StepStyle, type StyleState } from "@/components/wizard/steps/StepStyle";
import { PreviewPanel, PreviewFab } from "@/components/wizard/PreviewPanel";
import { BrandMark } from "@/components/BrandMark";
import { getTemplate, getTemplates, themeVars, type LetterTemplate } from "@/templates";
import { fromDef, hasContent, uid, type WizardSection } from "@/components/wizard/sections-model";
import { parseSpotifyTrackId } from "@/lib/spotify";
import type { WizardPhoto } from "@/components/wizard/PhotoUploader";
import type { LetterView } from "@/components/viewer/types";
import type { SectionItem } from "@/templates/types";
import { ChevronDown, Check } from "lucide-react";

const STORE_KEY = "openletter-draft-v1";
const OLD_KEYS = ["openletter-wizard-v2", "openletter-wizard-v1"];
/** Caducidad ficticia para la preview (no se guarda). */
const PREVIEW_EXPIRY = new Date(Date.now() + 7 * 86400000).toISOString();

interface WizardState {
  templateId: string;
  recipientName: string;
  nickname: string;
  specialDate: string;
  senderName: string;
  showOptional: boolean;
  sections: WizardSection[];
  tone: string;
  style: StyleState;
  spotifyUrl: string;
  visited: number[];
}

function sectionsFor(templateId: string, bodies: Record<string, string> = {}): WizardSection[] {
  const t = getTemplate(templateId);
  return t.sections.map((d) => fromDef(d, bodies[d.key] ?? ""));
}

function load(): { state: WizardState; resumed: boolean } {
  const fresh = (templateId = "amor"): WizardState => ({
    templateId,
    recipientName: "",
    nickname: "",
    specialDate: "",
    senderName: "",
    showOptional: false,
    sections: sectionsFor(templateId),
    tone: "Romántico",
    style: {},
    spotifyUrl: "",
    visited: [0],
  });
  try {
    if (typeof window === "undefined") return { state: fresh(), resumed: false };
    // Borrador nuevo (localStorage).
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<WizardState>;
      const hasContent =
        (p.recipientName ?? "") !== "" ||
        (p.sections ?? []).some((s) => s.body?.trim() || s.items?.length || s.pairs?.length);
      return {
        state: { ...fresh(p.templateId ?? "amor"), ...p, visited: [0] },
        resumed: hasContent,
      };
    }
    // Migra borradores viejos (sessionStorage v1/v2).
    for (const k of OLD_KEYS) {
      const old = sessionStorage.getItem(k);
      if (!old) continue;
      const p = JSON.parse(old) as Record<string, unknown>;
      const tid = typeof p.templateId === "string" ? p.templateId : "amor";
      const texts = (p.texts ?? {}) as Record<string, string>;
      for (const f of ["mainMessage", "loveText", "storyText", "dreamsText"]) {
        if (typeof p[f] === "string" && p[f]) {
          const key = f === "mainMessage" ? "main" : f === "loveText" ? "love" : f === "storyText" ? "story" : "dreams";
          texts[key] = texts[key] ?? (p[f] as string);
        }
      }
      const st = fresh(tid);
      st.recipientName = (p.recipientName as string) ?? "";
      st.nickname = (p.nickname as string) ?? "";
      st.specialDate = (p.specialDate as string) ?? "";
      st.senderName = (p.senderName as string) ?? "";
      st.spotifyUrl = (p.spotifyUrl as string) ?? "";
      st.sections = sectionsFor(tid, texts);
      try {
        sessionStorage.removeItem(k);
      } catch { /* noop */ }
      return { state: st, resumed: true };
    }
  } catch { /* noop */ }
  return { state: fresh(), resumed: false };
}

export default function CrearPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [init] = useState(load);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [s, setS] = useState<WizardState>(init.state);
  const [resumedBanner, setResumedBanner] = useState(init.resumed);
  const [photos, setPhotos] = useState<WizardPhoto[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signal, setSignal] = useState<{ key: string; n: number } | null>(null);
  const signalN = useRef(0);

  const template: LetterTemplate = useMemo(() => getTemplate(s.templateId), [s.templateId]);
  const allTemplates = useMemo(() => getTemplates(), []);

  // Autoguardado localStorage cada 800 ms (debounce).
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(s));
        setSavedAt(format(new Date(), "HH:mm"));
      } catch { /* noop */ }
    }, 800);
    return () => clearTimeout(t);
  }, [s]);

  const patch = (p: Partial<WizardState>) => setS((prev) => ({ ...prev, ...p }));
  const setSections = (sections: WizardSection[]) => setS((prev) => ({ ...prev, sections }));

  const discardDraft = () => {
    if (!confirm("¿Descartar el borrador y empezar de cero?")) return;
    try {
      localStorage.removeItem(STORE_KEY);
    } catch { /* noop */ }
    const t = getTemplate(s.templateId);
    setS((prev) => ({
      ...prev,
      recipientName: "",
      nickname: "",
      specialDate: "",
      senderName: "",
      sections: sectionsFor(prev.templateId),
      spotifyUrl: "",
      style: {},
      visited: [0],
    }));
    void t;
    setStep(0);
    setResumedBanner(false);
  };

  /** Cambia de plantilla: conserva por `key`, el resto pasa a personalizadas. */
  const switchTemplate = (nextId: string) => {
    setSwitchOpen(false);
    if (nextId === s.templateId) return;
    const next = getTemplate(nextId);
    const nextKeys = new Set(next.sections.map((d) => d.key));
    const carried = new Map(s.sections.map((x) => [x.key, x]));
    const merged: WizardSection[] = next.sections.map((d) => {
      const prev = carried.get(d.key);
      if (prev) return { ...prev, uid: prev.uid, placeholder: d.placeholder, suggestions: d.suggestions, required: d.required, maxLength: d.maxLength };
      return fromDef(d);
    });
    // Resto → secciones personalizadas (Fase C: visibles y editables).
    for (const prev of s.sections) {
      if (!nextKeys.has(prev.key) && (prev.body.trim() || prev.items.length || prev.pairs.length)) {
        merged.push({ ...prev, uid: uid(), custom: true });
      }
    }
    setS((prevState) => ({ ...prevState, templateId: nextId, sections: merged }));
  };

  const requiredSec = s.sections.find((x) => x.required) ?? s.sections[0];
  const step1Valid = s.recipientName.trim().length > 0 && s.recipientName.trim().length <= 150;
  const step2Valid = !!requiredSec && requiredSec.body.trim().length > 0;
  const uploading = photos.some((p) => p.uploading);
  const failedUpload = photos.some((p) => !p.uploading && !p.key);
  const step3Valid = !uploading && !failedUpload && photos.filter((p) => p.key).length <= 10;

  const spotifyId = useMemo(() => (s.spotifyUrl.trim() ? parseSpotifyTrackId(s.spotifyUrl.trim()) : null), [s.spotifyUrl]);
  const spotifyInvalid = s.spotifyUrl.trim().length > 0 && !spotifyId;

  const canNext =
    step === 0 ? true : step === 1 ? step1Valid : step === 2 ? step2Valid : step === 3 ? step3Valid && !spotifyInvalid : true;

  const go = useCallback(
    (next: number) => {
      setDir(next > step ? 1 : -1);
      setStep(next);
      setS((prev) => (prev.visited.includes(next) ? prev : { ...prev, visited: [...prev.visited, next] }));
      window.scrollTo({ top: 0, behavior: "smooth" });
      // La preview salta a la sección relacionada.
      const key =
        next <= 1 ? "cover" : next === 2 ? (s.sections[0]?.key ?? "message") : next === 3 ? "photo-0" : "song";
      signalN.current += 1;
      setSignal({ key, n: signalN.current });
    },
    [step, s.sections],
  );

  // (Atajos de teclado: ver efecto tras `create`.)

  const buildPayload = () => {
    const ordered = [...s.sections].sort((a, b) => s.sections.indexOf(a) - s.sections.indexOf(b));
    const main = ordered.find((x) => x.required)?.body.trim() ?? "";
    const items: SectionItem[] = ordered
      .filter((x) => !x.required && hasContent(x))
      .map((x, i) => ({
        key: x.key,
        kind: x.kind,
        title: x.title || x.key,
        icon: x.icon,
        body: x.body.trim(),
        items: x.items,
        pairs: x.pairs,
        enabled: true,
        order: i,
      }));
    return { main, items };
  };

  const create = async () => {
    setError("");
    if (!step1Valid || !step2Valid) {
      setError("Revisa los campos obligatorios.");
      return;
    }
    const { main, items } = buildPayload();
    setSending(true);
    try {
      const res = await fetch("/api/cartas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          recipientName: s.recipientName.trim(),
          nickname: s.nickname.trim(),
          specialDate: s.specialDate || null,
          senderName: s.senderName.trim(),
          mainMessage: main,
          sections: items,
          theme: {
            colorId: s.style.colorId,
            font: s.style.font,
            particles: s.style.particles,
            background: s.style.background,
            nightMode: s.style.nightMode,
          },
          opening: s.style.opening ?? template.opening,
          timeline: [],
          spotifyTrackId: spotifyId,
          photos: photos
            .filter((p) => p.key && p.url)
            .map((p) => ({ key: p.key!, url: p.url!, caption: p.caption, takenOn: p.takenOn || null, place: p.place })),
          website: "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "No se pudo crear la carta. Intenta de nuevo.");
        setSending(false);
        return;
      }
      const { id, manageToken } = data as { id: string; manageToken: string };
      try {
        localStorage.removeItem(STORE_KEY);
      } catch { /* noop */ }
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      router.push(`/crear/exito/${id}#token=${manageToken}`);
    } catch {
      setError("Error de red. Revisa tu conexión e intenta de nuevo.");
      setSending(false);
    }
  };

  // Ctrl/⌘ + Enter = siguiente / crear. Refs para no re-suscribir el listener.
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });
  const createRef = useRef(create);
  useEffect(() => {
    createRef.current = create;
  });
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });
  const canNextRef = useRef(canNext);
  useEffect(() => {
    canNextRef.current = canNext;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (stepRef.current < 4) {
          if (canNextRef.current) goRef.current(stepRef.current + 1);
        } else {
          void createRef.current();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Borrador para la vista previa en vivo. */
  const draftLetter: LetterView | null = useMemo(() => {
    const main = s.sections.find((x) => x.required)?.body ?? "";
    const items: SectionItem[] = s.sections
      .filter((x) => !x.required && (x.body.trim() || x.items.length || x.pairs.length))
      .map((x, i) => ({
        key: x.key, kind: x.kind, title: x.title || x.key, icon: x.icon,
        body: x.body, items: x.items, pairs: x.pairs, enabled: x.enabled, order: i,
      }));
    return {
      id: "preview",
      templateId: template.id,
      recipientName: s.recipientName || "…",
      nickname: s.nickname || null,
      specialDate: s.specialDate || null,
      senderName: s.senderName || null,
      mainMessage: main || "…",
      sections: items,
      timeline: [],
      theme: {
        colorId: s.style.colorId,
        font: s.style.font,
        particles: s.style.particles,
        background: s.style.background,
        nightMode: s.style.nightMode,
      },
      opening: s.style.opening ?? template.opening,
      spotifyTrackId: spotifyId,
      expiresAt: PREVIEW_EXPIRY,
      photos: photos
        .filter((p) => p.url || p.preview)
        .map((p) => ({ url: p.url || p.preview, caption: p.caption || null, takenOn: p.takenOn || null, place: p.place || null })),
      audio: null,
    };
  }, [s, photos, template, spotifyId]);

  const anim = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 24 * dir },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 * dir },
      };

  const wiz = template.wizard;
  const sectionCount = s.sections.filter((x) => x.body.trim() || x.items.length || x.pairs.length).length;

  return (
    <div className="min-h-dvh" style={{ background: "var(--bg0, #F4F4F6)", ...themeVars(template.theme) }}>
      <div className="flex justify-center">
        <div className="mx-auto w-full max-w-[640px] flex-1 px-5 pb-40 pt-6 sm:pt-8">
          {/* Cabecera */}
          <div className="mb-6 flex items-center justify-between">
            <BrandMark />
            <div className="relative">
              <button
                type="button"
                onClick={() => setSwitchOpen((v) => !v)}
                aria-expanded={switchOpen}
                aria-label="Cambiar plantilla"
                className="flex items-center gap-1.5 rounded-full border border-[#D6D6DC] bg-white px-3.5 py-2 text-[13px] font-bold text-neutral-800 shadow-sm"
              >
                <span>{template.emoji}</span>
                <span className="max-w-[110px] truncate">{template.name}</span>
                <ChevronDown size={14} className={`transition-transform ${switchOpen ? "rotate-180" : ""}`} />
              </button>
              {switchOpen && (
                <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[#E4E4E8] bg-white shadow-xl">
                  {allTemplates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => switchTemplate(t.id)}
                      className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition hover:bg-[#F4F4F6]"
                    >
                      <span className="text-xl">{t.emoji}</span>
                      <span>
                        <span className="block text-sm font-bold text-neutral-900">{t.name}</span>
                        <span className="block text-xs text-[#6B6B76]">{t.tagline}</span>
                      </span>
                      {t.id === template.id && <Check size={16} className="ml-auto text-green-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Progreso clicable */}
          <div className="mb-6 flex gap-1.5" aria-label={`Paso ${step + 1} de 5`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => s.visited.includes(i) && go(i)}
                disabled={!s.visited.includes(i)}
                aria-label={`Ir al paso ${i + 1}`}
                className={`h-1.5 flex-1 rounded-full transition-colors ${s.visited.includes(i) ? "cursor-pointer" : "cursor-default"}`}
                style={{ background: i <= step ? "var(--brand)" : s.visited.includes(i) ? "color-mix(in srgb, var(--brand) 35%, #E4E4E8)" : "#E4E4E8" }}
              />
            ))}
          </div>

          {resumedBanner && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[#E4E4E8] bg-white px-4 py-3 text-sm shadow-sm" role="status">
              <span className="font-semibold text-neutral-700">Continuar donde lo dejaste</span>
              {savedAt && <span className="text-xs text-[#6B6B76]">· guardado {savedAt}</span>}
              <button type="button" onClick={discardDraft} className="ml-auto text-xs font-bold text-red-500 hover:underline">
                Descartar borrador
              </button>
              <button type="button" onClick={() => setResumedBanner(false)} aria-label="Ocultar aviso" className="text-xs font-bold text-neutral-400 hover:underline">
                Seguir
              </button>
            </div>
          )}

          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={`${template.id}-${step}`} {...anim} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <StepTemplate allTemplates={allTemplates} template={template} onPick={(id) => { switchTemplate(id); go(1); }} />
              )}
              {step === 1 && (
                <StepWho
                  template={template}
                  value={{ recipientName: s.recipientName, nickname: s.nickname, specialDate: s.specialDate, senderName: s.senderName, showOptional: s.showOptional }}
                  onPatch={patch}
                />
              )}
              {step === 2 && (
                <div>
                  <h1 className="font-editorial mb-4 text-[42px] leading-[1.05] text-neutral-900 sm:text-[60px]">
                    {template.wizard.step2Title[0]} <em>{template.wizard.step2Title[1]}</em> {template.wizard.step2Title[2]}
                  </h1>
                  <StepSections template={template} sections={s.sections} onSections={setSections} tone={s.tone} onTone={(tone) => patch({ tone })} />
                </div>
              )}
              {step === 3 && (
                <StepMemories
                  template={template}
                  photos={photos}
                  setPhotos={setPhotos}
                  spotifyUrl={s.spotifyUrl}
                  setSpotifyUrl={(spotifyUrl) => patch({ spotifyUrl })}
                  uploading={uploading}
                  failedUpload={failedUpload}
                />
              )}
              {step === 4 && (
                <StepStyle
                  template={template}
                  value={s.style}
                  onPatch={(p) => patch({ style: { ...s.style, ...p } })}
                  photoCount={photos.filter((p) => p.key).length}
                  sectionCount={sectionCount}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {savedAt && !resumedBanner && (
            <p className="mt-4 text-center text-[11px] font-semibold text-[#6B6B76]" role="status">
              Borrador guardado · {savedAt}
            </p>
          )}

          {error && (
            <p role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* Panel preview (escritorio) */}
        <aside className="sticky top-0 hidden h-dvh w-[400px] shrink-0 p-4 lg:block" aria-label="Vista previa en vivo">
          <PreviewPanel letter={draftLetter} scrollKey={signal} />
        </aside>
      </div>

      <PreviewFab onOpen={() => setDrawerOpen(true)} />
      {drawerOpen && <PreviewPanel letter={draftLetter} scrollKey={signal} drawer onCloseDrawer={() => setDrawerOpen(false)} />}

      {/* Barra inferior fija */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
        <div className="mx-auto flex max-w-[640px] items-center justify-between gap-3 rounded-full border border-white/60 bg-[rgba(244,244,246,.85)] px-3 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,.12)] backdrop-blur">
          <button
            type="button"
            onClick={() => (step === 0 ? router.push("/") : go(step - 1))}
            className="rounded-full border border-[#D6D6DC] bg-white px-6 py-3 text-sm font-bold text-neutral-800 transition hover:border-neutral-400"
          >
            {wiz.back}
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={() => canNext && go(step + 1)}
              disabled={!canNext}
              className="rounded-full bg-neutral-900 px-7 py-3 text-sm font-bold text-white transition enabled:hover:bg-neutral-700 disabled:opacity-40"
            >
              {wiz.next}
            </button>
          ) : (
            <button
              type="button"
              onClick={create}
              disabled={!canNext || sending}
              className="rounded-full bg-neutral-900 px-7 py-3 text-sm font-bold text-white transition enabled:hover:bg-neutral-700 disabled:opacity-40"
            >
              {sending ? wiz.creating : uploading ? "Subiendo fotos…" : wiz.create}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
