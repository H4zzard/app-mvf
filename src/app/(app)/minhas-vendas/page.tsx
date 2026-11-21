import type { Metadata } from "next";
import { SalesView } from "@/components/extras/sales-view";

// Estado vazio honesto para todas: não há fonte de vendas conectada (nenhum número, nem de exemplo).
export const metadata: Metadata = { title: "Minhas Vendas" };

export default function Page() {
  return <SalesView />;
}
