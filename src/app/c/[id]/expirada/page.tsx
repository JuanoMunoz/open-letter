import Link from "next/link";
import { getTemplate } from "@/templates";

const t = getTemplate("amor");

export default function ExpiradaPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F4F4F6] px-6 text-center">
      <p className="font-letter text-[64px] font-bold text-[#D6457F]">{t.expiredTitle}</p>
      <p className="mt-2 max-w-sm text-sm text-[#6B6B76]">{t.expiredBody}</p>
      <Link
        href="/crear"
        className="mt-6 rounded-full bg-neutral-900 px-7 py-3 text-sm font-bold text-white"
      >
        {t.expiredCta}
      </Link>
    </div>
  );
}
