import Link from "next/link";
import { ui } from "@/templates/ui";
import { getTemplate } from "@/templates";

const t = getTemplate("amor");

export default function CartaNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F4F4F6] px-6 text-center">
      <p className="font-letter text-[64px] font-bold text-[#D6457F]">Ups…</p>
      <h1 className="mt-2 text-2xl font-light text-neutral-900">{t.missingTitle}</h1>
      <p className="mt-2 max-w-sm text-sm text-[#6B6B76]">{t.missingBody}</p>
      <Link
        href="/crear"
        className="mt-6 rounded-full bg-neutral-900 px-7 py-3 text-sm font-bold text-white"
      >
        {ui.ctaCreate}
      </Link>
    </div>
  );
}
