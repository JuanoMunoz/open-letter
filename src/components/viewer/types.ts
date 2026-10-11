export interface ViewerPhoto {
  url: string;
  caption: string | null;
  takenOn: string | null;
  place: string | null;
}

export interface LetterView {
  id: string;
  recipientName: string;
  nickname: string | null;
  specialDate: string | null;
  senderName: string | null;
  mainMessage: string;
  loveText: string | null;
  storyText: string | null;
  dreamsText: string | null;
  spotifyTrackId: string | null;
  expiresAt: string;
  photos: ViewerPhoto[];
}

export type SectionKind =
  | { kind: "cover"; key: string; label: string }
  | { kind: "message"; key: string; label: string }
  | { kind: "card"; key: string; label: string; field: "loveText" | "storyText" | "dreamsText" }
  | { kind: "photo"; key: string; label: string; index: number }
  | { kind: "chapter"; key: string; label: string }
  | { kind: "song"; key: string; label: string };
