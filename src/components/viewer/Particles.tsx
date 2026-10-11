"use client";

import { useEffect, useRef } from "react";

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
  petal: boolean;
  pink: boolean;
}

/** ~24 partículas rosas/blancas derivando en diagonal, canvas restringido al marco. */
export function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
      vx: 8 + Math.random() * 14,
      vy: -(10 + Math.random() * 18),
      size: 3 + Math.random() * 4,
      opacity: 0.3 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.02,
      petal: Math.random() < 0.3,
      pink: Math.random() < 0.6,
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
        if (p.y < -12 || p.x > w + 12) Object.assign(p, spawn());
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.pink ? "#E0698F" : "#ffffff";
        if (p.petal) {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.55, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
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
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
