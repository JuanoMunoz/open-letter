"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Eye, Clock, Trash2, Inbox } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { formatExpiry } from "@/lib/dates";
import { ui } from "@/templates/ui";
import { useToast } from "@/components/Toast";

interface Reply {
  id: string;
  emoji: string;
  message: string | null;
  createdAt: string;
}

interface Panel {
  recipientName: string;
  templateId: string;
  expiresAt: string;
  viewCount: number;
  lastViewedAt: string | null;
  replies: Reply[];
}

export default function RespuestasPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [token] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.location.hash.match(/token=([a-f0-9]+)/)?.[1] ?? null;
  });
  const [panel, setPanel] = useState<Panel | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(() => token !== null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/cartas/${id}/respuestas`, { headers: { "x-manage-token": token } })
      .then(async (res) => {
        if (!res.ok) {
          setError(res.status === 403 ? ui.panelBadToken : ui.panelLoadFail);
          setLoading(false);
          return;
        }
        setPanel(await res.json());
        setLoading(false);
      })
      .catch(() => {
        setError(ui.networkError);
        setLoading(false);
      });
  }, [id, token]);

  return (
    <div className="min-h-dvh bg-[#F4F4F6] px-5 py-10">
      <div className="mx-auto w-full max-w-[560px]">
        <BrandMark />
        <h1 className="font-editorial mt-4 text-[36px] leading-tight text-neutral-900">
          {ui.panelTitleA} <em>{ui.panelTitleEm}</em>
        </h1>

        {loading && <p className="mt-6 text-sm text-[#6B6B76]">{ui.panelLoading}</p>}
        {!loading && token === null && (
          <div className="mt-6 rounded-3xl border border-[#E4E4E8] bg-white p-6 text-center">
            <p className="text-2xl font-bold">{ui.panelNoTokenTitle}</p>
            <p className="mt-1 text-sm text-[#6B6B76]">
              {ui.panelNoTokenBody}
            </p>
            <Link href="/" className="mt-4 inline-block rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-bold text-white">
              {ui.panelHome}
            </Link>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
        {panel && (
          <>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-[#E4E4E8] bg-white p-3 text-center">
                <Eye size={16} className="mx-auto text-[#6B6B76]" />
                <p className="mt-1 text-xl font-bold">{panel.viewCount}</p>
                <p className="text-[11px] text-[#6B6B76]">{ui.statViews}</p>
              </div>
              <div className="rounded-2xl border border-[#E4E4E8] bg-white p-3 text-center">
                <Inbox size={16} className="mx-auto text-[#6B6B76]" />
                <p className="mt-1 text-xl font-bold">{panel.replies.length}</p>
                <p className="text-[11px] text-[#6B6B76]">{ui.statReplies}</p>
              </div>
              <div className="rounded-2xl border border-[#E4E4E8] bg-white p-3 text-center">
                <Clock size={16} className="mx-auto text-[#6B6B76]" />
                <p className="mt-1 text-[13px] font-bold leading-tight">
                  {format(new Date(panel.expiresAt), "d MMM", { locale: es })}
                </p>
                <p className="text-[11px] text-[#6B6B76]">{ui.statExpiry}</p>
              </div>
            </div>
            {panel.lastViewedAt && (
              <p className="mt-2 text-center text-xs text-[#6B6B76]">
                {ui.lastView(format(new Date(panel.lastViewedAt), "d 'de' MMMM, HH:mm", { locale: es }))}
              </p>
            )}
            <p className="mt-2 text-center text-xs text-[#6B6B76]">
              {ui.availableUntil(formatExpiry(panel.expiresAt))} · luego se elimina todo para siempre.
            </p>

            <h2 className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wide text-[#6B6B76]">
              {ui.panelFor(panel.recipientName)}
            </h2>
            {panel.replies.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#D6D6DC] bg-white/60 px-4 py-6 text-center text-sm text-[#6B6B76]">
                {ui.panelEmpty}
              </p>
            ) : (
              <ul className="space-y-2">
                {panel.replies.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-[#E4E4E8] bg-white px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{r.emoji}</span>
                      <span className="ml-auto text-[11px] text-neutral-400">
                        {format(new Date(r.createdAt), "d MMM, HH:mm", { locale: es })}
                      </span>
                    </div>
                    {r.message && <p className="mt-1.5 text-sm leading-snug text-neutral-800">{r.message}</p>}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex gap-2">
              <Link href={`/c/${id}`} className="flex-1 rounded-full border border-[#D6D6DC] bg-white px-5 py-3 text-center text-sm font-bold">
                {ui.viewLetter}
              </Link>
              <DeleteButton id={id} token={token ?? ""} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DeleteButton({ id, token }: { id: string; token: string }) {
  const router = useRouter();
  const { confirm, toast } = useToast();
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    const ok = await confirm({ title: ui.deleteConfirm, body: ui.deleteConfirmBody, confirmLabel: ui.deleteNow, danger: true });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cartas/${id}`, { method: "DELETE", headers: { "x-manage-token": token } });
      if (res.status !== 204) {
        toast(ui.deleteFailed, "error");
        setBusy(false);
        return;
      }
    } catch {
      toast(ui.networkError, "error");
      setBusy(false);
      return;
    }
    router.push("/");
  };
  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
    >
      <Trash2 size={15} /> {busy ? ui.deleting : ui.panelDelete}
    </button>
  );
}
