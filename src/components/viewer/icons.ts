import {
  BookOpen,
  Cake,
  Gift,
  Heart,
  HeartCrack,
  HeartHandshake,
  Laugh,
  Lightbulb,
  Quote,
  Rocket,
  Sparkles,
  Star,
  Sunrise,
  type LucideIcon,
} from "lucide-react";

/** Registro central: los decks referencian iconos por nombre. */
export const SECTION_ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Cake,
  Gift,
  Heart,
  HeartCrack,
  HeartHandshake,
  Laugh,
  Lightbulb,
  Quote,
  Rocket,
  Sparkles,
  Star,
  Sunrise,
};

export function sectionIcon(name: string): LucideIcon {
  return SECTION_ICONS[name] ?? Sparkles;
}
