import Link from "next/link";

export default function ExpiradaPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F4F4F6] px-6 text-center">
      <p className="font-script text-[64px] font-bold text-[#D6457F]">Se desvaneció…</p>
      <h1 className="mt-2 text-2xl font-light text-neutral-900">
        Esta carta ya cumplió su semana y se desvaneció
      </h1>
      <p className="mt-2 max-w-sm text-sm text-[#6B6B76]">
        Las cartas de openletter viven 7 días y luego se eliminan para siempre. Puedes crear otra.
      </p>
      <Link
        href="/crear"
        className="mt-6 rounded-full bg-neutral-900 px-7 py-3 text-sm font-bold text-white"
      >
        Crear otra carta →
      </Link>
    </div>
  );
}
