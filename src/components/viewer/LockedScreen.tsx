"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ui } from "@/templates/ui";

/** Pantalla de acceso para cartas con palabra secreta (sin contenido). */
export function LockedScreen({ id, hint }: { id: string; hint: string | null }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/cartas/${id}/unlock`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "No se pudo abrir. Intenta de nuevo.");
        setBusy(false);
        return;
      }
      window.location.reload();
    } catch {
      setError(`${ui.networkError} ${ui.retryHint}`);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F4F4F6] px-6 py-16">
      <div className="w-full max-w-sm rounded-[28px] border border-[#E4E4E8] bg-white p-7 text-center shadow-[0_10px_40px_rgba(214,69,127,.10)]">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBE4EC] text-[#D6457F]">
          <Lock size={22} />
        </span>
        <h1 className="font-letter text-[34px] font-semibold leading-tight text-neutral-900">
          {ui.lockedTitle}
        </h1>
        <p className="mt-1 text-sm text-[#6B6B76]">
          {ui.lockedSub}
        </p>
        {hint && (
          <p className="mt-3 rounded-2xl bg-[#F4F4F6] px-4 py-2.5 text-sm italic text-neutral-600">
            {ui.lockedHint(hint)}
          </p>
        )}
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={ui.lockedSecretPlaceholder}
            autoComplete="off"
            maxLength={128}
            aria-label={ui.lockedSecretPlaceholder}
            className="h-[50px] w-full rounded-xl border border-[#D6D6DC] bg-[#EBEBEF] px-4 text-center text-[16px] outline-none placeholder:text-neutral-400 focus:border-[#E0698F]"
          />
          {error && (
            <p role="alert" className="text-sm font-semibold text-red-500">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!password || busy}
            className="w-full rounded-full bg-neutral-900 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? ui.opening : ui.openLetter}
          </button>
        </form>
      </div>
      <div className="mt-6 opacity-70">
        <BrandMark />
      </div>
    </div>
  );
}
