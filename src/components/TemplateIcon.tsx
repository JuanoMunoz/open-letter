import { createElement } from "react";
import { sectionIcon } from "@/components/viewer/icons";

/** Icono de plantilla en cajita tintada (nunca emoji). */
export function TemplateIcon({
  icon,
  brand,
  size = 18,
  box = 36,
}: {
  icon: string;
  brand: string;
  size?: number;
  box?: number;
}) {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-xl"
      style={{ background: `${brand}1A`, color: brand, width: box, height: box }}
    >
      {createElement(sectionIcon(icon), { size })}
    </span>
  );
}
