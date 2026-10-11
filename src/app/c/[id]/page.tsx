import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LetterViewer } from "@/components/viewer/LetterViewer";
import { loadLetter } from "@/lib/letter-data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const result = await loadLetter(id);
  const name = result.status === "ok" ? result.letter.recipientName : "alguien especial";
  return {
    title: `Una carta para ${name} — openletter`,
    description: "Alguien te escribió algo especial.",
    robots: { index: false, follow: false },
    openGraph: {
      title: `Una carta para ${name}`,
      description: "Alguien te escribió algo especial.",
    },
  };
}

export default async function CartaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadLetter(id);
  if (result.status === "missing") notFound();
  if (result.status === "expired") redirect(`/c/${id}/expirada`);
  return <LetterViewer letter={result.letter} />;
}
