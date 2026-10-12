import type { Metadata } from "next";
import { ui } from "@/templates/ui";
import PreviewClient from "./PreviewClient";

export const metadata: Metadata = {
  title: ui.seoPreviewTitle,
  robots: { index: false, follow: false },
};

export default function PreviewPage() {
  return <PreviewClient />;
}
