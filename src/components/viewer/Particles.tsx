"use client";

import { useEffect, useRef } from "react";
import type { ParticleKind } from "@/templates/types";

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  phase: number;
  rot: number;
  vr: number;
  shape: number; // 0 círculo, 1 pétalo/elipse, 2 corazón, 3 estrella, 4 confeti
  tint: string;
}

function drawHeart(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(0, s * 0.1, -s * 0.5, -s * 0.15, -s * 0.5, s * 0.05);
  ctx.bezierCurveTo(-s * 0.5, s * 0.3, 0, s * 0.45, 0, s * 0.6);
  ctx.bezierCurveTo(0, s * 0.45, s * 0.5, s * 0.3, s * 0.5, s * 0.05);
  ctx.bezierCurveTo(s * 0.5, -s * 0.15, 0, s * 0.1, 0, s * 0.35);
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? s : s * 0.45;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/** Partículas de la plantilla (pétalos, corazones, estrellas, confeti, nieve). */
export function Particles({ kind = "petalos", color = "#E0698F" }: { kind?: ParticleKind; color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (kind === "ninguna") return;
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const snow = kind === "nieve";
    const confetti = kind === "confeti";
    const palette = confetti
      ? [color, "#FFD166", "#8ECAE6", "#B388EB", "#ffffff"]
      : ["#ffffff", color];
    const pickShape = (): number => {
      if (snow || confetti) return snow ? 0 : 4;
      if (kind === "corazones") return Math.random() < 0.5 ? 2 : 0;
      if (kind === "estrellas") return Math.random() < 0.5 ? 3 : 0;
      return Math.random() < 0.35 ? 1 : 0; // pétalos
    };

    let raf = 0;
    let w = 0;
    let h = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const parts: P[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const spawn = (anywhere = false): P => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      vx: snow ? (Math.random() - 0.5) * 10 : 8 + Math.random() * 14,
      vy: snow ? 12 + Math.random() * 16 : -(10 + Math.random() * 18),
      size: (snow ? 2 : 3) + Math.random() * 4,
      opacity: (snow ? 0.5 : 0.3) + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * (confetti ? 0.08 : 0.02),
      shape: pickShape(),
      tint: snow ? "#ffffff" : palette[Math.floor(Math.random() * palette.length)],
    });
    for (let i = 0; i < 24; i++) parts.push(spawn(true));

    let t = 0;
    let visible = true;
    const onVis = () => {
      visible = !document.hidden;
      if (visible) loop();
    };
    document.addEventListener("visibilitychange", onVis);

    const loop = () => {
      if (!visible) return;
      raf = requestAnimationFrame(loop);
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += (p.vx + Math.sin(t + p.phase) * 6) * 0.016;
        p.y += p.vy * 0.016;
        p.rot += p.vr;
        if (snow ? p.y > h + 12 : p.y < -12 || p.x > w + 12) Object.assign(p, spawn());
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.tint;
        if (p.shape === 1) {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.55, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 2) {
          drawHeart(ctx, p.size);
        } else if (p.shape === 3) {
          drawStar(ctx, p.size * 0.7);
        } else if (p.shape === 4) {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
    };
  }, [kind, color]);

  if (kind === "ninguna") return null;
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
