import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F4F4F6] px-6 py-16 text-center">
      <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#E0698F]">
        openletter · cartas que se desvanecen
      </p>
      <h1 className="max-w-2xl text-5xl font-light leading-[1.05] tracking-tight text-neutral-900 sm:text-6xl">
        Escríbele algo que <em className="font-normal">dure</em>… una semana
      </h1>
      <p className="mt-5 max-w-md text-base leading-relaxed text-[#6B6B76]">
        Una carta vertical con tus palabras, tus fotos y su canción. Estará disponible
        durante 7 días y después se elimina para siempre.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/crear"
          className="rounded-full bg-neutral-900 px-7 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-neutral-700"
        >
          Crear carta →
        </Link>
        <Link
          href="/c/ejemplo"
          className="rounded-full border border-[#D6D6DC] bg-white px-7 py-3.5 text-sm font-bold text-neutral-800 transition hover:border-[#E0698F]"
        >
          Ver carta de ejemplo
        </Link>
      </div>
      <p className="mt-8 max-w-sm text-xs leading-relaxed text-[#6B6B76]">
        Sin cuentas ni apps. Creas el enlace, lo compartes y la magia hace el resto.
      </p>
    </div>
  );
}
