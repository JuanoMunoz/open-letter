"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X, ChevronDown, Check } from "lucide-react";
import { ExpandableTextarea } from "@/components/wizard/ExpandableTextarea";
import { FieldCounter, FieldLabel, inputCls } from "@/components/wizard/FieldCounter";
import { PhotoUploader, type WizardPhoto } from "@/components/wizard/PhotoUploader";
import { SpotifyField } from "@/components/wizard/SpotifyField";
import { BrandMark } from "@/components/BrandMark";
import { getTemplate, getTemplates, themeVars, type LetterTemplate } from "@/templates";
import { parseSpotifyTrackId } from "@/lib/spotify";

const STORE_KEY = "openletter-wizard-v2";

interface StashedText {
  key: string;
  label: string;
  body: string;
}

interface WizardState {
  templateId: string;
  recipientName: string;
  nickname: string;
  specialDate: string;
  senderName: string;
  showOptional: boolean;
  /** Textos por key de sección (sobreviven al cambio de plantilla). */
  texts: Record<string, string>;
  /** Textos huérfanos de otra plantilla (por migrar o copiar). */
  stash: StashedText[];
  showStash: boolean;
  spotifyUrl: string;
}

const EMPTY: WizardState = {
  templateId: "amor",
  recipientName: "",
  nickname: "",
  specialDate: "",
  senderName: "",
  showOptional: false,
  texts: {},
  stash: [],
  showStash: false,
  spotifyUrl: "",
};

function load(): WizardState {
  try {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WizardState>;
        // Migra borradores del formato anterior (v1 con campos fijos de amor).
        const old = parsed as Record<string, unknown>;
        const texts: Record<string, string> = { ...(parsed.texts ?? {}) };
        if (typeof old.mainMessage === "string" && !texts.main) texts.main = old.mainMessage;
        if (typeof old.loveText === "string" && !texts.love) texts.love = old.loveText;
        if (typeof old.storyText === "string" && !texts.story) texts.story = old.storyText;
        if (typeof old.dreamsText === "string" && !texts.dreams) texts.dreams = old.dreamsText;
        return { ...EMPTY, ...parsed, texts, stash: parsed.stash ?? [] };
      }
    }
  } catch { /* noop */ }
  return EMPTY;
}

function StepTitle({ parts }: { parts: [string, string, string] }) {
  return (
    <h1 className="font-editorial mb-8 text-[42px] leading-[1.05] text-neutral-900 sm:text-[60px]">
      {parts[0]} <em>{parts[1]}</em> {parts[2]}
    </h1>
  );
}

