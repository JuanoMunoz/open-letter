"use client";

import { PhotoUploader, type WizardPhoto } from "../PhotoUploader";
import { SpotifyField } from "../SpotifyField";
import { TimelineEditor, type WizardMilestone } from "../TimelineEditor";
import { VoiceRecorder, type WizardAudio } from "../VoiceRecorder";
import type { LetterTemplate } from "@/templates/types";

/** Paso 3: recuerdos (fotos, hitos, voz y canción). */
export function StepMemories({
  template,
  photos,
  setPhotos,
  spotifyUrl,
  setSpotifyUrl,
  uploading,
  failedUpload,
  timeline,
  setTimeline,
  audio,
  setAudio,
  onAudioBusy,
}: {
  template: LetterTemplate;
  photos: WizardPhoto[];
  setPhotos: (p: WizardPhoto[]) => void;
  spotifyUrl: string;
  setSpotifyUrl: (v: string) => void;
  uploading: boolean;
  failedUpload: boolean;
  timeline: WizardMilestone[];
  setTimeline: (m: WizardMilestone[]) => void;
  audio: WizardAudio | null;
  setAudio: (a: WizardAudio | null) => void;
  onAudioBusy: (busy: boolean) => void;
}) {
  const [a, b, c] = template.wizard.step3Title;
  return (
    <div className="space-y-7">
      <h1 className="font-editorial mb-2 text-[42px] leading-[1.05] text-neutral-900 sm:text-[60px]">
        {a} <em>{b}</em> {c}
      </h1>
      <PhotoUploader photos={photos} setPhotos={setPhotos} />
      <hr className="border-[#E4E4E8]" />
      <TimelineEditor milestones={timeline} onChange={setTimeline} photos={photos} />
      <hr className="border-[#E4E4E8]" />
      <VoiceRecorder audio={audio} onAudio={setAudio} onBusy={onAudioBusy} />
      <hr className="border-[#E4E4E8]" />
      <SpotifyField value={spotifyUrl} onChange={setSpotifyUrl} />
      {uploading && <p className="text-xs font-semibold text-[#6B6B76]">Subiendo fotos… el botón se activará al terminar.</p>}
      {failedUpload && <p className="text-xs font-semibold text-red-500">Una foto falló al subir. Elimínala o reintenta.</p>}
    </div>
  );
}
