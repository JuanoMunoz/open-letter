/** Biblioteca global de secciones extra (disponibles en cualquier plantilla). */
export interface ExtraSectionDef {
  key: string;
  kind: "reasons" | "openwhen" | "promises" | "text";
  label: string;
  placeholder: string;
  icon: string;
  viewerTitle: string;
  hint: string;
  suggestions: string[];
}

export const EXTRA_SECTIONS: ExtraSectionDef[] = [
  {
    key: "reasons",
    kind: "reasons",
    label: "Razones por las que…",
    placeholder: "Razón 1…",
    icon: "ListOrdered",
    viewerTitle: "Razones",
    hint: "Lista numerada (hasta 20). En la carta aparecen una por una.",
    suggestions: [
      "Por cómo me miras cuando…",
      "Porque siempre…",
      "Por tu risa cuando…",
      "Porque conmigo eres…",
    ],
  },
  {
    key: "laugh",
    kind: "text",
    label: "Lo que me hace reír",
    placeholder: "Me río cada vez que…",
    icon: "Laugh",
    viewerTitle: "Risas",
    hint: "Esos momentos que solo ustedes entienden.",
    suggestions: [
      "Me río cada vez que…",
      "Nunca olvidaré cuando…",
      "Tu chiste de…",
      "Esa vez que nos reímos hasta…",
    ],
  },
  {
    key: "openwhen",
    kind: "openwhen",
    label: "Ábrela cuando…",
    placeholder: "…tengas un mal día",
    icon: "MailOpen",
    viewerTitle: "Ábrela cuando…",
    hint: "De 1 a 5 mini cartas con condición y mensaje.",
    suggestions: [
      "…tengas un mal día",
      "…extrañes mi risa",
      "…necesites un abrazo",
      "…dudes de ti",
    ],
  },
  {
    key: "promises",
    kind: "promises",
    label: "Promesas",
    placeholder: "Prometo…",
    icon: "BadgeCheck",
    viewerTitle: "Prometo",
    hint: "Hasta 10 promesas con ✓ animado en la carta.",
    suggestions: [
      "Prometo escucharte cuando…",
      "Prometo estar cuando…",
      "Prometo cuidarte en…",
      "Prometo reírme contigo en…",
    ],
  },
];

export const MAX_SECTIONS = 8;
