"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Music2 } from "lucide-react";
import { ui } from "@/templates/ui";

type MusicStatus = "idle" | "ready" | "playing" | "paused" | "blocked";

interface SpotifyController {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  addListener: (event: string, cb: (e: { data?: { isPaused?: boolean } }) => void) => void;
}

interface SpotifyIFrameAPI {
  createController: (
    element: HTMLElement,
    options: { uri: string; width: string; height: string },
    callback: (c: SpotifyController) => void,
  ) => void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void;
    SpotifyIframeApi?: SpotifyIFrameAPI;
  }
}

let scriptPromise: Promise<SpotifyIFrameAPI> | null = null;

function loadApi(): Promise<SpotifyIFrameAPI> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.SpotifyIframeApi) return Promise.resolve(window.SpotifyIframeApi);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      window.onSpotifyIframeApiReady = (api) => {
        window.SpotifyIframeApi = api;
        resolve(api);
      };
      const s = document.createElement("script");
      s.src = "https://open.spotify.com/embed/iframe-api/v1";
      s.async = true;
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error("spotify api"));
      };
      document.head.appendChild(s);
      setTimeout(() => reject(new Error("timeout")), 12000);
    });
  }
  return scriptPromise;
}

/**
 * Reproductor de fondo: controlador oculto de Spotify que arranca con la
 * señal de apertura (gesto fresco del sobre). Si el navegador lo bloquea,
 * muestra la píldora "Poner música" (un toque basta).
 */
export function SongPlayer({
  trackId,
  autostart,
  onLive,
  apiRef,
}: {
  trackId: string | null;
  /** Se incrementa para intentar reproducir (apertura de la carta). */
  autostart: number;
  onLive: (live: boolean) => void;
  apiRef: React.MutableRefObject<{ pause: () => void } | null>;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controller = useRef<SpotifyController | null>(null);
  const [status, setStatus] = useState<MusicStatus>("idle");
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  });
  const onLiveRef = useRef(onLive);
  useEffect(() => {
    onLiveRef.current = onLive;
  });

  const ensure = useCallback(async (): Promise<SpotifyController | null> => {
    if (controller.current) return controller.current;
    if (!trackId || !mountRef.current) return null;
    try {
      const api = await loadApi();
      const ctrl = await new Promise<SpotifyController>((resolve, reject) => {
        try {
          api.createController(
            mountRef.current!,
            { uri: `spotify:track:${trackId}`, width: "0", height: "0" },
            (c) => resolve(c),
          );
        } catch (e) {
          reject(e);
        }
      });
      ctrl.addListener("playback_update", (e) => {
        const paused = e.data?.isPaused;
        if (paused === undefined) return;
        setStatus(paused ? "paused" : "playing");
        onLiveRef.current(!paused);
      });
      controller.current = ctrl;
      apiRef.current = {
        pause: () => {
          try {
            ctrl.pause();
          } catch { /* noop */ }
          setStatus("paused");
          onLiveRef.current(false);
        },
      };
      return ctrl;
    } catch {
      return null;
    }
  }, [trackId, apiRef]);

  // Auto-arranque con la apertura (gesto fresco → máxima probabilidad).
  // El estado se actualiza por eventos (playback_update) o timeout, nunca
  // sincrónico aquí.
  useEffect(() => {
    if (!trackId || autostart <= 0) return;
    let cancelled = false;
    void ensure().then((ctrl) => {
      if (!ctrl || cancelled) return;
      try {
        ctrl.play();
        // Si en 2.5 s no hay confirmación de playback, fue bloqueado.
        setTimeout(() => {
          if (!cancelled && statusRef.current !== "playing") {
            statusRef.current = "blocked";
            setStatus("blocked");
            onLiveRef.current(false);
          }
        }, 2500);
      } catch {
        setStatus("blocked");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [autostart, trackId, ensure]);

  // Pausa al ocultar la pestaña.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && statusRef.current === "playing") {
        try {
          controller.current?.pause();
        } catch { /* noop */ }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const tap = () => {
    if (status === "playing") {
      try {
        controller.current?.pause();
      } catch { /* noop */ }
      setStatus("paused");
      onLive(false);
      return;
    }
    void ensure().then((ctrl) => {
      if (!ctrl) return;
      try {
        ctrl.play();
        setTimeout(() => {
          if (statusRef.current !== "playing") setStatus("blocked");
        }, 2500);
      } catch {
        setStatus("blocked");
      }
    });
  };

  if (!trackId || status === "idle" || status === "ready") return null;

  return (
    <>
      {/* Controlador oculto (el audio sale igual). */}
      <div ref={mountRef} aria-hidden className="absolute h-0 w-0 overflow-hidden" />
      <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
        <button
          type="button"
          onClick={tap}
          aria-label={status === "playing" ? ui.pauseMusic : ui.playMusic}
          className="flex items-center gap-2 rounded-full bg-black/55 py-2.5 pl-4 pr-5 text-sm font-bold text-white shadow-xl backdrop-blur transition hover:bg-black/70"
        >
          {status === "playing" ? (
            <>
              <span className="flex h-4 items-end gap-[2px]" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-full bg-white"
                    style={{ height: "100%", animation: `musicbar 0.8s ease-in-out ${i * 0.15}s infinite alternate` }}
                  />
                ))}
              </span>
              <style>{`@keyframes musicbar { from { transform: scaleY(0.35); } to { transform: scaleY(1); } }`}</style>
              {ui.sounding}
              <Pause size={15} />
            </>
          ) : status === "blocked" ? (
            <>
              <Play size={15} /> {ui.playMusic}
            </>
          ) : (
            <>
              <Music2 size={15} /> {ui.resumeMusic}
            </>
          )}
        </button>
      </div>
    </>
  );
}
