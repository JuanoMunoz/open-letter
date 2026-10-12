"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Pause, Trash2, UploadCloud, AudioLines } from "lucide-react";
import { ui } from "@/templates/ui";
import { useUploadThing } from "@/lib/uploadthing-client";

export interface WizardAudio {
  key: string;
  url: string;
  durationS: number;
  mime: string;
}

function pickMime(): string {
  const cands = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
  if (typeof MediaRecorder === "undefined") return "";
  for (const c of cands) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch { /* noop */ }
  }
  return "";
}

const MAX_S = 60;
const MAX_FILE = 4 * 1024 * 1024;

/** Nota de voz: grabar (MediaRecorder) o subir archivo, máx. 60 s / 4 MB. */
export function VoiceRecorder({
  audio,
  onAudio,
  onBusy,
}: {
  audio: WizardAudio | null;
  onAudio: (a: WizardAudio | null) => void;
  onBusy?: (busy: boolean) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [preview, setPreview] = useState<{ url: string; durationS: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { startUpload } = useUploadThing("letterAudio");

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => stopTracks, []);

  useEffect(() => {
    onBusy?.(recording || uploading);
  }, [recording, uploading, onBusy]);

  const drawLiveWave = (stream: MediaStream) => {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 64;
      src.connect(an);
      const data = new Uint8Array(an.frequencyBinCount);
      const canvas = waveRef.current;
      let raf = 0;
      const draw = () => {
        raf = requestAnimationFrame(draw);
        if (!canvas) return;
        an.getByteFrequencyData(data);
        const c = canvas.getContext("2d");
        if (!c) return;
        const w = canvas.width;
        const h = canvas.height;
        c.clearRect(0, 0, w, h);
        c.fillStyle = "#E0698F";
        const n = 32;
        for (let i = 0; i < n; i++) {
          const v = data[Math.floor((i / n) * data.length)] / 255;
          const bh = 4 + v * (h - 8);
          c.fillRect(i * (w / n) + 1, (h - bh) / 2, w / n - 2, bh);
        }
      };
      draw();
      return () => {
        cancelAnimationFrame(raf);
        void ctx.close();
      };
    } catch {
      return () => {};
    }
  };

  const startRec = async () => {
    setError("");
    const mime = pickMime();
    if (!mime) {
      setError(ui.voiceNoSupport);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType || mime });
        const url = URL.createObjectURL(blob);
        // Duración real al cargar metadata.
        const el = document.createElement("audio");
        el.preload = "metadata";
        el.src = url;
        el.onloadedmetadata = () => {
          const d = Math.min(MAX_S, Math.round(el.duration || 0));
          setPreview({ url, durationS: d });
          void uploadBlob(new File([blob], `nota.${mime.includes("mp4") ? "m4a" : "webm"}`, { type: blob.type }), d);
        };
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      setSecs(0);
      const cleanupWave = drawLiveWave(stream);
      (rec as unknown as { _cleanupWave?: () => void })._cleanupWave = cleanupWave;
      timerRef.current = setInterval(() => {
        setSecs((s) => {
          if (s + 1 >= MAX_S) {
            stopRec();
            return MAX_S;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError(ui.voiceNoMic);
    }
  };

  const stopRec = () => {
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    const cleanup = (rec as unknown as { _cleanupWave?: () => void } | null)?._cleanupWave;
    cleanup?.();
    stopTracks();
    setRecording(false);
  };

  const uploadBlob = async (file: File, durationS: number) => {
    setError("");
    if (file.size > MAX_FILE) {
      setError(ui.voiceTooBig);
      return;
    }
    setUploading(true);
    try {
      const res = await startUpload([file]);
      const up = res?.[0] as unknown as { key?: string; url?: string; ufsUrl?: string } | undefined;
      const url = up?.url ?? up?.ufsUrl ?? "";
      if (up?.key && url) {
        if (preview) URL.revokeObjectURL(preview.url);
        setPreview(null);
        onAudio({ key: up.key, url, durationS, mime: file.type });
      } else {
        setError(ui.uploadRetry);
      }
    } catch (e) {
      setError((e as Error)?.message ?? ui.uploadRetry);
    } finally {
      setUploading(false);
    }
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("audio/")) {
      setError(ui.voiceAudioOnly);
      return;
    }
    const url = URL.createObjectURL(f);
    const el = document.createElement("audio");
    el.preload = "metadata";
    el.src = url;
    el.onloadedmetadata = () => {
      const d = Math.round(el.duration || 0);
      if (d > 60) {
        setError(ui.voiceTooLong);
        URL.revokeObjectURL(url);
        return;
      }
      setPreview({ url, durationS: d });
      void uploadBlob(f, d);
    };
    el.onerror = () => setError(ui.voiceUnreadable);
  };

  const removeAll = async () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    if (audio) {
      try {
        await fetch("/api/orphan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: audio.key }),
        });
      } catch { /* el cron lo limpia */ }
      onAudio(null);
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--brand-soft, #FBE4EC)", color: "var(--brand, #D6457F)" }}>
          <AudioLines size={18} />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--brand, #E0698F)" }}>
            {ui.voiceTitle}
          </p>
          <p className="text-xs text-[#6B6B76]">{ui.voiceSub}</p>
        </div>
      </div>

      {!recording && !audio && !preview && !uploading && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={startRec}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white"
          >
            <Mic size={16} /> {ui.voiceRecord}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-[#D6D6DC] bg-white px-4 py-3 text-sm font-bold text-neutral-700"
          >
            <UploadCloud size={16} /> {ui.voiceUpload}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {recording && (
        <div className="rounded-2xl bg-neutral-900 p-4 text-white">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-sm font-bold tabular-nums">{ui.voiceRecording(fmt(secs))}</span>
            <button
              type="button"
              onClick={stopRec}
              aria-label={ui.voiceStop}
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-900"
            >
              <Square size={15} />
            </button>
          </div>
          <canvas ref={waveRef} width={300} height={48} className="h-12 w-full" aria-hidden />
        </div>
      )}

      {uploading && (
        <p className="rounded-2xl bg-[#EBEBEF] px-4 py-3 text-sm font-semibold text-[#6B6B76]">
          {ui.voiceUploading}
        </p>
      )}

      {(preview || audio) && !recording && !uploading && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-[#E4E4E8] bg-white p-3">
          <button
            type="button"
            onClick={() => {
              const el = audioRef.current;
              if (!el) return;
              if (playing) el.pause();
              else void el.play();
              setPlaying(!playing);
            }}
            aria-label={playing ? ui.voicePause : ui.voicePlay}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: "var(--brand, #E0698F)" }}
          >
            {playing ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
          </button>
          <audio
            ref={audioRef}
            src={(audio?.url ?? preview?.url) ?? ""}
            preload="metadata"
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
          <span className="text-sm font-bold tabular-nums text-neutral-700">
            {fmt(audio?.durationS ?? preview?.durationS ?? 0)}
            {!audio && preview ? " · subiendo…" : ""}
          </span>
          <button
            type="button"
            onClick={removeAll}
            aria-label={ui.voiceRemove}
            className="ml-auto text-neutral-400 hover:text-red-500"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
