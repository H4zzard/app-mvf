import type { Metadata } from "next";
import { OverviewView } from "@/components/gestao/overview-view";

export const metadata: Metadata = { title: "Visão geral" };

export default function Page() {
  return <OverviewView />;
}
