"use client";

import { Plus, X, CalendarDays } from "lucide-react";
import { ui } from "@/templates/ui";
import type { WizardPhoto } from "./PhotoUploader";

export interface WizardMilestone {
  uid: string;
  date: string;
  title: string;
  body: string;
  /** ut_key de la foto elegida (se resuelve a assetId al crear). */
  assetKey?: string;
}

function newUid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyMilestone(): WizardMilestone {
  return { uid: newUid(), date: "", title: "", body: "" };
}

/** Línea de tiempo del wizard (textos en el copy compartido). */
export function TimelineEditor({
  milestones,
  onChange,
  photos,
}: {
  milestones: WizardMilestone[];
  onChange: (m: WizardMilestone[]) => void;
  photos: WizardPhoto[];
}) {
  const readyPhotos = photos.filter((p) => p.key && p.url);

  const patch = (uid: string, p: Partial<WizardMilestone>) =>
    onChange(milestones.map((m) => (m.uid === uid ? { ...m, ...p } : m)));

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--brand-soft, #FBE4EC)", color: "var(--brand, #D6457F)" }}>
          <CalendarDays size={18} />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--brand, #E0698F)" }}>
            {ui.timelineTitle}
          </p>
          <p className="text-xs text-[#6B6B76]">{ui.timelineSub(milestones.length)}</p>
        </div>
      </div>

      {milestones.length > 0 && (
        <ol className="space-y-2.5">
          {milestones.map((m, i) => (
            <li key={m.uid} className="rounded-2xl border border-[#E4E4E8] bg-white p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: "var(--brand, #E0698F)" }}>
                  {i + 1}
                </span>
                <input
                  type="date"
                  value={m.date}
                  onChange={(e) => patch(m.uid, { date: e.target.value })}
                  aria-label={ui.milestoneDate(i + 1)}
                  lang="es"
                  className="rounded-lg border border-[#D6D6DC] bg-[#EBEBEF] px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => onChange(milestones.filter((x) => x.uid !== m.uid))}
                  aria-label={ui.milestoneRemove(i + 1)}
                  className="ml-auto text-neutral-400 hover:text-red-500"
                >
                  <X size={15} />
                </button>
              </div>
              <input
                value={m.title}
                onChange={(e) => patch(m.uid, { title: e.target.value.slice(0, 60) })}
                placeholder={ui.milestoneTitlePh}
                aria-label={ui.milestoneTitle(i + 1)}
                maxLength={60}
                className="w-full rounded-xl border border-[#D6D6DC] bg-[#EBEBEF] px-3 py-2 text-[15px] font-bold outline-none placeholder:font-normal placeholder:text-neutral-400 focus:border-[#E0698F]"
              />
              <textarea
                value={m.body}
                onChange={(e) => patch(m.uid, { body: e.target.value.slice(0, 200) })}
                placeholder={ui.milestoneBodyPh}
                aria-label={ui.milestoneBody(i + 1)}
                rows={2}
                maxLength={200}
                className="mt-1.5 w-full resize-y rounded-xl border border-[#D6D6DC] bg-[#EBEBEF] px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-[#E0698F]"
              />
              {readyPhotos.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => patch(m.uid, { assetKey: undefined })}
                    aria-pressed={!m.assetKey}
                    className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${!m.assetKey ? "bg-neutral-900 text-white" : "bg-[#EBEBEF] text-neutral-500"}`}
                  >
                    {ui.milestoneNoPhoto}
                  </button>
                  {readyPhotos.map((p) => (
                    <button
                      key={p.localId}
                      type="button"
                      onClick={() => patch(m.uid, { assetKey: p.key })}
                      aria-pressed={m.assetKey === p.key}
                      aria-label={ui.milestonePhoto(readyPhotos.indexOf(p) + 1, i + 1)}
                      className={`h-11 w-11 shrink-0 overflow-hidden rounded-lg border-2 transition ${m.assetKey === p.key ? "border-[#E0698F]" : "border-transparent"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.preview} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {milestones.length < 8 ? (
        <button
          type="button"
          onClick={() => onChange([...milestones, emptyMilestone()])}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[#D6D6DC] px-4 py-3 text-sm font-bold text-neutral-600 transition hover:border-[#E0698F]"
        >
          <Plus size={16} /> {ui.milestoneAdd(milestones.length)}
        </button>
      ) : (
        <p className="mt-2 text-xs font-semibold text-[#6B6B76]">{ui.milestoneMax}</p>
      )}
    </div>
  );
}
