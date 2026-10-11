import type { SectionItem, TimelineItem, LetterTheme } from "@/templates/types";

export interface ViewerPhoto {
  url: string;
  caption: string | null;
  takenOn: string | null;
  place: string | null;
}

export interface ViewerAudio {
  url: string;
  durationS: number | null;
  mime: string | null;
}

export interface LetterView {
  id: string;
  templateId: string;
  recipientName: string;
  nickname: string | null;
  specialDate: string | null;
  senderName: string | null;
  mainMessage: string;
  /** Secciones dinámicas (Fase B; Fase C añade kinds visuales). */
  sections: SectionItem[];
  timeline: TimelineItem[];
  theme: LetterTheme;
  opening: string;
  spotifyTrackId: string | null;
  expiresAt: string;
  photos: ViewerPhoto[];
  audio: ViewerAudio | null;
}

export type SectionKind =
  | { kind: "cover"; key: string; label: string }
  | { kind: "message"; key: string; label: string }
  | { kind: "card"; key: string; label: string }
  | { kind: "photo"; key: string; label: string; index: number }
  | { kind: "chapter"; key: string; label: string }
  | { kind: "song"; key: string; label: string };
