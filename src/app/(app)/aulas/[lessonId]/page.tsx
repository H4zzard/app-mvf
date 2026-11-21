import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DemoModule } from "@/components/demo/demo-module";
import { LessonDetail } from "@/components/aulas/lesson-detail";
import { LIBRARY_LESSONS } from "@/demo/library";
import PageLoading from "@/app/(app)/loading";

export const metadata: Metadata = { title: "Aula" };

export default function Page({ params }: PageProps<"/aulas/[lessonId]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <LessonPage params={params} />
    </Suspense>
  );
}

async function LessonPage({ params }: { params: PageProps<"/aulas/[lessonId]">["params"] }) {
  const { lessonId } = await params;
  if (!LIBRARY_LESSONS.some((l) => l.id === lessonId)) notFound();
  return (
    <DemoModule featureId="aulas">
      <LessonDetail lessonId={lessonId} />
    </DemoModule>
  );
}
