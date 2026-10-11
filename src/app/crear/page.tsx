"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { ExpandableTextarea } from "@/components/wizard/ExpandableTextarea";
import { FieldCounter, FieldLabel, inputCls } from "@/components/wizard/FieldCounter";
import { PhotoUploader, type WizardPhoto } from "@/components/wizard/PhotoUploader";
import { SpotifyField } from "@/components/wizard/SpotifyField";
import { parseSpotifyTrackId } from "@/lib/spotify";

const STORE_KEY = "openletter-wizard-v1";

interface WizardState {
  recipientName: string;
  nickname: string;
  specialDate: string;
  senderName: string;
  showOptional: boolean;
  mainMessage: string;
  loveText: string;
  storyText: string;
  dreamsText: string;
  spotifyUrl: string;
}

const EMPTY: WizardState = {
  recipientName: "",
  nickname: "",
  specialDate: "",
  senderName: "",
  showOptional: false,
  mainMessage: "",
  loveText: "",
  storyText: "",
  dreamsText: "",
  spotifyUrl: "",
};

function load(): WizardState {
  try {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (raw) return { ...EMPTY, ...JSON.parse(raw) };
    }
  } catch { /* noop */ }
  return EMPTY;
}

const TITLES = ["¿Para <em>quién</em> es esta carta?", "¿Qué le quieres <em>decir</em>?", "Fotos y <em>música</em>"];

export default function CrearPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [s, setS] = useState<WizardState>(load);
  const [photos, setPhotos] = useState<WizardPhoto[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(s));
    } catch { /* noop */ }
  }, [s]);

  const patch = (p: Partial<WizardState>) => setS((prev) => ({ ...prev, ...p }));

  const step1Valid = s.recipientName.trim().length > 0 && s.recipientName.trim().length <= 150;
  const step2Valid = s.mainMessage.trim().length > 0 && s.mainMessage.length <= 1200;
  const uploading = photos.some((p) => p.uploading);
  const failedUpload = photos.some((p) => !p.uploading && !p.key);
  const step3Valid = !uploading && !failedUpload && photos.filter((p) => p.key).length <= 10;

  const spotifyId = useMemo(() => (s.spotifyUrl.trim() ? parseSpotifyTrackId(s.spotifyUrl.trim()) : null), [s.spotifyUrl]);
  const spotifyInvalid = s.spotifyUrl.trim().length > 0 && !spotifyId;

  const canNext = step === 0 ? step1Valid : step === 1 ? step2Valid : step3Valid && !spotifyInvalid;

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const create = async () => {
    setError("");
    if (!step1Valid || !step2Valid) {
      setError("Revisa los campos obligatorios.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/cartas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipientName: s.recipientName.trim(),
          nickname: s.nickname.trim(),
          specialDate: s.specialDate || null,
          senderName: s.senderName.trim(),
          mainMessage: s.mainMessage.trim(),
          loveText: s.loveText.trim() || undefined,
          storyText: s.storyText.trim() || undefined,
          dreamsText: s.dreamsText.trim() || undefined,
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

  return (
    <div className="min-h-dvh bg-[#F4F4F6]">
      <div className="mx-auto w-full max-w-[640px] px-5 pb-40 pt-10 sm:pt-14">
        {/* Progreso */}
        <div className="mb-6 flex gap-1.5" aria-label={`Paso ${step + 1} de 3`}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-[#E0698F]" : "bg-[#E4E4E8]"}`} />
          ))}
        </div>

        <h1
          className="mb-8 text-[44px] font-light leading-[1.05] tracking-tight text-neutral-900 sm:text-[64px]"
          dangerouslySetInnerHTML={{ __html: TITLES[step] }}
        />

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} {...anim} transition={{ duration: 0.2 }}>
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <FieldLabel htmlFor="recipient" required>
                    Nombre de la persona especial
                  </FieldLabel>
                  <div className="relative">
                    <input
                      id="recipient"
                      value={s.recipientName}
                      onChange={(e) => patch({ recipientName: e.target.value.slice(0, 150) })}
                      placeholder="Daniela"
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
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#E0698F]">
                      Campos opcionales
                    </span>
                    <button
                      type="button"
                      onClick={() => patch({ showOptional: !s.showOptional })}
                      aria-expanded={s.showOptional}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[#E0698F] hover:bg-[#FBE4EC]"
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
                            <FieldLabel htmlFor="nickname">Apodo cariñoso</FieldLabel>
                            <input
                              id="nickname"
                              value={s.nickname}
                              onChange={(e) => patch({ nickname: e.target.value.slice(0, 150) })}
                              placeholder="¿Cómo llamas a esa persona?"
                              maxLength={150}
                              className={`${inputCls} h-[50px]`}
                            />
                          </div>
                          <div>
                            <FieldLabel htmlFor="specialDate">Fecha especial</FieldLabel>
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
                            <FieldLabel htmlFor="sender">Tu nombre</FieldLabel>
                            <input
                              id="sender"
                              value={s.senderName}
                              onChange={(e) => patch({ senderName: e.target.value.slice(0, 150) })}
                              placeholder="Juancoquito"
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

            {step === 1 && (
              <div className="space-y-7">
                <ExpandableTextarea
                  id="main"
                  label="Mensaje principal"
                  required
                  value={s.mainMessage}
                  onChange={(v) => patch({ mainMessage: v })}
                  placeholder="Escríbele lo que sientes…"
                  rows={8}
                />
                <hr className="border-[#E4E4E8]" />
                <ExpandableTextarea id="love" label="Lo que más amo de ti" accent value={s.loveText} onChange={(v) => patch({ loveText: v })} placeholder="Lo que más amo de ti es…" rows={5} />
                <ExpandableTextarea id="story" label="Nuestra historia" accent value={s.storyText} onChange={(v) => patch({ storyText: v })} placeholder="Todo empezó cuando…" rows={5} />
                <ExpandableTextarea id="dreams" label="Sueños juntos" accent value={s.dreamsText} onChange={(v) => patch({ dreamsText: v })} placeholder="Sueño con…" rows={5} />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-7">
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
            Atrás
          </button>
          {step < 2 ? (
            <button
              type="button"
              onClick={() => canNext && go(step + 1)}
              disabled={!canNext}
              className="rounded-full bg-neutral-900 px-7 py-3 text-sm font-bold text-white transition enabled:hover:bg-neutral-700 disabled:opacity-40"
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="button"
              onClick={create}
              disabled={!canNext || sending}
              className="rounded-full bg-neutral-900 px-7 py-3 text-sm font-bold text-white transition enabled:hover:bg-neutral-700 disabled:opacity-40"
            >
              {sending ? "Creando…" : uploading ? "Subiendo fotos…" : "Crear carta"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
