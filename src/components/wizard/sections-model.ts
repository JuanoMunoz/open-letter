import type { SectionDef } from "@/templates/types";
import type { OpenPair } from "./ItemsEditor";

export type SectionKind = "text" | "reasons" | "openwhen" | "promises" | "free";

export interface WizardSection {
  uid: string;
  key: string;
  kind: SectionKind;
  title: string;
  icon: string;
  body: string;
  items: string[];
  pairs: OpenPair[];
  enabled: boolean;
  required?: boolean;
  custom: boolean;
  suggestions: string[];
  placeholder: string;
  maxLength: number;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Sección desde un SectionDef de plantilla (+body/stash opcional). */
export function fromDef(def: SectionDef, body = ""): WizardSection {
  return {
    uid: uid(),
    key: def.key,
    kind: "text",
    title: def.viewerTitle || def.label,
    icon: def.icon,
    body,
    items: [],
    pairs: [],
    enabled: def.defaultEnabled,
    required: def.required,
    custom: false,
    suggestions: def.suggestions,
    placeholder: def.placeholder,
    maxLength: def.maxLength,
  };
}

/** ¿La sección aporta contenido al visor? */
export function hasContent(s: WizardSection): boolean {
  return s.enabled && (s.body.trim().length > 0 || s.items.length > 0 || s.pairs.length > 0);
}
