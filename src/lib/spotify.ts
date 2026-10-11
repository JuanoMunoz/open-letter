const TRACK_RE = /(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/|spotify:track:)([A-Za-z0-9]{22})/;
const STRICT_ID_RE = /^[A-Za-z0-9]{22}$/;

/** Extrae el track ID de una URL de Spotify o URI. Devuelve null si no es válida. */
export function parseSpotifyTrackId(input: string): string | null {
  const v = (input ?? "").trim();
  if (!v) return null;
  if (STRICT_ID_RE.test(v)) return v;
  const m = v.match(TRACK_RE);
  return m ? m[1] : null;
}

export function spotifyEmbedUrl(trackId: string): string {
  return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;
}
