import type { Metadata } from "next";
import { CoursesAdminView } from "@/components/gestao/courses-admin";

export const metadata: Metadata = { title: "Cursos e aulas" };

export default function Page() {
  return <CoursesAdminView />;
}
