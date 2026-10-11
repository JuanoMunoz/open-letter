"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, X, ArrowLeft, ArrowRight, MapPin, CalendarDays } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing-client";
import { FieldCounter } from "./FieldCounter";

export interface WizardPhoto {
  localId: string;
  preview: string; // object URL
  key?: string;
  url?: string;
  uploading: boolean;
  progress: number;
  error?: string;
  caption: string;
  takenOn: string;
  place: string;
  showDate: boolean;
  showPlace: boolean;
}

async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1920;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  // createImageBitmap ya aplica la orientación EXIF en navegadores modernos.
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.85));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, type === "image/png" ? ".png" : ".jpg"), { type });
}

export function PhotoUploader({
  photos,
  setPhotos,
}: {
  photos: WizardPhoto[];
  setPhotos: (p: WizardPhoto[]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { startUpload } = useUploadThing("letterImage");

  const uploadFiles = useCallback(
    async (list: File[], base: WizardPhoto[]) => {
      const arr = [...base];
      for (const file of list) {
        if (arr.length >= 10) break;
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 8 * 1024 * 1024) {
          const localId = Math.random().toString(36).slice(2);
          arr.push({
            localId, preview: URL.createObjectURL(file), uploading: false, progress: 0,
            error: "Máx. 8 MB por foto", caption: "", takenOn: "", place: "", showDate: false, showPlace: false,
          });
          continue;
        }
        const localId = Math.random().toString(36).slice(2);
        const preview = URL.createObjectURL(file);
        const entry: WizardPhoto = {
          localId, preview, uploading: true, progress: 5,
          caption: "", takenOn: "", place: "", showDate: false, showPlace: false,
        };
        arr.push(entry);
        setPhotos([...arr]);
        try {
          const compressed = await compressImage(file);
          const tick = setInterval(() => {
            const ix = arr.findIndex((p) => p.localId === localId);
            if (ix >= 0 && arr[ix].progress < 90) {
              arr[ix] = { ...arr[ix], progress: arr[ix].progress + 8 };
              setPhotos([...arr]);
            }
          }, 250);
          const res = await startUpload([compressed]);
          clearInterval(tick);
          const ix = arr.findIndex((p) => p.localId === localId);
          const uploaded = res?.[0] as unknown as { key?: string; url?: string; ufsUrl?: string } | undefined;
          const url = uploaded?.url ?? uploaded?.ufsUrl ?? "";
          if (ix >= 0) {
            if (uploaded?.key && url) {
              arr[ix] = { ...arr[ix], key: uploaded.key, url, uploading: false, progress: 100 };
            } else {
              arr[ix] = { ...arr[ix], uploading: false, error: "Falló la subida, reintenta" };
            }
            setPhotos([...arr]);
          }
        } catch (e) {
          const ix = arr.findIndex((p) => p.localId === localId);
          if (ix >= 0) {
            arr[ix] = { ...arr[ix], uploading: false, error: (e as Error)?.message ?? "Falló la subida" };
            setPhotos([...arr]);
          }
        }
      }
      setPhotos([...arr]);
    },
    [setPhotos, startUpload],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) void uploadFiles(files, photos);
  };

  const removeAt = async (i: number) => {
    const target = photos[i];
    const next = photos.filter((_, ix) => ix !== i);
    setPhotos(next);
    URL.revokeObjectURL(target.preview);
    if (target.key) {
      // Borra el huérfano en UploadThing (best-effort; el cron lo barre si falla).
      try {
        await fetch("/api/orphan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: target.key }),
        });
      } catch { /* el cron lo limpia */ }
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    setPhotos(next);
  };

  const patch = (i: number, p: Partial<WizardPhoto>) => {
    const next = [...photos];
    next[i] = { ...next[i], ...p };
    setPhotos(next);
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBE4EC] text-[#D6457F]">
          📷
        </span>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#E0698F]">Fotos</p>
        <span className="ml-auto text-[11px] font-bold text-[#6B6B76]">
          {photos.length} foto(s) añadida(s)
        </span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          dragOver ? "border-[#E0698F] bg-[#FBE4EC]" : "border-[#D6D6DC] bg-[#EBEBEF]"
        }`}
        role="button"
        aria-label="Subir fotos"
      >
        <UploadCloud className="mb-2 text-[#E0698F]" size={28} />
        <p className="text-sm font-semibold text-neutral-700">Haz clic o arrastra tus fotos aquí</p>
        <p className="mt-1 text-xs text-[#6B6B76]">Máx. 10 fotos · 8 MB c/u · JPG, PNG, WebP</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) void uploadFiles(files, photos);
          }}
        />
      </div>

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((p, i) => (
            <div key={p.localId} className="relative h-[120px] overflow-hidden rounded-xl bg-[#D6D6DC]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
              {p.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                  <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="4" />
                    <circle
                      cx="18" cy="18" r="15" fill="none" stroke="#fff" strokeWidth="4"
                      strokeDasharray={`${p.progress}, 100`} strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
              {p.error && (
                <div className="absolute inset-x-0 bottom-0 bg-red-500/90 px-1 py-0.5 text-center text-[10px] font-bold text-white">
                  {p.error}
                </div>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); void removeAt(i); }}
                aria-label={`Eliminar foto ${i + 1}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow"
              >
                <X size={13} />
              </button>
              <div className="absolute bottom-1 left-1 flex gap-1">
                <button type="button" onClick={(e) => { e.stopPropagation(); move(i, -1); }} aria-label="Mover a la izquierda" className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
                  <ArrowLeft size={12} />
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); move(i, 1); }} aria-label="Mover a la derecha" className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
                  <ArrowRight size={12} />
                </button>
              </div>
              <span className="absolute bottom-1 right-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">{i + 1}</span>
            </div>
          ))}
        </div>
      )}
      {photos.length > 0 && (
        <p className="mt-1 text-right text-xs font-semibold text-orange-500">{photos.length} imagen(es)</p>
      )}

      {/* Descripciones por foto */}
      {photos.map((p, i) => (
        <div key={`meta-${p.localId}`} className="mt-3 rounded-2xl border border-[#E4E4E8] bg-white p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#6B6B76]">Añadir descripción · foto {i + 1}</span>
            <FieldCounter value={p.caption.length} max={120} />
          </div>
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.preview} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
            <input
              value={p.caption}
              onChange={(e) => patch(i, { caption: e.target.value.slice(0, 120) })}
              placeholder="Mi amor de vida en mi ciudad."
              maxLength={120}
              className="w-full rounded-xl border border-[#D6D6DC] bg-[#EBEBEF] px-3 py-2.5 text-[15px] outline-none placeholder:text-neutral-400 focus:border-[#E0698F]"
            />
          </div>
          <div className="mt-2 flex gap-3">
            {p.showDate ? (
              <input
                type="date"
                value={p.takenOn}
                onChange={(e) => patch(i, { takenOn: e.target.value })}
                className="rounded-lg border border-[#D6D6DC] bg-[#EBEBEF] px-2 py-1.5 text-sm"
                aria-label="Fecha de la foto"
              />
            ) : (
              <button type="button" onClick={() => patch(i, { showDate: true })} className="flex items-center gap-1 text-xs font-bold uppercase text-[#E0698F]">
                <CalendarDays size={13} /> Añadir fecha
              </button>
            )}
            {p.showPlace ? (
              <input
                value={p.place}
                onChange={(e) => patch(i, { place: e.target.value.slice(0, 120) })}
                placeholder="Lugar…"
                className="w-40 rounded-lg border border-[#D6D6DC] bg-[#EBEBEF] px-2 py-1.5 text-sm"
                aria-label="Lugar de la foto"
              />
            ) : (
              <button type="button" onClick={() => patch(i, { showPlace: true })} className="flex items-center gap-1 text-xs font-bold uppercase text-[#6B6B76]">
                <MapPin size={13} /> Añadir lugar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
