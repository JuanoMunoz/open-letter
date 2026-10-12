"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Music2 } from "lucide-react";
import { parseSpotifyTrackId } from "@/lib/spotify";
import { FieldLabel } from "./FieldCounter";
import { ui } from "@/templates/ui";

export function SpotifyField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [touched, setTouched] = useState(false);
  const trimmed = value.trim();
  const trackId = trimmed ? parseSpotifyTrackId(trimmed) : null;
  const showError = touched && trimmed.length > 0 && !trackId;

  return (
    <div>
      <FieldLabel accent>{ui.soundtrack}</FieldLabel>
      <div className="rounded-2xl border border-[#D6D6DC] bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBE4EC] text-[#D6457F]">
            <Music2 size={18} />
          </span>
          <p className="text-sm font-bold text-neutral-800">{ui.spotifyTitle} <span className="font-normal text-[#6B6B76]">{ui.optional}</span></p>
        </div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={ui.spotifyPlaceholder}
          inputMode="url"
          className="w-full rounded-xl border border-[#D6D6DC] bg-[#EBEBEF] px-4 py-3 text-[15px] outline-none placeholder:text-neutral-400 focus:border-[#E0698F] focus:ring-4 focus:ring-[#E0698F]/20"
        />
        {trackId && (
          <p className="mt-2 flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
            <CheckCircle2 size={14} /> {ui.spotifyOk(trackId)}
          </p>
        )}
        {showError && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-500">
            <AlertCircle size={14} /> {ui.spotifyError}
          </p>
        )}
      </div>
    </div>
  );
}
