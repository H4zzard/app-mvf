import type { Metadata } from "next";
import { ScriptsAdminView } from "@/components/gestao/scripts-admin";

export const metadata: Metadata = { title: "Roteiros e presets" };

export default function Page() {
  return <ScriptsAdminView />;
}
