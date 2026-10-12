"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import QRCode from "qrcode";
import { Copy, Check, Eye, Share2, Trash2, QrCode, Download, MessageCircle, Mail, Inbox } from "lucide-react";
import { getTemplate } from "@/templates";

export default function ExitoPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [token] = useState(() => {
    if (typeof window === "undefined") return "";
    const m = window.location.hash.match(/token=([a-f0-9]+)/);
    return m ? m[1] : "";
  });
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [qr, setQr] = useState("");
  const [makingCard, setMakingCard] = useState(false);
  const [meta] = useState(() => {
    if (typeof window === "undefined") return { recipientName: "", templateId: "amor" };
    try {
      const raw = sessionStorage.getItem("openletter-last");
      if (raw) return { recipientName: "", templateId: "amor", ...JSON.parse(raw) };
    } catch { /* noop */ }
    return { recipientName: "", templateId: "amor" };
  });

  const url = `/c/${id}`;
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const fullUrl = origin ? `${origin}/c/${id}` : url;
  const template = getTemplate(meta.templateId);

  useEffect(() => {
    QRCode.toDataURL(fullUrl, { width: 440, margin: 2, color: { dark: "#1c1c22", light: "#ffffff" } })
      .then(setQr)
      .catch(() => {});
  }, [fullUrl]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = fullUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Una carta para ti", url: fullUrl });
      } catch { /* cancelado */ }
    } else {
      void copy();
    }
  };

  const downloadQr = () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `openletter-${id}-qr.png`;
    a.click();
  };

  /** Tarjeta 1080×1350 para imprimir/compartir (canvas, con QR). */
  const downloadCard = async () => {
    if (makingCard) return;
    setMakingCard(true);
    try {
      const W = 1080;
      const H = 1350;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, template.theme.bgGradient[0]);
      grad.addColorStop(1, template.theme.brandSoft);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      // Marco
      ctx.strokeStyle = template.theme.brand;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(48, 48, W - 96, H - 96, 48);
      ctx.stroke();
      // Icono (sobre con corazón, estilo marca)
      ctx.fillStyle = template.theme.brand;
      ctx.beginPath();
      ctx.roundRect(W / 2 - 130, 200, 260, 170, 28);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "120px serif";
      ctx.textAlign = "center";
      ctx.fillText("♥", W / 2, 330);
      // Nombre
      ctx.fillStyle = "#1c1c22";
      try {
        await document.fonts.load('90px Caveat');
      } catch { /* fallback */ }
      ctx.font = "90px Caveat, cursive";
      const name = meta.recipientName || "Para ti";
      ctx.fillText(name.length > 18 ? name.slice(0, 18) + "…" : name, W / 2, 560, W - 200);
      ctx.fillStyle = "#6B6B76";
      ctx.font = "600 34px Inter, sans-serif";
      ctx.fillText("Alguien te escribió algo especial", W / 2, 630);
      ctx.fillText("con openletter", W / 2, 675);
      // QR
      const qrUrl = await QRCode.toDataURL(fullUrl, { width: 560, margin: 1 });
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("qr"));
        img.src = qrUrl;
      });
      const QS = 380;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(W / 2 - QS / 2 - 24, 760, QS + 48, QS + 48, 32);
      ctx.fill();
      ctx.drawImage(img, W / 2 - QS / 2, 784, QS, QS);
      ctx.fillStyle = "#6B6B76";
      ctx.font = "600 30px Inter, sans-serif";
      ctx.fillText("Escanea para leerla · vive 7 días", W / 2, 1240);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `openletter-${id}-tarjeta.png`;
      a.click();
    } catch {
      /* noop */
    } finally {
      setMakingCard(false);
    }
  };

  const waUrl = `https://wa.me/?text=${encodeURIComponent(`Te escribí una carta con openletter 💌 ${fullUrl}`)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent("Te escribí una carta")}&body=${encodeURIComponent(`Léela aquí: ${fullUrl}`)}`;

  const remove = async () => {
    if (!confirm("¿Eliminar esta carta ahora mismo? No se podrá recuperar.")) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/cartas/${id}`, {
        method: "DELETE",
        headers: { "x-manage-token": token },
      });
      if (res.status === 204) {
        setDeleted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteError((data as { error?: string }).error ?? "No se pudo eliminar.");
      }
    } catch {
      setDeleteError("Error de red.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center bg-[#F4F4F6] px-6 py-16 text-center">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md">
        {/* Confeti rosa sutil (una sola vez, CSS puro) */}
        <div aria-hidden className="pointer-events-none relative mx-auto h-16 w-64">
          {Array.from({ length: 18 }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ y: -10, opacity: 0, rotate: 0 }}
              animate={{ y: [0, 46], opacity: [0, 1, 0], rotate: 180 }}
              transition={{ duration: 1.6, delay: i * 0.06, ease: "easeOut" }}
              className="absolute top-0 h-2 w-1.5 rounded-sm"
              style={{
                left: `${(i * 53) % 100}%`,
                background: i % 3 === 0 ? "#E0698F" : i % 3 === 1 ? "#F8BBD0" : "#D6457F",
              }}
            />
          ))}
        </div>

        <h1 className="text-4xl font-light text-neutral-900">Tu carta está <em>lista</em></h1>
        <p className="mt-2 text-sm text-[#6B6B76]">Compártela con esa persona especial.</p>

        <div className="mt-6 rounded-3xl border border-[#E4E4E8] bg-white p-5 text-left shadow-sm">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#6B6B76]">Enlace de tu carta</p>
          <p className="break-all text-sm font-semibold text-neutral-900">{fullUrl || url}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={copy} className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white">
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "¡Copiado!" : "Copiar enlace"}
            </button>
            <Link href={`/c/${id}`} className="flex items-center gap-1.5 rounded-full border border-[#D6D6DC] bg-white px-5 py-2.5 text-sm font-bold text-neutral-800">
              <Eye size={15} /> Ver carta
            </Link>
            <button onClick={share} className="flex items-center gap-1.5 rounded-full border border-[#D6D6DC] bg-white px-5 py-2.5 text-sm font-bold text-neutral-800">
              <Share2 size={15} /> Compartir
            </button>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white">
              <MessageCircle size={15} /> WhatsApp
            </a>
            <a href={mailUrl} className="flex items-center gap-1.5 rounded-full border border-[#D6D6DC] bg-white px-5 py-2.5 text-sm font-bold text-neutral-800">
              <Mail size={15} /> Correo
            </a>
            {token && (
              <Link href={`/c/${id}/respuestas#token=${token}`} className="flex items-center gap-1.5 rounded-full border border-[#D6D6DC] bg-white px-5 py-2.5 text-sm font-bold text-neutral-800">
                <Inbox size={15} /> Ver respuestas
              </Link>
            )}
          </div>
        </div>

        {/* QR + tarjeta */}
        <div className="mt-4 rounded-3xl border border-[#E4E4E8] bg-white p-5 text-left shadow-sm">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#6B6B76]">Código QR</p>
          <div className="flex items-center gap-4">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR del enlace de la carta" className="h-28 w-28 rounded-2xl border border-[#E4E4E8]" />
            ) : (
              <span className="flex h-28 w-28 items-center justify-center rounded-2xl bg-[#EBEBEF] text-neutral-400">
                <QrCode size={28} />
              </span>
            )}
            <div className="flex flex-1 flex-col gap-2">
              <button onClick={downloadQr} disabled={!qr} className="flex items-center justify-center gap-1.5 rounded-full border border-[#D6D6DC] bg-white px-4 py-2 text-sm font-bold text-neutral-800 disabled:opacity-40">
                <Download size={15} /> Descargar QR
              </button>
              <button onClick={downloadCard} disabled={makingCard} className="flex items-center justify-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                <Download size={15} /> {makingCard ? "Creando…" : "Tarjeta PNG (1080×1350)"}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-[#6B6B76]">La tarjeta sirve para imprimir o mandar por chat.</p>
        </div>

        <p className="mt-4 text-xs text-[#6B6B76]">
          Disponible hasta dentro de 7 días. Después se elimina para siempre.
        </p>

        {token && !deleted && (
          <button onClick={remove} disabled={deleting} className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-red-500 disabled:opacity-50">
            <Trash2 size={13} /> {deleting ? "Eliminando…" : "Eliminar ahora"}
          </button>
        )}
        {deleted && <p className="mt-4 text-sm font-bold text-green-600">Carta eliminada para siempre.</p>}
        {deleteError && <p className="mt-4 text-sm font-semibold text-red-500">{deleteError}</p>}
      </motion.div>
    </div>
  );
}
