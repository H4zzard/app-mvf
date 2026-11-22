import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { DemoModule } from "@/components/demo/demo-module";
import { LessonDetail } from "@/components/aulas/lesson-detail";
import { catalog } from "@/lib/catalog";
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
  const lesson = catalog.getLesson(lessonId);
  if (!lesson) notFound(); // inexistente ou oculta
  // ID antigo (alias de compatibilidade) → endereço canônico da aula.
  if (lesson.id !== lessonId) permanentRedirect(`/aulas/${lesson.id}`);
  return (
    <DemoModule featureId="aulas">
      <LessonDetail lessonId={lessonId} />
    </DemoModule>
  );
}
