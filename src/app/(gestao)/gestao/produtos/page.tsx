import type { Metadata } from "next";
import { ProductsAdminView } from "@/components/gestao/products-admin";

export const metadata: Metadata = { title: "Produtos NUMI" };

export default function Page() {
  return <ProductsAdminView />;
}
