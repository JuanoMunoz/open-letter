"use client";

import { PhotoUploader, type WizardPhoto } from "../PhotoUploader";
import { SpotifyField } from "../SpotifyField";
import type { LetterTemplate } from "@/templates/types";

/** Paso 3: recuerdos (fotos + canción; timeline y voz llegan en Fase D). */
export function StepMemories({
  template,
  photos,
  setPhotos,
  spotifyUrl,
  setSpotifyUrl,
  uploading,
  failedUpload,
}: {
  template: LetterTemplate;
  photos: WizardPhoto[];
  setPhotos: (p: WizardPhoto[]) => void;
  spotifyUrl: string;
  setSpotifyUrl: (v: string) => void;
  uploading: boolean;
  failedUpload: boolean;
}) {
  const [a, b, c] = template.wizard.step3Title;
  return (
    <div className="space-y-7">
      <h1 className="font-editorial mb-2 text-[42px] leading-[1.05] text-neutral-900 sm:text-[60px]">
        {a} <em>{b}</em> {c}
      </h1>
      <PhotoUploader photos={photos} setPhotos={setPhotos} />
      <hr className="border-[#E4E4E8]" />
      <SpotifyField value={spotifyUrl} onChange={setSpotifyUrl} />
      {uploading && <p className="text-xs font-semibold text-[#6B6B76]">Subiendo fotos… el botón se activará al terminar.</p>}
      {failedUpload && <p className="text-xs font-semibold text-red-500">Una foto falló al subir. Elimínala o reintenta.</p>}
    </div>
  );
}
