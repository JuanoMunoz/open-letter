import Image from "next/image";

/** Marca openletter: icono + wordmark en minúsculas. */
export function BrandMark({ light = false, size = 22 }: { light?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Image src="/icon.svg" alt="openletter" width={size} height={size} className="rounded-[30%]" />
      <span
        className={`text-[17px] font-bold lowercase tracking-tight ${light ? "text-white/90" : "text-neutral-900"}`}
      >
        openletter
      </span>
    </span>
  );
}
