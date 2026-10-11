import {
  BadgeCheck,
  BookOpen,
  Cake,
  Gift,
  Heart,
  HeartCrack,
  HeartHandshake,
  Laugh,
  Lightbulb,
  ListOrdered,
  MailOpen,
  Quote,
  Rocket,
  Sparkles,
  Star,
  Sunrise,
  GripVertical,
  type LucideIcon,
} from "lucide-react";

/** Registro central: los decks referencian iconos por nombre. */
export const SECTION_ICONS: Record<string, LucideIcon> = {
  BadgeCheck,
  BookOpen,
  Cake,
  Gift,
  GripVertical,
  Heart,
  HeartCrack,
  HeartHandshake,
  Laugh,
  Lightbulb,
  ListOrdered,
  MailOpen,
  Quote,
  Rocket,
  Sparkles,
  Star,
  Sunrise,
};

export function sectionIcon(name: string): LucideIcon {
  return SECTION_ICONS[name] ?? Sparkles;
}
