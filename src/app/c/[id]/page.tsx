import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { LetterViewer } from "@/components/viewer/LetterViewer";
import { LockedScreen } from "@/components/viewer/LockedScreen";
import { loadLetter, loadLetterShell } from "@/lib/letter-data";
import { verifyAccessCookie, accessCookieName } from "@/lib/password";
import { ui } from "@/templates/ui";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  // Solo carátula: ni el nombre se revela antes de verificar.
  const { id } = await params;
  const shell = await loadLetterShell(id);
  void shell;
  return {
    title: ui.seoLetterTitle,
    description: ui.seoLetterDescription,
    robots: { index: false, follow: false },
    openGraph: {
      title: ui.seoLetterTitle,
      description: ui.seoLetterDescription,
    },
  };
}

export default async function CartaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shell = await loadLetterShell(id);
  if (shell.status === "missing") notFound();
  if (shell.status === "expired") redirect(`/c/${id}/expirada`);

  const jar = await cookies();
  const unlocked =
    !shell.shell.hasPassword ||
    verifyAccessCookie(id, jar.get(accessCookieName(id))?.value);
  if (!unlocked) {
    return <LockedScreen id={id} hint={shell.shell.passwordHint} />;
  }

  const result = await loadLetter(id);
  if (result.status === "missing") notFound();
  if (result.status === "expired") redirect(`/c/${id}/expirada`);

  // El conteo de aperturas lo hace el beacon cliente (POST /vista) con
  // cookie de sesión, fiable desde un Route Handler.
  return <LetterViewer letter={result.letter} />;
}
