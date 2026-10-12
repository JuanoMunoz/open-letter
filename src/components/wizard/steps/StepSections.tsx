"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Plus, X, Check } from "lucide-react";
import { SectionEditor } from "../SectionEditor";
import { EXTRA_SECTIONS, MAX_SECTIONS } from "@/templates/extras";
import { sectionIcon } from "@/components/viewer/icons";
import { ui } from "@/templates/ui";
import { createElement } from "react";
import type { WizardSection } from "../sections-model";
import { uid } from "../sections-model";
import type { LetterTemplate, SectionDef } from "@/templates/types";

const BLANK_ICONS = ["Sparkles", "Heart", "Star", "Gift", "Lightbulb", "Sunrise", "Music2", "Camera"];

function BlankForm({ onAdd, onClose }: { onAdd: (title: string, icon: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("Sparkles");
  return (
    <div className="rounded-2xl border border-[#D6D6DC] bg-white p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 60))}
        placeholder={ui.blankTitlePh}
        aria-label={ui.blankTitle}
        maxLength={60}
        className="w-full rounded-xl border border-[#D6D6DC] bg-[#EBEBEF] px-3 py-2.5 text-[15px] outline-none placeholder:text-neutral-400 focus:border-[#E0698F]"
      />
      <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label={ui.iconPicker}>
        {BLANK_ICONS.map((name) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={icon === name}
            onClick={() => setIcon(name)}
            aria-label={ui.iconPick(name)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 transition ${icon === name ? "border-[#E0698F] bg-[#FBE4EC]" : "border-transparent bg-[#EBEBEF]"}`}
          >
            {createElement(sectionIcon(name), { size: 16 })}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => title.trim() && onAdd(title.trim(), icon)}
          disabled={!title.trim()}
          className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          {ui.addSection}
        </button>
        <button type="button" onClick={onClose} className="rounded-full border border-[#D6D6DC] px-5 py-2 text-sm font-bold">
          {ui.cancel}
        </button>
      </div>
    </div>
  );
}

export function StepSections({
  template,
  sections,
  onSections,
}: {
  template: LetterTemplate;
  sections: WizardSection[];
  onSections: (s: WizardSection[]) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [blankOpen, setBlankOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const present = useMemo(() => new Set(sections.map((s) => s.key)), [sections]);
  const missingDefs = useMemo(() => template.sections.filter((d) => !present.has(d.key)), [template, present]);
  const missingExtras = useMemo(() => EXTRA_SECTIONS.filter((e) => !present.has(e.key)), [present]);
  const full = sections.length >= MAX_SECTIONS;

  const patchOne = (u: string, s: WizardSection) => onSections(sections.map((x) => (x.uid === u ? s : x)));

  const addFromDef = (def: SectionDef) => {
    if (full) return;
    onSections([
      ...sections,
      {
        uid: uid(),
        key: def.key,
        kind: "text",
        title: def.viewerTitle || def.label,
        icon: def.icon,
        body: "",
        items: [],
        pairs: [],
        enabled: true,
        custom: false,
        suggestions: def.suggestions,
        placeholder: def.placeholder,
        maxLength: def.maxLength,
      },
    ]);
    setMenuOpen(false);
  };

  const addExtra = (key: string) => {
    const e = EXTRA_SECTIONS.find((x) => x.key === key);
    if (!e || full) return;
    onSections([
      ...sections,
      {
        uid: uid(),
        key: e.key,
        kind: e.kind,
        title: e.viewerTitle,
        icon: e.icon,
        body: "",
        items: [],
        pairs: [],
        enabled: true,
        custom: true,
        suggestions: e.suggestions,
        placeholder: e.placeholder,
        maxLength: 1200,
      },
    ]);
    setMenuOpen(false);
  };

  const addBlank = (title: string, icon: string) => {
    if (full) return;
    onSections([
      ...sections,
      {
        uid: uid(),
        key: `custom-${uid()}`,
        kind: "free",
        title,
        icon,
        body: "",
        items: [],
        pairs: [],
        enabled: true,
        custom: true,
        suggestions: [],
        placeholder: "Escribe libremente…",
        maxLength: 1200,
      },
    ]);
    setBlankOpen(false);
    setMenuOpen(false);
  };

  const onDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const from = sections.findIndex((s) => s.uid === active.id);
    const to = sections.findIndex((s) => s.uid === over.id);
    if (from < 0 || to < 0) return;
    // La principal (required) siempre queda primera.
    const next = arrayMove(sections, from, to);
    const main = next.find((s) => s.required);
    if (main) {
      const rest = next.filter((s) => s !== main);
      onSections([main, ...rest]);
    } else {
      onSections(next);
    }
  };

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sections.map((s) => s.uid)} strategy={verticalListSortingStrategy}>
          {sections.map((s) => (
            <SectionEditor
              key={s.uid}
              section={s}
              onChange={(next) => patchOne(s.uid, next)}
              onRemove={s.custom && !s.required ? () => onSections(sections.filter((x) => x.uid !== s.uid)) : undefined}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* + Añadir sección */}
      {!full ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className="flex w-full items-center justify-center gap-1.5 rounded-3xl border-2 border-dashed border-[#D6D6DC] bg-white/60 px-4 py-3.5 text-sm font-bold text-neutral-700 transition hover:border-[#E0698F]"
          >
            {menuOpen ? <X size={16} /> : <Plus size={16} />} {ui.addMenu(sections.length, MAX_SECTIONS)}
          </button>
          {menuOpen && (
            <div className="absolute inset-x-0 z-30 mt-2 max-h-[320px] overflow-y-auto rounded-2xl border border-[#E4E4E8] bg-white p-2 shadow-xl">
              {missingDefs.length > 0 && (
                <>
                  <p className="px-2 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-[#6B6B76]">
                    {ui.addMenuFrom(template.name)}
                  </p>
                  {missingDefs.map((d) => (
                    <button key={d.key} type="button" onClick={() => addFromDef(d)} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold hover:bg-[#F4F4F6]">
                      <span style={{ color: "var(--brand, #E0698F)" }}>{createElement(sectionIcon(d.icon), { size: 15 })}</span>
                      {d.label}
                    </button>
                  ))}
                </>
              )}
              {missingExtras.length > 0 && (
                <>
                  <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-[#6B6B76]">
                    {ui.addMenuLibrary}
                  </p>
                  {missingExtras.map((e) => (
                    <button key={e.key} type="button" onClick={() => addExtra(e.key)} className="block w-full rounded-xl px-2 py-2 text-left hover:bg-[#F4F4F6]">
                      <span className="block text-sm font-semibold">{e.label}</span>
                      <span className="block text-xs text-[#6B6B76]">{e.hint}</span>
                    </button>
                  ))}
                </>
              )}
              <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-[#6B6B76]">
                {ui.addMenuCustom}
              </p>
              {!blankOpen ? (
                <button type="button" onClick={() => setBlankOpen(true)} className="flex w-full items-center gap-1.5 rounded-xl px-2 py-2 text-left text-sm font-semibold hover:bg-[#F4F4F6]">
                  <Plus size={15} /> {ui.addMenuBlank}
                </button>
              ) : (
                <div className="px-1 pb-1">
                  <BlankForm onAdd={addBlank} onClose={() => setBlankOpen(false)} />
                </div>
              )}
              {missingDefs.length === 0 && missingExtras.length === 0 && !blankOpen && (
                <p className="px-2 py-2 text-xs text-[#6B6B76]">{ui.addMenuDone}</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="flex items-center gap-1 text-xs font-semibold text-[#6B6B76]">
          <Check size={13} /> {ui.addMenuMax(MAX_SECTIONS)}
        </p>
      )}
    </div>
  );
}