export default function CrearPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [s, setS] = useState<WizardState>(load);
  const [photos, setPhotos] = useState<WizardPhoto[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);

  const template: LetterTemplate = useMemo(() => getTemplate(s.templateId), [s.templateId]);
  const allTemplates = useMemo(() => getTemplates(), []);

  useEffect(() => {
    try {
      const { showStash: _omit, ...persist } = s;
      void _omit;
      sessionStorage.setItem(STORE_KEY, JSON.stringify(persist));
    } catch { /* noop */ }
  }, [s]);

  const patch = (p: Partial<WizardState>) => setS((prev) => ({ ...prev, ...p }));
  const setText = (key: string, body: string) =>
    setS((prev) => ({ ...prev, texts: { ...prev.texts, [key]: body.slice(0, 1200) } }));

  /** Cambia de plantilla conservando textos por `key`; el resto va al stash. */
  const switchTemplate = (nextId: string) => {
    if (nextId === s.templateId) {
      setSwitchOpen(false);
      return;
    }
    const prev = getTemplate(s.templateId);
    const next = getTemplate(nextId);
    const nextKeys = new Set(next.sections.map((d) => d.key));
    const orphans: StashedText[] = [];
    for (const def of prev.sections) {
      const body = (s.texts[def.key] ?? "").trim();
      if (body && !nextKeys.has(def.key)) orphans.push({ key: def.key, label: def.label, body });
    }
    setS((prevState) => {
      const stash = [...prevState.stash];
      for (const o of orphans) {
        if (!stash.some((x) => x.key === o.key)) stash.push(o);
      }
      return { ...prevState, templateId: nextId, stash, showStash: stash.length > 0 };
    });
    setSwitchOpen(false);
  };

  const defs = template.sections;
  const requiredDef = defs.find((d) => d.required) ?? defs[0];
  const step1Valid = s.recipientName.trim().length > 0 && s.recipientName.trim().length <= 150;
  const step2Valid =
    (s.texts[requiredDef.key] ?? "").trim().length > 0 &&
    defs.every((d) => (s.texts[d.key] ?? "").length <= d.maxLength);
  const uploading = photos.some((p) => p.uploading);
  const failedUpload = photos.some((p) => !p.uploading && !p.key);
  const step3Valid = !uploading && !failedUpload && photos.filter((p) => p.key).length <= 10;

  const spotifyId = useMemo(() => (s.spotifyUrl.trim() ? parseSpotifyTrackId(s.spotifyUrl.trim()) : null), [s.spotifyUrl]);
  const spotifyInvalid = s.spotifyUrl.trim().length > 0 && !spotifyId;

  const canNext =
    step === 0 ? true : step === 1 ? step1Valid : step === 2 ? step2Valid : step3Valid && !spotifyInvalid;

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Mapeo posicional a las columnas actuales (Fase B lo lleva a `sections` jsonb). */
  const positional = (i: number): string => {
    const def = defs[i];
    if (!def) return "";
    return (s.texts[def.key] ?? "").trim() || "";
  };

  const create = async () => {
    setError("");
    if (!step1Valid || !step2Valid) {
      setError("Revisa los campos obligatorios.");
      return;
    }
    setSending(true);
    try {
      const extras = [positional(1), positional(2), positional(3)].filter(Boolean);
      const res = await fetch("/api/cartas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          recipientName: s.recipientName.trim(),
          nickname: s.nickname.trim(),
          specialDate: s.specialDate || null,
          senderName: s.senderName.trim(),
          mainMessage: positional(0).trim(),
          loveText: extras[0] || undefined,
          storyText: extras[1] || undefined,
          dreamsText: extras[2] || undefined,
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
        sessionStorage.removeItem(STORE_KEY);
      } catch { /* noop */ }
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      router.push(`/crear/exito/${id}#token=${manageToken}`);
    } catch {
      setError("Error de red. Revisa tu conexión e intenta de nuevo.");
      setSending(false);
    }
  };

  const anim = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 24 * dir },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 * dir },
      };

  const wiz = template.wizard;

  return (
    <div className="min-h-dvh" style={{ background: "var(--bg0, #F4F4F6)", ...themeVars(template.theme) }}>
      <div className="mx-auto w-full max-w-[640px] px-5 pb-40 pt-6 sm:pt-8">
        {/* Cabecera: marca + switcher compacto de plantilla */}
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

        {/* Progreso 4 segmentos */}
        <div className="mb-6 flex gap-1.5" aria-label={`Paso ${step + 1} de 4`}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: i <= step ? "var(--brand)" : "#E4E4E8" }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={`${template.id}-${step}`} {...anim} transition={{ duration: 0.2 }}>
            {step === 0 && (
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B76]">
                  Elige la plantilla
                </p>
                <h1 className="font-editorial mb-6 text-[42px] leading-[1.05] text-neutral-900 sm:text-[60px]">
                  ¿Qué quieres <em>celebrar</em>?
                </h1>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {allTemplates.map((t) => {
                    const selected = t.id === template.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          switchTemplate(t.id);
                          go(1);
                        }}
                        aria-pressed={selected}
                        className="rounded-3xl border-2 bg-white p-4 text-left transition"
                        style={{
                          borderColor: selected ? t.theme.brand : "#E4E4E8",
                          boxShadow: selected ? `0 8px 30px ${t.theme.brand}22` : undefined,
                        }}
                      >
                        <span
                          className="mb-2 block h-14 overflow-hidden rounded-2xl"
                          style={{ background: `linear-gradient(135deg, ${t.theme.bgGradient[0]}, ${t.theme.brandSoft})` }}
                        >
                          <span className="flex h-full items-center justify-center gap-1 text-lg">
                            <span style={{ color: t.theme.brand }}>● ● ●</span>
                          </span>
                        </span>
                        <span className="text-2xl">{t.emoji}</span>
                        <span className="mt-1 block text-[15px] font-bold text-neutral-900">{t.name}</span>
                        <span className="block text-xs leading-snug text-[#6B6B76]">{t.tagline}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <StepTitle parts={wiz.step1Title} />
                <div>
                  <FieldLabel htmlFor="recipient" required>
                    {wiz.recipientLabel}
                  </FieldLabel>
                  <div className="relative">
                    <input
                      id="recipient"
                      value={s.recipientName}
                      onChange={(e) => patch({ recipientName: e.target.value.slice(0, 150) })}
                      placeholder={wiz.recipientPlaceholder}
                      maxLength={150}
                      className={`${inputCls} h-[50px] pr-16`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                      <FieldCounter value={s.recipientName.length} max={150} />
                    </span>
                  </div>
                </div>

                <hr className="border-[#E4E4E8]" />

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
                      {wiz.optionalTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => patch({ showOptional: !s.showOptional })}
                      aria-expanded={s.showOptional}
                      className="flex h-7 w-7 items-center justify-center rounded-full transition"
                      style={{ color: "var(--brand)" }}
                    >
                      <X size={16} className={`transition-transform ${s.showOptional ? "" : "rotate-45"}`} />
                    </button>
                  </div>
                  <AnimatePresence initial={false}>
                    {s.showOptional && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-5 pb-1">
                          <div>
                            <FieldLabel htmlFor="nickname">{wiz.nicknameLabel}</FieldLabel>
                            <input
                              id="nickname"
                              value={s.nickname}
                              onChange={(e) => patch({ nickname: e.target.value.slice(0, 150) })}
                              placeholder={wiz.nicknamePlaceholder}
                              maxLength={150}
                              className={`${inputCls} h-[50px]`}
                            />
                          </div>
                          <div>
                            <FieldLabel htmlFor="specialDate">{wiz.dateLabel}</FieldLabel>
                            <input
                              id="specialDate"
                              type="date"
                              value={s.specialDate}
                              onChange={(e) => patch({ specialDate: e.target.value })}
                              lang="es"
                              className={`${inputCls} h-[50px]`}
                            />
                          </div>
                          <div>
                            <FieldLabel htmlFor="sender">{wiz.senderLabel}</FieldLabel>
                            <input
                              id="sender"
                              value={s.senderName}
                              onChange={(e) => patch({ senderName: e.target.value.slice(0, 150) })}
                              placeholder={wiz.senderPlaceholder}
                              maxLength={150}
                              className={`${inputCls} h-[50px]`}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-7">
                <StepTitle parts={wiz.step2Title} />
                {defs.map((def, i) => (
                  <div key={def.key}>
                    {i > 0 && <hr className="mb-7 border-[#E4E4E8]" />}
                    <ExpandableTextarea
                      id={`sec-${def.key}`}
                      label={def.label}
                      accent={i > 0}
                      required={def.required}
                      value={s.texts[def.key] ?? ""}
                      onChange={(v) => setText(def.key, v)}
                      placeholder={def.placeholder}
                      max={def.maxLength}
                      rows={i === 0 ? 8 : 5}
                    />
                  </div>
                ))}
                {s.stash.length > 0 && (
                  <div className="rounded-2xl border border-dashed border-[#D6D6DC] bg-white/70 p-4">
                    <button
                      type="button"
                      onClick={() => patch({ showStash: !s.showStash })}
                      aria-expanded={s.showStash}
                      className="text-xs font-bold uppercase tracking-wide text-[#6B6B76]"
                    >
                      {s.showStash ? "Ocultar" : "Ver"} textos guardados de otra plantilla ({s.stash.length})
                    </button>
                    {s.showStash && (
                      <ul className="mt-2 space-y-2">
                        {s.stash.map((st) => (
                          <li key={st.key} className="rounded-xl bg-[#EBEBEF] px-3 py-2 text-sm text-neutral-700">
                            <span className="font-bold">{st.label}: </span>
                            {st.body.slice(0, 120)}
                            {st.body.length > 120 ? "…" : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-7">
                <StepTitle parts={wiz.step3Title} />
                <PhotoUploader photos={photos} setPhotos={setPhotos} />
                <hr className="border-[#E4E4E8]" />
                <SpotifyField value={s.spotifyUrl} onChange={(v) => patch({ spotifyUrl: v })} />
                {uploading && <p className="text-xs font-semibold text-[#6B6B76]">Subiendo fotos… el botón se activará al terminar.</p>}
                {failedUpload && <p className="text-xs font-semibold text-red-500">Una foto falló al subir. Elimínala o reintenta.</p>}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <p role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
      </div>

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
          {step < 3 ? (
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
