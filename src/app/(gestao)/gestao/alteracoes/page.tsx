import type { Metadata } from "next";
import { ChangesView } from "@/components/gestao/changes-view";

export const metadata: Metadata = { title: "Revisar e exportar" };

export default function Page() {
  return <ChangesView />;
}
