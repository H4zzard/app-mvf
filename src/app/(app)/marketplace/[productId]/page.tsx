import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DemoModule } from "@/components/demo/demo-module";
import { ProductDetail } from "@/components/marketplace/product-detail";
import { productCatalog } from "@/lib/products";
import PageLoading from "@/app/(app)/loading";

export const metadata: Metadata = { title: "Produto" };

export default function Page({ params }: PageProps<"/marketplace/[productId]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ProductPage params={params} />
    </Suspense>
  );
}

async function ProductPage({ params }: { params: PageProps<"/marketplace/[productId]">["params"] }) {
  const { productId } = await params;
  if (!productCatalog.get(productId)) notFound();
  // Mesmo portão do Marketplace: demo/prévia autorizada no servidor; alunas reais veem “Em breve”.
  return (
    <DemoModule featureId="marketplace">
      <ProductDetail productId={productId} />
    </DemoModule>
  );
}
