import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { ProjectForm } from "@/components/ProjectForm";
import { createProject } from "@/lib/projects.functions";
import { DEFAULT_QUESTIONS } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/new")({
  head: () => ({ meta: [{ title: "Новый проект — Brieflow" }, { name: "description", content: "Создание проекта и брифа." }, { property: "og:title", content: "Новый проект" }, { property: "og:description", content: "Создание проекта" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: NewProject,
});

function NewProject() {
  const nav = useNavigate();
  const create = useServerFn(createProject);
  return (
    <AdminShell>
      <h1 className="mb-8 text-3xl font-semibold">Новый проект</h1>
      <ProjectForm
        submitLabel="Создать и получить ссылку на бриф"
        initial={{ title: "", description: "", client: { name: "", phone: "", email: "", company: "" }, questions: DEFAULT_QUESTIONS }}
        onSubmit={async (v) => {
          try {
            const { id } = await create({ data: v });
            toast.success("Проект создан");
            nav({ to: "/admin/$id", params: { id } });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Ошибка");
          }
        }}
      />
    </AdminShell>
  );
}
