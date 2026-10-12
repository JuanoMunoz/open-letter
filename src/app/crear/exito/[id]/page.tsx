import type { Metadata } from "next";
import { ui } from "@/templates/ui";

export const metadata: Metadata = {
  title: ui.seoCreateTitle,
  robots: { index: false, follow: false },
};

export { default } from "./success-client";
