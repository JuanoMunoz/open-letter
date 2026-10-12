import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { ui } from "@/templates/ui";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F4F4F6] px-6 py-16 text-center">
      <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#E0698F]">
        openletter · {ui.brandTagline}
      </p>
      <h1 className="font-editorial max-w-2xl text-5xl leading-[1.05] tracking-tight text-neutral-900 sm:text-6xl">
        {ui.landingTitleA} <em>{ui.landingTitleEm}</em>
        {ui.landingTitleB}
      </h1>
      <p className="mt-5 max-w-md text-base leading-relaxed text-[#6B6B76]">
        {ui.landingSub}
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/crear"
          className="rounded-full bg-neutral-900 px-7 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-neutral-700"
        >
          {ui.ctaCreate}
        </Link>
      </div>
      <p className="mt-8 max-w-sm text-xs leading-relaxed text-[#6B6B76]">
        {ui.landingNote}
      </p>
      <div className="mt-10 opacity-70">
        <BrandMark />
      </div>
    </div>
  );
}
